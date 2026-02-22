using ScrapFlow.Domain.Common;

namespace ScrapFlow.Domain.Entities;

public class DailyPrice : BaseEntity
{
    public DateTime EffectiveDate { get; set; }
    public decimal BuyPricePerTon { get; set; }
    public decimal SellPricePerTon { get; set; }
    public string? Notes { get; set; }

    // Foreign Keys
    public Guid MaterialGradeId { get; set; }
    public MaterialGrade MaterialGrade { get; set; } = null!;

    public string? SetByUserId { get; set; }

    // Computed
    public decimal MarginPerTon => SellPricePerTon - BuyPricePerTon;
    public decimal MarginPercent => SellPricePerTon > 0
        ? Math.Round((MarginPerTon / SellPricePerTon) * 100, 2)
        : 0;
}
