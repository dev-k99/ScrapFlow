using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Manager")]
public class AuditLogsController : ControllerBase
{
    private readonly ScrapFlowDbContext _db;

    public AuditLogsController(ScrapFlowDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResult<AuditLogDto>>> GetAll(
        [FromQuery] string? entityName,
        [FromQuery] string? userId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = _db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityName))
            query = query.Where(a => a.EntityName == entityName);
        if (!string.IsNullOrWhiteSpace(userId))
            query = query.Where(a => a.UserId == userId || (a.UserName != null && a.UserName.Contains(userId)));
        if (dateFrom.HasValue)
            query = query.Where(a => a.Timestamp >= dateFrom.Value.ToUniversalTime());
        if (dateTo.HasValue)
            query = query.Where(a => a.Timestamp <= dateTo.Value.ToUniversalTime());

        var total = await query.CountAsync();
        var logs  = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<AuditLogDto>
        {
            Items      = logs.Select(Map).ToList(),
            TotalCount = total,
            Page       = page,
            PageSize   = pageSize
        });
    }

    private static AuditLogDto Map(Domain.Entities.AuditLog a) => new()
    {
        Id         = a.Id,
        EntityName = a.EntityName,
        EntityId   = a.EntityId,
        Action     = a.Action,
        UserName   = a.UserName ?? a.UserId ?? "system",
        Timestamp  = a.Timestamp,
        IpAddress  = a.IpAddress,
        Changes    = BuildChangesSummary(a.OldValues, a.NewValues)
    };

    private static string BuildChangesSummary(string? oldJson, string? newJson)
    {
        if (string.IsNullOrEmpty(oldJson) && string.IsNullOrEmpty(newJson)) return "";

        if (!string.IsNullOrEmpty(newJson) && string.IsNullOrEmpty(oldJson))
            return "Record created";

        if (!string.IsNullOrEmpty(oldJson) && string.IsNullOrEmpty(newJson))
            return "Record deleted";

        try
        {
            var oldDict = JsonSerializer.Deserialize<Dictionary<string, string?>>(oldJson!) ?? new();
            var newDict = JsonSerializer.Deserialize<Dictionary<string, string?>>(newJson!) ?? new();

            var diffs = oldDict
                .Where(kv => newDict.TryGetValue(kv.Key, out var nv) && nv != kv.Value)
                .Select(kv => $"{kv.Key}: {kv.Value} → {newDict[kv.Key]}")
                .ToList();

            return diffs.Count > 0 ? string.Join(", ", diffs.Take(5)) : "No changes detected";
        }
        catch
        {
            return "Changed";
        }
    }
}

public class AuditLogDto
{
    public Guid Id { get; set; }
    public string EntityName { get; set; } = "";
    public string EntityId { get; set; } = "";
    public string Action { get; set; } = "";
    public string UserName { get; set; } = "";
    public DateTime Timestamp { get; set; }
    public string? IpAddress { get; set; }
    public string Changes { get; set; } = "";
}
