using ScrapFlow.Domain.Common;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Domain.Entities;

public class MaterialGrade : BaseEntity
{
    public string Code { get; set; } = string.Empty;   // e.g. "HMS1", "CU-MILB"
    public string Name { get; set; } = string.Empty;   // e.g. "Heavy Melting Steel 1"
    public string? Description { get; set; }
    public MaterialUnit Unit { get; set; } = MaterialUnit.Kilogram;
    public decimal DefaultBuyPrice { get; set; }
    public decimal DefaultSellPrice { get; set; }
    public bool IsActive { get; set; } = true;

    // Foreign Key
    public Guid CategoryId { get; set; }
    public MaterialCategory Category { get; set; } = null!;

    // Navigation
    public ICollection<DailyPrice> DailyPrices { get; set; } = new List<DailyPrice>();
    public ICollection<TicketLineItem> TicketLineItems { get; set; } = new List<TicketLineItem>();
    public ICollection<InventoryLot> InventoryLots { get; set; } = new List<InventoryLot>();
}
