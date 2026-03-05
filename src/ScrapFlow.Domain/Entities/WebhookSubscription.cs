namespace ScrapFlow.Domain.Entities;

public class WebhookSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string Url { get; set; } = "";
    public string EventFilter { get; set; } = "*";
    public string? Secret { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? LastStatus { get; set; }
    public DateTime? LastFiredAt { get; set; }
}
