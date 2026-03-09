using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.Infrastructure.Services;

public class WebhookService : IWebhookService
{
    private readonly ScrapFlowDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebhookService> _logger;

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public WebhookService(ScrapFlowDbContext db, IHttpClientFactory httpClientFactory, ILogger<WebhookService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task FireAsync(string eventName, object payload)
    {
        List<Domain.Entities.WebhookSubscription> subscriptions;
        try
        {
            subscriptions = await _db.WebhookSubscriptions
                .Where(w => w.IsActive && (w.EventFilter == "*" || w.EventFilter == eventName))
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load webhook subscriptions for event {Event}", eventName);
            return;
        }

        if (subscriptions.Count == 0) return;

        var envelope = new
        {
            @event = eventName,
            timestamp = DateTime.UtcNow,
            version = "1.0",
            data = payload
        };

        var body = JsonSerializer.Serialize(envelope, JsonOpts);
        var bodyBytes = Encoding.UTF8.GetBytes(body);

        foreach (var sub in subscriptions)
        {
            await PostToSubscriptionAsync(sub, body, bodyBytes);
        }
    }

    private async Task PostToSubscriptionAsync(Domain.Entities.WebhookSubscription sub, string body, byte[] bodyBytes)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("webhooks");

            using var request = new HttpRequestMessage(HttpMethod.Post, sub.Url)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };

            if (!string.IsNullOrWhiteSpace(sub.Secret))
            {
                var signature = ComputeHmacSha256(sub.Secret, bodyBytes);
                request.Headers.Add("X-ScrapFlow-Signature", $"sha256={signature}");
            }

            request.Headers.Add("X-ScrapFlow-Event", "webhook");

            using var response = await client.SendAsync(request);
            sub.LastStatus = $"{(int)response.StatusCode} {response.ReasonPhrase}";
            sub.LastFiredAt = DateTime.UtcNow;

            _logger.LogInformation("Webhook {Name} fired for event {Event} → {Status}", sub.Name, sub.LastStatus, sub.LastStatus);
        }
        catch (Exception ex)
        {
            sub.LastStatus = ex.Message.Length > 100 ? ex.Message[..100] : ex.Message;
            sub.LastFiredAt = DateTime.UtcNow;
            _logger.LogWarning(ex, "Webhook {Name} ({Url}) failed", sub.Name, sub.Url);
        }
        finally
        {
            try { await _db.SaveChangesAsync(); } catch { /* best effort */ }
        }
    }

    private static string ComputeHmacSha256(string secret, byte[] data)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(data)).ToLowerInvariant();
    }
}
