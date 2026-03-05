using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using ScrapFlow.API.Controllers;
using ScrapFlow.API.Hubs;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Tests;

public class InventoryControllerTests : IAsyncLifetime
{
    private Infrastructure.Data.ScrapFlowDbContext _db = null!;
    private InventoryController _controller = null!;
    private Domain.Entities.Site _site = null!;
    private Domain.Entities.MaterialGrade _grade = null!;

    public async Task InitializeAsync()
    {
        var (db, site, _, _, grade) = await TestDbFactory.CreateWithSeedAsync();
        _db = db;
        _site = site;
        _grade = grade;
        var mockHub     = new Mock<IHubContext<InventoryHub>>();
        var mockClients = new Mock<IHubClients>();
        var mockProxy   = new Mock<IClientProxy>();
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockProxy.Object);
        mockHub.Setup(h => h.Clients).Returns(mockClients.Object);
        var mockWebhook = new Mock<IWebhookService>();
        _controller = new InventoryController(_db, mockHub.Object, mockWebhook.Object);
    }

    public Task DisposeAsync()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
        return Task.CompletedTask;
    }

    private async Task<InventoryLot> SeedLot(decimal quantity = 5000, LotStatus status = LotStatus.InStock)
    {
        var lot = new InventoryLot
        {
            Id = Guid.NewGuid(),
            LotNumber = $"LOT-TEST-{Guid.NewGuid():N}",
            MaterialGradeId = _grade.Id,
            SiteId = _site.Id,
            Quantity = quantity,
            OriginalQuantity = quantity,
            WeightedAvgCost = 2200,
            ReceivedDate = DateTime.UtcNow,
            Status = status
        };
        _db.InventoryLots.Add(lot);
        await _db.SaveChangesAsync();
        return lot;
    }

    // ===== GET ALL =====

    [Fact]
    public async Task GetAll_ReturnsList_WithCorrectMapping()
    {
        await SeedLot(3000);
        var result = await _controller.GetAll(null, null);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<PagedResult<InventoryLotDto>>(ok.Value).Items;
        Assert.Single(list);
        Assert.Equal(3000, list[0].Quantity);
        Assert.Equal("HMS1", list[0].MaterialCode);
    }

    [Fact]
    public async Task GetAll_FiltersBySiteId()
    {
        var otherSite = new Domain.Entities.Site
            { Id = Guid.NewGuid(), Name = "Other", Address = "X" };
        _db.Sites.Add(otherSite);
        await _db.SaveChangesAsync();

        await SeedLot(); // belongs to _site

        var lot2 = new InventoryLot
        {
            LotNumber = "LOT-OTHER-001", MaterialGradeId = _grade.Id,
            SiteId = otherSite.Id, Quantity = 1000, OriginalQuantity = 1000,
            WeightedAvgCost = 2200, ReceivedDate = DateTime.UtcNow, Status = LotStatus.InStock
        };
        _db.InventoryLots.Add(lot2);
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll(_site.Id, null);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<PagedResult<InventoryLotDto>>(ok.Value).Items;

        Assert.Single(list);
        Assert.Equal(_site.Name, list[0].SiteName);
    }

    [Fact]
    public async Task GetAll_FiltersByStatus()
    {
        await SeedLot(1000, LotStatus.InStock);
        await SeedLot(2000, LotStatus.WrittenOff);

        var result = await _controller.GetAll(null, "InStock");
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<PagedResult<InventoryLotDto>>(ok.Value).Items;

        Assert.Single(list);
        Assert.Equal("InStock", list[0].Status);
    }

    // ===== GET BY ID =====

    [Fact]
    public async Task Get_ReturnsLot_WhenFound()
    {
        var lot = await SeedLot(7500);
        var result = await _controller.Get(lot.Id);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<InventoryLotDto>(ok.Value);
        Assert.Equal(7500, dto.Quantity);
    }

    [Fact]
    public async Task Get_ReturnsNotFound_ForUnknownId()
    {
        var result = await _controller.Get(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ===== ADJUST =====

    [Fact]
    public async Task Adjust_UpdatesQuantity()
    {
        var lot = await SeedLot(5000);
        var result = await _controller.Adjust(lot.Id, new AdjustLotDto(3500, "Stock count correction"));
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<InventoryLotDto>(ok.Value);

        Assert.Equal(3500, dto.Quantity);
        Assert.Equal("InStock", dto.Status);
    }

    [Fact]
    public async Task Adjust_SetsStatusSold_WhenQuantityIsZero()
    {
        var lot = await SeedLot(5000);
        var result = await _controller.Adjust(lot.Id, new AdjustLotDto(0, "Fully sold"));
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<InventoryLotDto>(ok.Value);

        Assert.Equal("Sold", dto.Status);
    }

    [Fact]
    public async Task Adjust_ReturnsBadRequest_WhenQuantityIsNegative()
    {
        var lot = await SeedLot(5000);
        var result = await _controller.Adjust(lot.Id, new AdjustLotDto(-100, "Error"));
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Adjust_ReturnsUnprocessable_WhenLotIsWrittenOff()
    {
        var lot = await SeedLot(5000, LotStatus.WrittenOff);
        var result = await _controller.Adjust(lot.Id, new AdjustLotDto(1000, "X"));
        Assert.IsType<UnprocessableEntityObjectResult>(result.Result);
    }

    // ===== WRITE OFF =====

    [Fact]
    public async Task WriteOff_SetsStatusWrittenOff_AndZerosQuantity()
    {
        var lot = await SeedLot(4000);
        var result = await _controller.WriteOff(lot.Id, new WriteOffLotDto("Contaminated"));
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<InventoryLotDto>(ok.Value);

        Assert.Equal("WrittenOff", dto.Status);
        Assert.Equal(0, dto.Quantity);
    }

    [Fact]
    public async Task WriteOff_ReturnsUnprocessable_WhenAlreadyWrittenOff()
    {
        var lot = await SeedLot(0, LotStatus.WrittenOff);
        var result = await _controller.WriteOff(lot.Id, new WriteOffLotDto("Again"));
        Assert.IsType<UnprocessableEntityObjectResult>(result.Result);
    }

    [Fact]
    public async Task WriteOff_ReturnsNotFound_ForUnknownId()
    {
        var result = await _controller.WriteOff(Guid.NewGuid(), new WriteOffLotDto("X"));
        Assert.IsType<NotFoundResult>(result.Result);
    }
}
