using ScrapFlow.Domain.Common;

namespace ScrapFlow.Domain.Entities;

public class TicketLineItem : BaseEntity
{
    public decimal NetWeight { get; set; }          // kg
    public decimal PricePerTon { get; set; }        // R/ton
    public decimal LineTotal { get; set; }           // Auto-calculated
    public string? GradeNotes { get; set; }
    public int QualityScore { get; set; } = 100;    // 0-100 purity %

    // Foreign Keys
    public Guid? InboundTicketId { get; set; }
    public InboundTicket? InboundTicket { get; set; }

    public Guid? OutboundTicketId { get; set; }
    public OutboundTicket? OutboundTicket { get; set; }

    public Guid MaterialGradeId { get; set; }
    public MaterialGrade MaterialGrade { get; set; } = null!;
}
