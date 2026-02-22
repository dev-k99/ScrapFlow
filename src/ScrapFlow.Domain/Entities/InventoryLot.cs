using ScrapFlow.Domain.Common;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Domain.Entities;

public class InventoryLot : BaseEntity
{
    public string LotNumber { get; set; } = string.Empty;  // LOT-20260221-HMS1-0001
    public decimal Quantity { get; set; }                    // kg remaining
    public decimal OriginalQuantity { get; set; }            // kg at creation
    public decimal WeightedAvgCost { get; set; }             // R/ton
    public string? Location { get; set; }                    // Bay/area in yard
    public LotStatus Status { get; set; } = LotStatus.InStock;
    public DateTime ReceivedDate { get; set; }
    public string? Notes { get; set; }

    // Photo reference
    public string? PhotoPath { get; set; }

    // Foreign Keys
    public Guid MaterialGradeId { get; set; }
    public MaterialGrade MaterialGrade { get; set; } = null!;

    public Guid SiteId { get; set; }
    public Site Site { get; set; } = null!;

    // Source ticket
    public Guid? InboundTicketId { get; set; }
    public InboundTicket? InboundTicket { get; set; }
}
