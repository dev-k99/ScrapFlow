using ScrapFlow.Domain.Common;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Domain.Entities;

public class OutboundTicket : BaseEntity
{
    public string TicketNumber { get; set; } = string.Empty; // OUT-20260221-0001
    public string? QrCodeData { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.Created;

    // Weights (in kg)
    public decimal? GrossWeight { get; set; }
    public decimal? TareWeight { get; set; }
    public decimal? NetWeight { get; set; }

    // Pricing
    public decimal TotalPrice { get; set; }

    // Payment Received
    public string? InvoiceNumber { get; set; }
    public string? PaymentReference { get; set; }
    public bool PaymentReceived { get; set; } = false;

    public string? Notes { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Foreign Keys
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;

    public Guid SiteId { get; set; }
    public Site Site { get; set; } = null!;

    public string? CreatedByUserId { get; set; }

    // Navigation
    public ICollection<TicketLineItem> LineItems { get; set; } = new List<TicketLineItem>();
    public ICollection<TicketPhoto> Photos { get; set; } = new List<TicketPhoto>();
}
