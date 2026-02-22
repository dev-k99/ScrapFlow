using ScrapFlow.Domain.Common;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Domain.Entities;

public class InboundTicket : BaseEntity
{
    public string TicketNumber { get; set; } = string.Empty;  // Auto-generated: INB-20260221-0001
    public string? QrCodeData { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.Created;

    // Weights (in kg)
    public decimal? GrossWeight { get; set; }
    public decimal? TareWeight { get; set; }
    public decimal? NetWeight { get; set; }

    // Pricing
    public decimal TotalPrice { get; set; }

    // Payment (Electronic Only – SA Second-Hand Goods Act)
    public PaymentMethod? PaymentMethod { get; set; }
    public string? PaymentReference { get; set; }   // EFT/bank reference number
    public string? PaymentProofPath { get; set; }   // Uploaded PDF/photo
    public bool PaymentVerified { get; set; } = false;
    public string? PaymentVerifiedByUserId { get; set; }

    // Seller Confirmation
    public string? SellerSignatureData { get; set; } // Base64 digital signature
    public DateTime? CompletedAt { get; set; }

    // Notes
    public string? Notes { get; set; }

    // Foreign Keys
    public Guid SupplierId { get; set; }
    public Supplier Supplier { get; set; } = null!;

    public Guid SiteId { get; set; }
    public Site Site { get; set; } = null!;

    public string? CreatedByUserId { get; set; }
    public string? CompletedByUserId { get; set; }

    // Navigation
    public ICollection<TicketLineItem> LineItems { get; set; } = new List<TicketLineItem>();
    public ICollection<TicketPhoto> Photos { get; set; } = new List<TicketPhoto>();
    public ComplianceRecord? ComplianceRecord { get; set; }
}
