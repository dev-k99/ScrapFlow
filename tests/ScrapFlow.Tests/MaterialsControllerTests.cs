using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.API.Controllers;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Domain.Entities;

namespace ScrapFlow.Tests;

public class MaterialsControllerTests : IAsyncLifetime
{
    private Infrastructure.Data.ScrapFlowDbContext _db = null!;
    private MaterialsController _controller = null!;
    private Domain.Entities.MaterialGrade _grade = null!;

    public async Task InitializeAsync()
    {
        var (db, _, _, _, grade) = await TestDbFactory.CreateWithSeedAsync();
        _db = db;
        _grade = grade;
        _controller = new MaterialsController(_db);
    }

    public Task DisposeAsync()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
        return Task.CompletedTask;
    }

    // ===== GET ALL =====

    [Fact]
    public async Task GetAll_ReturnsMaterialGrades_WithPricing()
    {
        var result = await _controller.GetAll();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<MaterialGradeDto>>(ok.Value);
        Assert.Single(list);
    }

    [Fact]
    public async Task GetAll_UsesTodayDailyPrice_WhenAvailable()
    {
        var today = DateTime.UtcNow.Date;
        _db.DailyPrices.Add(new DailyPrice
        {
            MaterialGradeId = _grade.Id,
            EffectiveDate = today,
            BuyPricePerTon = 2500,
            SellPricePerTon = 3000
        });
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<MaterialGradeDto>>(ok.Value).ToList();

        Assert.Equal(2500, list[0].TodayBuyPrice);
        Assert.Equal(3000, list[0].TodaySellPrice);
    }

    [Fact]
    public async Task GetAll_FallsBackToDefaultPrice_WhenNoDailyPrice()
    {
        var result = await _controller.GetAll();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<MaterialGradeDto>>(ok.Value).ToList();

        Assert.Equal(_grade.DefaultBuyPrice, list[0].TodayBuyPrice);
        Assert.Equal(_grade.DefaultSellPrice, list[0].TodaySellPrice);
    }

    // ===== GET BY ID =====

    [Fact]
    public async Task Get_ReturnsGrade_WhenFound()
    {
        var result = await _controller.Get(_grade.Id);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<MaterialGradeDto>(ok.Value);
        Assert.Equal("HMS1", dto.Code);
    }

    [Fact]
    public async Task Get_ReturnsNotFound_ForUnknownId()
    {
        var result = await _controller.Get(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ===== MARGINS =====

    [Fact]
    public async Task GetMargins_ReturnsMarginsForAllGrades()
    {
        var result = await _controller.GetMargins();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<MarginByGradeDto>>(ok.Value).ToList();

        Assert.Single(list);
        Assert.Equal("HMS1", list[0].GradeCode);
        // margin = (2800-2200)/2800 * 100 ≈ 21.43%
        Assert.True(list[0].MarginPercent > 0);
    }

    // ===== UPDATE DAILY PRICES =====

    [Fact]
    public async Task UpdateDailyPrices_CreatesNewRecord_WhenNoneExists()
    {
        var dto = new List<UpdateDailyPriceDto>
        {
            new(_grade.Id, 2400m, 3100m, "Market update")
        };

        var result = await _controller.UpdateDailyPrices(dto);
        Assert.IsType<OkObjectResult>(result);

        var saved = await _db.DailyPrices
            .FirstOrDefaultAsync(dp => dp.MaterialGradeId == _grade.Id);

        Assert.NotNull(saved);
        Assert.Equal(2400m, saved.BuyPricePerTon);
        Assert.Equal(3100m, saved.SellPricePerTon);
    }

    [Fact]
    public async Task UpdateDailyPrices_UpdatesExistingRecord_WhenAlreadyExists()
    {
        var today = DateTime.UtcNow.Date;
        _db.DailyPrices.Add(new DailyPrice
        {
            MaterialGradeId = _grade.Id, EffectiveDate = today,
            BuyPricePerTon = 2200, SellPricePerTon = 2800
        });
        await _db.SaveChangesAsync();

        var dto = new List<UpdateDailyPriceDto>
        {
            new(_grade.Id, 2600m, 3200m, "Revised")
        };
        await _controller.UpdateDailyPrices(dto);

        var count = await _db.DailyPrices.CountAsync(dp => dp.MaterialGradeId == _grade.Id);
        var saved = await _db.DailyPrices.FirstAsync(dp => dp.MaterialGradeId == _grade.Id);

        Assert.Equal(1, count); // no duplicate
        Assert.Equal(2600m, saved.BuyPricePerTon);
    }
}
