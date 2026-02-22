using ScrapFlow.Domain.Common;

namespace ScrapFlow.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;     // Created, Updated, Deleted
    public string? OldValues { get; set; }                  // JSON
    public string? NewValues { get; set; }                  // JSON
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
}
