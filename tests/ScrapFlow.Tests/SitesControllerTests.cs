using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.API.Controllers;
using ScrapFlow.Application.DTOs;

namespace ScrapFlow.Tests;

public class SitesControllerTests : IAsyncLifetime
{
    private Infrastructure.Data.ScrapFlowDbContext _db = null!;
    private SitesController _controller = null!;

    public async Task InitializeAsync()
    {
        var (db, _, _, _, _) = await TestDbFactory.CreateWithSeedAsync();
        _db = db;
        _controller = new SitesController(_db);
    }

    public Task DisposeAsync()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task GetAll_ReturnsSeedSite()
    {
        var result = await _controller.GetAll();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<SiteDto>>(ok.Value).ToList();
        Assert.Single(list);
        Assert.Equal("Test Site", list[0].Name);
    }

    [Fact]
    public async Task Get_ReturnsSite_WhenFound()
    {
        var site = await _db.Sites.FirstAsync();
        var result = await _controller.Get(site.Id);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SiteDto>(ok.Value);
        Assert.Equal(site.Id, dto.Id);
    }

    [Fact]
    public async Task Get_ReturnsNotFound_ForUnknownId()
    {
        var result = await _controller.Get(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_AddsSite_ToDatabase()
    {
        var dto = new CreateSiteDto("Cape Town Yard", "5 Voortrekker Rd", "Cape Town",
            "Western Cape", "7535", "0211234567");

        var result = await _controller.Create(dto);
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var saved = Assert.IsType<SiteDto>(created.Value);

        Assert.Equal("Cape Town Yard", saved.Name);
        Assert.Equal(2, await _db.Sites.CountAsync());
    }

    [Fact]
    public async Task Create_ReturnsConflict_WhenNameAlreadyExists()
    {
        var dto = new CreateSiteDto("Test Site", "1 Test Street", null, null, null, null);
        var result = await _controller.Create(dto);
        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetAll_IncludesActiveTicketCount()
    {
        var site = await _db.Sites.FirstAsync();
        var supplier = await _db.Suppliers.FirstAsync();

        // Add an active (non-completed) inbound ticket
        _db.InboundTickets.Add(new Domain.Entities.InboundTicket
        {
            TicketNumber = "INB-TEST-001",
            SiteId = site.Id,
            SupplierId = supplier.Id,
            Status = Domain.Enums.TicketStatus.Created,
            ComplianceRecord = new Domain.Entities.ComplianceRecord()
        });
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<SiteDto>>(ok.Value).ToList();
        Assert.Equal(1, list[0].ActiveTickets);
    }
}
