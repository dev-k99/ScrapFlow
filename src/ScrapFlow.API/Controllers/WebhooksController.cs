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
