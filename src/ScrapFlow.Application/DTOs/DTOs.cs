using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Application.DTOs;

// ===== AUTH =====
public record LoginDto(string Email, string Password);
public record RegisterDto(string Email, string Password, string FirstName, string LastName, string Role, Guid? SiteId);
public record AuthResponseDto(string Token, string Email, string FullName, string Role, DateTime Expiry);

// ===== TICKET =====
public record CreateInboundTicketDto(Guid SupplierId, Guid SiteId, string? Notes);
public record RecordGrossWeightDto(decimal GrossWeight);
public record GradingLineItemDto(Guid MaterialGradeId, decimal NetWeight, string? GradeNotes, int QualityScore = 100);
public record RecordGradingDto(List<GradingLineItemDto> LineItems);
public record RecordTareWeightDto(decimal TareWeight);
public record RecordPaymentDto(string PaymentReference, string? PaymentProofPath);
public record CompleteTicketDto(string? SellerSignatureData);

public class InboundTicketResponseDto
{
    public Guid Id { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public string? QrCodeData { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal? GrossWeight { get; set; }
    public decimal? TareWeight { get; set; }
    public decimal? NetWeight { get; set; }
    public decimal TotalPrice { get; set; }
    public string? PaymentReference { get; set; }
    public bool PaymentVerified { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }

    // Related
    public SupplierSummaryDto? Supplier { get; set; }
    public SiteSummaryDto? Site { get; set; }
    public List<LineItemDto> LineItems { get; set; } = new();
    public List<TicketPhotoDto> Photos { get; set; } = new();
    public ComplianceStatusDto? Compliance { get; set; }
}

public record SupplierSummaryDto(Guid Id, string FullName, string IdNumber, string? ContactNumber, string? VehicleRegistration);
public record SiteSummaryDto(Guid Id, string Name, string? City);

public class LineItemDto
{
    public Guid Id { get; set; }
    public string MaterialCode { get; set; } = string.Empty;
    public string MaterialName { get; set; } = string.Empty;
    public decimal NetWeight { get; set; }
    public decimal PricePerTon { get; set; }
    public decimal LineTotal { get; set; }
    public int QualityScore { get; set; }
}

public record TicketPhotoDto(Guid Id, string PhotoType, string FilePath);

public class ComplianceStatusDto
{
    public bool IdVerified { get; set; }
    public bool HasSellerPhoto { get; set; }
    public bool HasLoadPhoto { get; set; }
    public bool HasIdPhoto { get; set; }
    public bool HasElectronicPaymentProof { get; set; }
    public bool IsFullyCompliant { get; set; }
    public string? Notes { get; set; }
}

// ===== MATERIALS =====
public class MaterialGradeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal DefaultBuyPrice { get; set; }
    public decimal DefaultSellPrice { get; set; }
    public decimal TodayBuyPrice { get; set; }
    public decimal TodaySellPrice { get; set; }
    public decimal MarginPercent { get; set; }
    public string Unit { get; set; } = string.Empty;
}

public record UpdateDailyPriceDto(Guid MaterialGradeId, decimal BuyPricePerTon, decimal SellPricePerTon, string? Notes);

// ===== SUPPLIERS =====
public class SupplierDto
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string IdNumber { get; set; } = string.Empty;
    public string IdType { get; set; } = string.Empty;
    public string? ContactNumber { get; set; }
    public string? Email { get; set; }
    public string? VehicleRegistration { get; set; }
    public string? BankName { get; set; }
    public bool IsWastePicker { get; set; }
    public bool IsVerified { get; set; }
    public int TotalTickets { get; set; }
    public decimal TotalWeight { get; set; }
    public decimal TotalValue { get; set; }
}

public record CreateSupplierDto(
    string FullName, string IdNumber, IdType IdType,
    string? ContactNumber, string? Email, string? Address,
    string? VehicleRegistration, string? BankName, string? AccountNumber,
    string? BranchCode, bool IsWastePicker, string? WastePickerArea);

// ===== DASHBOARD =====
public class DashboardDto
{
    public decimal TodayTonnageIn { get; set; }
    public decimal TodayTonnageOut { get; set; }
    public decimal WeekTonnageIn { get; set; }
    public decimal WeekTonnageOut { get; set; }
    public decimal TotalInventoryValue { get; set; }
    public decimal TotalInventoryWeight { get; set; }
    public decimal OverallMarginPercent { get; set; }
    public int ActiveTickets { get; set; }
    public int ComplianceIssues { get; set; }
    public int SuppliersCount { get; set; }

    public List<DailyTonnageDto> DailyTonnage { get; set; } = new();
    public List<InventoryByGradeDto> InventoryByGrade { get; set; } = new();
    public List<TopSupplierDto> TopSuppliers { get; set; } = new();
    public List<RecentActivityDto> RecentActivity { get; set; } = new();
    public List<MarginByGradeDto> MarginByGrade { get; set; } = new();
}

public record DailyTonnageDto(string Date, decimal TonnageIn, decimal TonnageOut);
public record InventoryByGradeDto(string GradeCode, string GradeName, string Category, decimal Weight, decimal Value);
public record TopSupplierDto(string Name, decimal TotalWeight, decimal TotalValue, int TicketCount);
public record RecentActivityDto(string Type, string Description, string Time, string? User);
public record MarginByGradeDto(string GradeCode, decimal BuyPrice, decimal SellPrice, decimal MarginPercent);
