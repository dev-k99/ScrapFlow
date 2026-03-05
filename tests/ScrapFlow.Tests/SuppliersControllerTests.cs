using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using ScrapFlow.API.Controllers;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Tests;

public class SuppliersControllerTests : IAsyncLifetime
{
    private Infrastructure.Data.ScrapFlowDbContext _db = null!;
    private SuppliersController _controller = null!;

    public async Task InitializeAsync()
    {
        var (db, _, _, _, _) = await TestDbFactory.CreateWithSeedAsync();
        _db = db;
        var mockWebhook = new Mock<IWebhookService>();
        _controller = new SuppliersController(_db, mockWebhook.Object);
    }

    public Task DisposeAsync()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
        return Task.CompletedTask;
    }

    // ===== GET ALL =====

    [Fact]
    public async Task GetAll_ReturnsAllSuppliers()
    {
        var result = await _controller.GetAll(null);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<SupplierDto>>(ok.Value);
        Assert.Single(list); // seeded one supplier
    }

    [Fact]
    public async Task GetAll_FiltersBy_FullName()
    {
        var result = await _controller.GetAll("Sipho");
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<SupplierDto>>(ok.Value);
        Assert.Single(list);
    }

    [Fact]
    public async Task GetAll_ReturnsEmpty_WhenSearchMatchesNothing()
    {
        var result = await _controller.GetAll("nonexistent99");
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<List<SupplierDto>>(ok.Value);
        Assert.Empty(list);
    }

    // ===== GET BY ID =====

    [Fact]
    public async Task Get_ReturnsSupplier_WhenFound()
    {
        var supplier = await _db.Suppliers.FirstAsync();
        var result = await _controller.Get(supplier.Id);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<SupplierDto>(ok.Value);
        Assert.Equal(supplier.Id, dto.Id);
        Assert.Equal(supplier.FullName, dto.FullName);
    }

    [Fact]
    public async Task Get_ReturnsNotFound_ForUnknownId()
    {
        var result = await _controller.Get(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ===== CREATE =====

    [Fact]
    public async Task Create_AddsSupplier_ToDatabase()
    {
        var dto = new CreateSupplierDto(
            "Thabo Nkosi", "9001015009087", IdType.SouthAfricanId,
            "0821234567", null, null, "GP 123-456", null, null, null,
            false, null);

        var result = await _controller.Create(dto);
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var saved = Assert.IsType<SupplierDto>(created.Value);

        Assert.Equal("Thabo Nkosi", saved.FullName);
        Assert.Equal(2, await _db.Suppliers.CountAsync());
    }

    // ===== UPDATE =====

    [Fact]
    public async Task Update_ChangesSupplierFields()
    {
        var supplier = await _db.Suppliers.FirstAsync();
        var dto = new UpdateSupplierDto(
            "Sipho Updated", "0831112222", "sipho@test.com",
            "12 Updated Road", "GP 999-ZZZ", "FNB", "12345678", "250655",
            false, null);

        var result = await _controller.Update(supplier.Id, dto);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var updated = Assert.IsType<SupplierDto>(ok.Value);

        Assert.Equal("Sipho Updated", updated.FullName);
        Assert.Equal("0831112222", updated.ContactNumber);
    }

    [Fact]
    public async Task Update_ReturnsNotFound_ForUnknownId()
    {
        var dto = new UpdateSupplierDto("X", null, null, null, null, null, null, null, false, null);
        var result = await _controller.Update(Guid.NewGuid(), dto);
        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ===== VERIFY =====

    [Fact]
    public async Task Verify_SetsIsVerified_True()
    {
        // Start with unverified supplier
        var supplier = await _db.Suppliers.FirstAsync();
        supplier.IsVerified = false;
        await _db.SaveChangesAsync();

        var result = await _controller.Verify(supplier.Id);
        Assert.IsType<OkObjectResult>(result);

        var refreshed = await _db.Suppliers.FindAsync(supplier.Id);
        Assert.True(refreshed!.IsVerified);
    }

    [Fact]
    public async Task Verify_ReturnsNotFound_ForUnknownId()
    {
        var result = await _controller.Verify(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result);
    }
}
