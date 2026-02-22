using ScrapFlow.Domain.Common;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Domain.Entities;

public class Supplier : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string IdNumber { get; set; } = string.Empty;
    public IdType IdType { get; set; } = IdType.SouthAfricanId;
    public string? ContactNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? VehicleRegistration { get; set; }

    // Banking Details for EFT
    public string? BankName { get; set; }
    public string? AccountNumber { get; set; }
    public string? BranchCode { get; set; }
    public string? AccountHolderName { get; set; }

    // Waste Picker Register
    public bool IsWastePicker { get; set; } = false;
    public string? WastePickerArea { get; set; }

    // Compliance
    public string? IdPhotoPath { get; set; }
    public string? ProfilePhotoPath { get; set; }
    public bool IsVerified { get; set; } = false;
    public DateTime? LastVerifiedAt { get; set; }

    // Navigation
    public ICollection<InboundTicket> InboundTickets { get; set; } = new List<InboundTicket>();
}
