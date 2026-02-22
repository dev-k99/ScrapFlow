using ScrapFlow.Domain.Common;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Domain.Entities;

public class TicketPhoto : BaseEntity
{
    public PhotoType PhotoType { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string? OriginalFileName { get; set; }
    public long? FileSizeBytes { get; set; }

    // Foreign Keys
    public Guid? InboundTicketId { get; set; }
    public InboundTicket? InboundTicket { get; set; }

    public Guid? OutboundTicketId { get; set; }
    public OutboundTicket? OutboundTicket { get; set; }
}
