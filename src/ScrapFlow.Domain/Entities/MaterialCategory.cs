using ScrapFlow.Domain.Common;

namespace ScrapFlow.Domain.Entities;

public class MaterialCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty; // Ferrous, Non-Ferrous
    public string? Description { get; set; }
    public int SortOrder { get; set; }

    // Navigation
    public ICollection<MaterialGrade> Grades { get; set; } = new List<MaterialGrade>();
}
