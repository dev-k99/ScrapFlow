using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Data;
using ScrapFlow.Infrastructure.Services;

namespace ScrapFlow.Tests;

/// <summary>
/// Focused compliance validation tests for the inbound ticket completion step.
/// These test the SA Second-Hand Goods Act enforcement in TicketService.
/// </summary>
public class TicketServiceComplianceTests : IDisposable
{
    private readonly ScrapFlowDbContext _db;
    private readonly TicketService _ticketService;

    public TicketServiceComplianceTests()
    {
        var options = new DbContextOptionsBuilder<ScrapFlowDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new ScrapFlowDbContext(options);

        var site = new Site { Id = Guid.NewGuid(), Name = "Compliance Test Site", Address = "1 Test Rd" };
        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            FullName = "John Doe",
            IsVerified = true,
            IdNumber = "8001015009087"
        };
        _db.Sites.Add(site);
        _db.Suppliers.Add(supplier);
        _db.SaveChanges();

        _ticketService = new TicketService(
            _db,
            new QrCodeService(),
            new NotificationService(NullLogger<NotificationService>.Instance),
            new Mock<IWebhookService>().Object);
    }

    [Fact]
    public async Task CompleteTicket_ShouldFail_IfPaymentReferenceIsMissing()
    {
        var ticket = await CreateBaseTicket();
        ticket.Status = TicketStatus.PaymentRecorded;
        ticket.PaymentReference = null;
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _ticketService.CompleteTicketAsync(ticket.Id, new CompleteTicketDto(null), "test-user"));

        Assert.Contains("Electronic payment reference is missing", ex.Message);
    }

    [Fact]
    public async Task CompleteTicket_ShouldFail_IfPhotosAreMissing()
    {
        var ticket = await CreateBaseTicket();
        ticket.Status = TicketStatus.PaymentRecorded;
        ticket.PaymentReference = "EFT12345";
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _ticketService.CompleteTicketAsync(ticket.Id, new CompleteTicketDto(null), "test-user"));

        Assert.Contains("Seller face photo is required", ex.Message);
        Assert.Contains("Material load photo is required", ex.Message);
    }

    [Fact]
    public async Task CompleteTicket_ShouldFail_IfIdNotVerified()
    {
        var ticket = await CreateBaseTicket();
        ticket.Status = TicketStatus.PaymentRecorded;
        ticket.PaymentReference = "EFT12345";

        // Add all photos but unverify ID
        _db.TicketPhotos.AddRange(
            new TicketPhoto { InboundTicketId = ticket.Id, PhotoType = PhotoType.SellerFace, FilePath = "f.jpg" },
            new TicketPhoto { InboundTicketId = ticket.Id, PhotoType = PhotoType.MaterialLoad, FilePath = "l.jpg" },
            new TicketPhoto { InboundTicketId = ticket.Id, PhotoType = PhotoType.IdDocument, FilePath = "i.jpg" }
        );
        var cr = await _db.ComplianceRecords.FirstAsync(c => c.InboundTicketId == ticket.Id);
        cr.IdVerified = false;
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _ticketService.CompleteTicketAsync(ticket.Id, new CompleteTicketDto(null), "test-user"));

        Assert.Contains("ID has not been verified", ex.Message);
    }

    private async Task<InboundTicket> CreateBaseTicket()
    {
        var site = await _db.Sites.FirstAsync();
        var supplier = await _db.Suppliers.FirstAsync();

        var ticket = new InboundTicket
        {
            Id = Guid.NewGuid(),
            TicketNumber = $"TEST-{Guid.NewGuid():N}",
            SiteId = site.Id,
            SupplierId = supplier.Id,
            Status = TicketStatus.Created,
            ComplianceRecord = new ComplianceRecord { IdVerified = true }
        };

        _db.InboundTickets.Add(ticket);
        await _db.SaveChangesAsync();
        return ticket;
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
    }
}
