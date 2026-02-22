using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MaterialsController : ControllerBase
{
    private readonly ScrapFlowDbContext _db;

    public MaterialsController(ScrapFlowDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<MaterialGradeDto>>> GetAll()
    {
        var today = DateTime.UtcNow.Date;
        var grades = await _db.MaterialGrades
            .Include(g => g.Category)
            .Include(g => g.DailyPrices.Where(dp => dp.EffectiveDate == today))
            .OrderBy(g => g.Category.SortOrder)
            .ThenBy(g => g.Code)
            .ToListAsync();

        return Ok(grades.Select(g =>
        {
            var todayPrice = g.DailyPrices.FirstOrDefault();
            var buy = todayPrice?.BuyPricePerTon ?? g.DefaultBuyPrice;
            var sell = todayPrice?.SellPricePerTon ?? g.DefaultSellPrice;
            var margin = sell > 0 ? Math.Round((sell - buy) / sell * 100, 2) : 0;

            return new MaterialGradeDto
            {
                Id = g.Id,
                Code = g.Code,
                Name = g.Name,
                Category = g.Category.Name,
                DefaultBuyPrice = g.DefaultBuyPrice,
                DefaultSellPrice = g.DefaultSellPrice,
                TodayBuyPrice = buy,
                TodaySellPrice = sell,
                MarginPercent = margin,
                Unit = g.Unit.ToString()
            };
        }));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MaterialGradeDto>> Get(Guid id)
    {
        var g = await _db.MaterialGrades.Include(g => g.Category).FirstOrDefaultAsync(g => g.Id == id);
        if (g == null) return NotFound();

        return Ok(new MaterialGradeDto
        {
            Id = g.Id, Code = g.Code, Name = g.Name, Category = g.Category.Name,
            DefaultBuyPrice = g.DefaultBuyPrice, DefaultSellPrice = g.DefaultSellPrice,
            Unit = g.Unit.ToString()
        });
    }

    [HttpPost("daily-prices")]
    public async Task<ActionResult> UpdateDailyPrices(List<UpdateDailyPriceDto> prices)
    {
        var today = DateTime.UtcNow.Date;
        foreach (var p in prices)
        {
            var existing = await _db.DailyPrices
                .FirstOrDefaultAsync(dp => dp.MaterialGradeId == p.MaterialGradeId && dp.EffectiveDate == today);

            if (existing != null)
            {
                existing.BuyPricePerTon = p.BuyPricePerTon;
                existing.SellPricePerTon = p.SellPricePerTon;
                existing.Notes = p.Notes;
            }
            else
            {
                _db.DailyPrices.Add(new DailyPrice
                {
                    MaterialGradeId = p.MaterialGradeId,
                    EffectiveDate = today,
                    BuyPricePerTon = p.BuyPricePerTon,
                    SellPricePerTon = p.SellPricePerTon,
                    Notes = p.Notes
                });
            }
        }
        await _db.SaveChangesAsync();
        return Ok(new { message = $"Updated {prices.Count} prices" });
    }
}
