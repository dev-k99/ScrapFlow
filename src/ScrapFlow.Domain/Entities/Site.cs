using ScrapFlow.Domain.Common;

namespace ScrapFlow.Domain.Entities;

public class Site : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? PostalCode { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<InboundTicket> InboundTickets { get; set; } = new List<InboundTicket>();
    public ICollection<OutboundTicket> OutboundTickets { get; set; } = new List<OutboundTicket>();
    public ICollection<InventoryLot> InventoryLots { get; set; } = new List<InventoryLot>();
}
