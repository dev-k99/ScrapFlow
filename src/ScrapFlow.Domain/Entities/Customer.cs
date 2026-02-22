using ScrapFlow.Domain.Common;

namespace ScrapFlow.Domain.Entities;

public class Customer : BaseEntity
{
    public string CompanyName { get; set; } = string.Empty;
    public string? TradingAs { get; set; }
    public string? RegistrationNumber { get; set; }
    public string? VatNumber { get; set; }
    public string ContactPerson { get; set; } = string.Empty;
    public string? ContactNumber { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }

    // Banking
    public string? BankName { get; set; }
    public string? AccountNumber { get; set; }
    public string? BranchCode { get; set; }

    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<OutboundTicket> OutboundTickets { get; set; } = new List<OutboundTicket>();
}
