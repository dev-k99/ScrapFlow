using System.Net;
using System.Net.Sockets;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner")]
public class WebhooksController : ControllerBase
{
    private readonly ScrapFlowDbContext _db;
    private readonly IWebhookService _webhookService;

    public WebhooksController(ScrapFlowDbContext db, IWebhookService webhookService)
    {
        _db = db;
        _webhookService = webhookService;
    }

    // GET /api/webhooks
    [HttpGet]
    public async Task<ActionResult<List<WebhookSubscriptionDto>>> GetAll()
    {
        var subs = await _db.WebhookSubscriptions
            .OrderBy(w => w.CreatedAt)
            .ToListAsync();
        return Ok(subs.Select(Map).ToList());
    }

    // POST /api/webhooks
    [HttpPost]
    public async Task<ActionResult<WebhookSubscriptionDto>> Create(CreateWebhookDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Url))
            return BadRequest(new { message = "URL is required" });

        var (isValid, urlError) = await ValidateWebhookUrlAsync(dto.Url);
        if (!isValid)
            return BadRequest(new { message = urlError });

        var sub = new WebhookSubscription
        {
            Name = dto.Name,
            Url = dto.Url,
            EventFilter = string.IsNullOrWhiteSpace(dto.EventFilter) ? "*" : dto.EventFilter,
            Secret = string.IsNullOrWhiteSpace(dto.Secret) ? null : dto.Secret,
            IsActive = true
        };

        _db.WebhookSubscriptions.Add(sub);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), null, Map(sub));
    }

    // DELETE /api/webhooks/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var sub = await _db.WebhookSubscriptions.FindAsync(id);
        if (sub == null) return NotFound();
        _db.WebhookSubscriptions.Remove(sub);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT /api/webhooks/{id}/toggle
    [HttpPut("{id}/toggle")]
    public async Task<ActionResult<WebhookSubscriptionDto>> Toggle(Guid id)
    {
        var sub = await _db.WebhookSubscriptions.FindAsync(id);
        if (sub == null) return NotFound();
        sub.IsActive = !sub.IsActive;
        await _db.SaveChangesAsync();
        return Ok(Map(sub));
    }

    // POST /api/webhooks/{id}/test
    [HttpPost("{id}/test")]
    public async Task<IActionResult> Test(Guid id)
    {
        var sub = await _db.WebhookSubscriptions.FindAsync(id);
        if (sub == null) return NotFound();

        await _webhookService.FireAsync("test", new
        {
            message = "ScrapFlow webhook test ping",
            webhookName = sub.Name,
            sentAt = DateTime.UtcNow
        });

        return Ok(new { message = "Test payload sent" });
    }

    private static async Task<(bool isValid, string? error)> ValidateWebhookUrlAsync(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return (false, "URL must be a valid absolute URI");

        if (uri.Scheme != "https" && uri.Scheme != "http")
            return (false, "URL must use HTTP or HTTPS");

        var host = uri.Host;

        // Block obvious localhost variants before DNS resolution
        if (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            host == "127.0.0.1" || host == "::1" || host == "0.0.0.0")
            return (false, "Localhost URLs are not allowed");

        // Resolve hostname and check every returned IP
        try
        {
            var addresses = await Dns.GetHostAddressesAsync(host);
            foreach (var address in addresses)
            {
                if (IsPrivateIp(address))
                    return (false, "URLs resolving to private or internal IP ranges are not allowed");
            }
        }
        catch (SocketException)
        {
            return (false, "Unable to resolve hostname");
        }

        return (true, null);
    }

    private static bool IsPrivateIp(IPAddress address)
    {
        if (IPAddress.IsLoopback(address)) return true;

        var bytes = address.GetAddressBytes();

        // IPv4 private ranges
        if (bytes.Length == 4)
        {
            return bytes[0] == 10 ||                                               // 10.0.0.0/8
                   (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) ||       // 172.16.0.0/12
                   (bytes[0] == 192 && bytes[1] == 168) ||                         // 192.168.0.0/16
                   (bytes[0] == 169 && bytes[1] == 254) ||                         // 169.254.0.0/16 (cloud metadata)
                   bytes[0] == 127;                                                // 127.0.0.0/8
        }

        // IPv6 private ranges
        if (bytes.Length == 16)
        {
            return (bytes[0] == 0xfc || bytes[0] == 0xfd) ||                      // fc00::/7 (ULA)
                   (bytes[0] == 0xfe && (bytes[1] & 0xc0) == 0x80);               // fe80::/10 (link-local)
        }

        return false;
    }

    private static WebhookSubscriptionDto Map(WebhookSubscription w) => new()
    {
        Id = w.Id,
        Name = w.Name,
        Url = w.Url,
        EventFilter = w.EventFilter,
        HasSecret = !string.IsNullOrEmpty(w.Secret),
        IsActive = w.IsActive,
        CreatedAt = w.CreatedAt,
        LastStatus = w.LastStatus,
        LastFiredAt = w.LastFiredAt
    };
}

// ─── DTOs (controller-scoped, no need for separate file) ─────────────────────
public record CreateWebhookDto(string Name, string Url, string? EventFilter, string? Secret);

public class WebhookSubscriptionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Url { get; set; } = "";
    public string EventFilter { get; set; } = "*";
    public bool HasSecret { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? LastStatus { get; set; }
    public DateTime? LastFiredAt { get; set; }
}
