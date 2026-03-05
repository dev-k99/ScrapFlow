using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.API.Controllers;
using ScrapFlow.Application.DTOs;

namespace ScrapFlow.Tests;

public class CustomersControllerTests : IAsyncLifetime
{
    private Infrastructure.Data.ScrapFlowDbContext _db = null!;
    private CustomersController _controller = null!;

    public async Task InitializeAsync()
    {
        var (db, _, _, _, _) = await TestDbFactory.CreateWithSeedAsync();
        _db = db;
        _controller = new CustomersController(_db);
    }

    public Task DisposeAsync()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task GetAll_ReturnsSeedCustomer()
    {
        var result = await _controller.GetAll(null);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<CustomerDto>>(ok.Value).ToList();
        Assert.Single(list);
        Assert.Equal("Steel Buyers CC", list[0].CompanyName);
    }

    [Fact]
    public async Task GetAll_FiltersBy_CompanyName()
    {
        var result = await _controller.GetAll("Steel");
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<CustomerDto>>(ok.Value).ToList();
        Assert.Single(list);
    }

    [Fact]
    public async Task GetAll_ReturnsEmpty_WhenSearchMatchesNothing()
    {
        var result = await _controller.GetAll("ZZZNOMATCH");
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<CustomerDto>>(ok.Value).ToList();
        Assert.Empty(list);
    }

    [Fact]
    public async Task Get_ReturnsCustomer_WhenFound()
    {
        var customer = await _db.Customers.FirstAsync();
        var result = await _controller.Get(customer.Id);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<CustomerDto>(ok.Value);
        Assert.Equal(customer.Id, dto.Id);
        Assert.Equal("Steel Buyers CC", dto.CompanyName);
    }

    [Fact]
    public async Task Get_ReturnsNotFound_ForUnknownId()
    {
        var result = await _controller.Get(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_AddsCustomer_ToDatabase()
    {
        var dto = new CreateCustomerDto(
            "Metal Traders Ltd", null, "2000/123456/07", null,
            "Jane Doe", "0119876543", "jane@metal.co.za",
            "10 Industrial Rd", "Pretoria", "Gauteng",
            "ABSA", "9876543210", "632005");

        var result = await _controller.Create(dto);
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var saved = Assert.IsType<CustomerDto>(created.Value);

        Assert.Equal("Metal Traders Ltd", saved.CompanyName);
        Assert.Equal(2, await _db.Customers.CountAsync());
    }

    [Fact]
    public async Task GetAll_IncludesTicketCountAndValue()
    {
        var customer = await _db.Customers.FirstAsync();
        var site = await _db.Sites.FirstAsync();

        _db.OutboundTickets.Add(new Domain.Entities.OutboundTicket
        {
            TicketNumber = "OUT-TEST-001",
            CustomerId = customer.Id,
            SiteId = site.Id,
            Status = Domain.Enums.TicketStatus.Completed,
            TotalPrice = 15000,
            CompletedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll(null);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<CustomerDto>>(ok.Value).ToList();

        Assert.Equal(1, list[0].TotalTickets);
        Assert.Equal(15000, list[0].TotalValue);
    }
}
