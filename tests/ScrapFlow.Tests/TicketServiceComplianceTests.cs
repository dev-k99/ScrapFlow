using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Data;
using ScrapFlow.Infrastructure.Services;
using Xunit;

namespace ScrapFlow.Tests;

public class TicketServiceComplianceTests : IDisposable
{
    private readonly ScrapFlowDbContext _db;
    private readonly TicketService _ticketService;
    private readonly Mock<QrCodeService> _qrMock;
    private readonly Mock<NotificationService> _notifMock;

    public TicketServiceComplianceTests()
    {
        var options = new DbContextOptionsBuilder<ScrapFlowDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new ScrapFlowDbContext(options);
        
        // Setup base data
        var site = new Site { Id = Guid.NewGuid(), Name = "Test Site" };
        var supplier = new Supplier { 
            Id = Guid.NewGuid(), 
            FullName = "John Doe", 
            IsVerified = true,
            IdNumber = "123456789" 
        };
        _db.Sites.Add(site);
        _db.Suppliers.Add(supplier);
        _db.SaveChanges();

        _qrMock = new Mock<QrCodeService>();
        var loggerMock = new Mock<ILogger<NotificationService>>();
        _notifMock = new Mock<NotificationService>(loggerMock.Object);
        
        _ticketService = new TicketService(_db, _qrMock.Object, _notifMock.Object);
    }

    [Fact]
    public async Task CompleteTicket_ShouldFail_IfPaymentReferenceIsMissing()
    {
        // Arrange: Create a ticket that is at the PaymentRecorded stage but missing the actual reference
        var ticket = await CreateBaseTicket();
        ticket.Status = TicketStatus.PaymentRecorded;
        ticket.PaymentReference = null; // Enforce missing reference
        await _db.SaveChangesAsync();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => 
            _ticketService.CompleteTicketAsync(ticket.Id, new CompleteTicketDto(null), "test-user"));
        
        Assert.Contains("Electronic payment reference is missing", ex.Message);
    }

    [Fact]
    public async Task CompleteTicket_ShouldFail_IfPhotosAreMissing()
    {
        // Arrange
        var ticket = await CreateBaseTicket();
        ticket.Status = TicketStatus.PaymentRecorded;
        ticket.PaymentReference = "EFT12345";
        ticket.Photos.Clear(); // No photos
        await _db.SaveChangesAsync();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => 
            _ticketService.CompleteTicketAsync(ticket.Id, new CompleteTicketDto(null), "test-user"));
        
        Assert.Contains("Seller face photo is required", ex.Message);
        Assert.Contains("Material load photo is required", ex.Message);
    }

    private async Task<InboundTicket> CreateBaseTicket()
    {
        var site = await _db.Sites.FirstAsync();
        var supplier = await _db.Suppliers.FirstAsync();
        
        var ticket = new InboundTicket
        {
            Id = Guid.NewGuid(),
            TicketNumber = "TEST-001",
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
