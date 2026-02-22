using ScrapFlow.Domain.Common;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Domain.Entities;

public class ItacReport : BaseEntity
{
    public int ReportYear { get; set; }
    public int ReportMonth { get; set; }
    public ReportStatus Status { get; set; } = ReportStatus.Pending;
    public string? FilePath { get; set; }
    public DateTime? GeneratedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? GeneratedByUserId { get; set; }
    public string? Notes { get; set; }

    // Summary data cached
    public decimal TotalAcquisitionTonnage { get; set; }
    public decimal TotalAcquisitionValue { get; set; }
    public decimal TotalDisposalTonnage { get; set; }
    public decimal TotalDisposalValue { get; set; }
}
