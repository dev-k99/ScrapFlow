using ScrapFlow.Domain.Common;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Domain.Entities;

public class ComplianceRecord : BaseEntity
{
    // ID Verification
    public IdVerificationMethod IdVerificationMethod { get; set; }
    public bool IdVerified { get; set; } = false;
    public DateTime? IdVerifiedAt { get; set; }
    public string? IdVerifiedByUserId { get; set; }

    // Photo Compliance (min 3: face + load + ID)
    public bool HasSellerPhoto { get; set; } = false;
    public bool HasLoadPhoto { get; set; } = false;
    public bool HasIdPhoto { get; set; } = false;

    // Payment Compliance
    public bool HasElectronicPaymentProof { get; set; } = false;
    public bool HasValidPaymentReference { get; set; } = false;

    // Overall
    public bool IsFullyCompliant { get; set; } = false;
    public string? ComplianceNotes { get; set; }
    public string? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }

    // Foreign Key
    public Guid InboundTicketId { get; set; }
    public InboundTicket InboundTicket { get; set; } = null!;
}
