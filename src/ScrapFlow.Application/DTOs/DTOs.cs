using System.ComponentModel.DataAnnotations;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Application.DTOs;

// ===== SHARED =====
/// <summary>Wraps any list response with pagination metadata.</summary>
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPrevPage => Page > 1;
}

// ===== AUTH =====
public record LoginDto([Required] string Email, [Required] string Password);
public record RegisterDto(
    [Required][EmailAddress] string Email,
    [Required][MinLength(8)] string Password,
    [Required] string FirstName,
    [Required] string LastName,
    [Required] string Role,
    Guid? SiteId);
public record AuthResponseDto(string Token, string RefreshToken, string Email, string FullName, string Role, DateTime Expiry);
public record RefreshTokenDto([Required] string RefreshToken);

// ===== TICKET =====
public record CreateInboundTicketDto([Required] Guid SupplierId, [Required] Guid SiteId, string? Notes);
public record RecordGrossWeightDto([Range(1, 200000, ErrorMessage = "Gross weight must be between 1 and 200 000 kg")] decimal GrossWeight);
public record GradingLineItemDto([Required] Guid MaterialGradeId, [Range(1, 100000)] decimal NetWeight, string? GradeNotes, [Range(0, 100)] int QualityScore = 100);
public record RecordGradingDto([Required][MinLength(1)] List<GradingLineItemDto> LineItems);
public record RecordTareWeightDto([Range(1, 200000)] decimal TareWeight);
public record RecordPaymentDto([Required][MinLength(3)] string PaymentReference, string? PaymentProofPath);
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

public record UpdateDailyPriceDto(
    [Required] Guid MaterialGradeId,
    [Range(0.01, 999999)] decimal BuyPricePerTon,
    [Range(0.01, 999999)] decimal SellPricePerTon,
    string? Notes);

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
    [Required][MinLength(2)] string FullName,
    [Required][MinLength(6)] string IdNumber,
    IdType IdType,
    string? ContactNumber, string? Email, string? Address,
    string? VehicleRegistration, string? BankName, string? AccountNumber,
    string? BranchCode, bool IsWastePicker, string? WastePickerArea);

public record UpdateSupplierDto(
    [Required][MinLength(2)] string FullName,
    string? ContactNumber, string? Email, string? Address,
    string? VehicleRegistration, string? BankName, string? AccountNumber, string? BranchCode,
    bool IsWastePicker, string? WastePickerArea);

// ===== OUTBOUND TICKETS =====
public record CreateOutboundTicketDto([Required] Guid CustomerId, [Required] Guid SiteId, string? Notes);
public record RecordOutboundGrossWeightDto([Range(1, 200000)] decimal GrossWeight);
public record RecordOutboundGradingDto([Required][MinLength(1)] List<GradingLineItemDto> LineItems);
public record RecordOutboundTareWeightDto([Range(1, 200000)] decimal TareWeight);
public record CompleteOutboundTicketDto(string? InvoiceNumber, string? Notes);

public class OutboundTicketResponseDto
{
    public Guid Id { get; set; }
    public string TicketNumber { get; set; } = string.Empty;
    public string? QrCodeData { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal? GrossWeight { get; set; }
    public decimal? TareWeight { get; set; }
    public decimal? NetWeight { get; set; }
    public decimal TotalPrice { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? PaymentReference { get; set; }
    public bool PaymentReceived { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public CustomerSummaryDto? Customer { get; set; }
    public SiteSummaryDto? Site { get; set; }
    public List<LineItemDto> LineItems { get; set; } = new();
}

public record CustomerSummaryDto(Guid Id, string CompanyName, string ContactPerson, string? ContactNumber);

// ===== INVENTORY =====
public class InventoryLotDto
{
    public Guid Id { get; set; }
    public string LotNumber { get; set; } = string.Empty;
    public string MaterialCode { get; set; } = string.Empty;
    public string MaterialName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string SiteName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal OriginalQuantity { get; set; }
    public decimal WeightedAvgCost { get; set; }
    public decimal TodaySellPrice { get; set; }
    public decimal EstimatedValue { get; set; }
    public string? Location { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime ReceivedDate { get; set; }
    public string? Notes { get; set; }
    public Guid? InboundTicketId { get; set; }
}

public record AdjustLotDto([Range(0, 1000000)] decimal NewQuantity, [Required][MinLength(3)] string Reason);
public record WriteOffLotDto([Required][MinLength(3)] string Reason);

// ===== SITES =====
public class SiteDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; }
    public int ActiveTickets { get; set; }
    public decimal TotalInventoryWeight { get; set; }
}

public record CreateSiteDto(
    [Required][MinLength(2)] string Name,
    [Required] string Address,
    string? City, string? Province, string? PostalCode, string? PhoneNumber);

public record UpdateSiteDto(
    [Required] string Address,
    string? City, string? Province, string? PostalCode, string? PhoneNumber,
    bool IsActive);

// ===== CUSTOMERS =====
public class CustomerDto
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? TradingAs { get; set; }
    public string? RegistrationNumber { get; set; }
    public string ContactPerson { get; set; } = string.Empty;
    public string? ContactNumber { get; set; }
    public string? Email { get; set; }
    public string? City { get; set; }
    public bool IsActive { get; set; }
    public int TotalTickets { get; set; }
    public decimal TotalValue { get; set; }
}

public record CreateCustomerDto(
    [Required][MinLength(2)] string CompanyName,
    string? TradingAs, string? RegistrationNumber, string? VatNumber,
    [Required] string ContactPerson,
    string? ContactNumber, string? Email, string? Address,
    string? City, string? Province,
    string? BankName, string? AccountNumber, string? BranchCode);

public record UpdateCustomerDto(
    [Required] string ContactPerson,
    string? ContactNumber, [EmailAddress] string? Email, string? Address,
    string? City, string? Province,
    string? BankName, string? AccountNumber, string? BranchCode,
    bool IsActive);

// ===== USERS =====
public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? SiteName { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
}

// ===== REPORTS =====
public class ItacReportDto
{
    public Guid Id { get; set; }
    public int ReportYear { get; set; }
    public int ReportMonth { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal TotalAcquisitionTonnage { get; set; }
    public decimal TotalAcquisitionValue { get; set; }
    public decimal TotalDisposalTonnage { get; set; }
    public decimal TotalDisposalValue { get; set; }
    public DateTime? GeneratedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? Notes { get; set; }
}

public record GenerateReportDto([Range(2020, 2100)] int Year, [Range(1, 12)] int Month, string? Notes);

// ===== AUDIT LOG =====
public class AuditLogDto
{
    public Guid Id { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public DateTime Timestamp { get; set; }
    public string? IpAddress { get; set; }
}

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
