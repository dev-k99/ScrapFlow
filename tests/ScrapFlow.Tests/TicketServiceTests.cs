using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Services;

namespace ScrapFlow.Tests;

public class TicketServiceTests : IAsyncLifetime
{
    private Infrastructure.Data.ScrapFlowDbContext _db = null!;
    private TicketService _service = null!;
    private Domain.Entities.Site _site = null!;
    private Domain.Entities.Supplier _supplier = null!;
    private Domain.Entities.MaterialGrade _grade = null!;

    public async Task InitializeAsync()
    {
        var (db, site, supplier, _, grade) = await TestDbFactory.CreateWithSeedAsync();
        _db = db;
        _site = site;
        _supplier = supplier;
        _grade = grade;

        var qrService = new QrCodeService();
        var notifService = new NotificationService(NullLogger<NotificationService>.Instance);
        var mockWebhook = new Mock<IWebhookService>();

        _service = new TicketService(_db, qrService, notifService, mockWebhook.Object);
    }

    public Task DisposeAsync()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
        return Task.CompletedTask;
    }

    // ===== CREATE =====

    [Fact]
    public async Task CreateInboundTicket_ReturnsTicket_WithGeneratedNumber()
    {
        var dto = new CreateInboundTicketDto(_supplier.Id, _site.Id, "Test notes");
        var result = await _service.CreateInboundTicketAsync(dto, "user1");

        Assert.NotNull(result);
        Assert.StartsWith("INB-", result.TicketNumber);
        Assert.Equal(TicketStatus.Created.ToString(), result.Status);
        Assert.Equal(_supplier.Id, result.Supplier!.Id);
    }

    [Fact]
    public async Task CreateInboundTicket_ThrowsArgumentException_WhenSupplierNotFound()
    {
        var dto = new CreateInboundTicketDto(Guid.NewGuid(), _site.Id, null);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CreateInboundTicketAsync(dto, "user1"));
    }

    [Fact]
    public async Task CreateInboundTicket_ThrowsArgumentException_WhenSiteNotFound()
    {
        var dto = new CreateInboundTicketDto(_supplier.Id, Guid.NewGuid(), null);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CreateInboundTicketAsync(dto, "user1"));
    }

    // ===== GROSS WEIGHT =====

    [Fact]
    public async Task RecordGrossWeight_AdvancesStatus_ToGrossWeighed()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.Created);

        var result = await _service.RecordGrossWeightAsync(ticket.Id,
            new RecordGrossWeightDto(5000), "user1");

        Assert.Equal(TicketStatus.GrossWeighed.ToString(), result.Status);
        Assert.Equal(5000, result.GrossWeight);
    }

    [Fact]
    public async Task RecordGrossWeight_ThrowsInvalidOperation_WhenStatusIsWrong()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.GrossWeighed);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.RecordGrossWeightAsync(ticket.Id, new RecordGrossWeightDto(5000), "user1"));
    }

    // ===== GRADING =====

    [Fact]
    public async Task RecordGrading_AdvancesStatus_ToGraded()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.GrossWeighed);

        var dto = new RecordGradingDto(new List<GradingLineItemDto>
        {
            new(_grade.Id, 4500, "Good quality", 95)
        });

        var result = await _service.RecordGradingAsync(ticket.Id, dto, "user1");

        Assert.Equal(TicketStatus.Graded.ToString(), result.Status);
        Assert.Single(result.LineItems);
        Assert.Equal(4500, result.LineItems[0].NetWeight);
    }

    [Fact]
    public async Task RecordGrading_ThrowsArgumentException_WhenNoLineItems()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.GrossWeighed);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.RecordGradingAsync(ticket.Id, new RecordGradingDto(new List<GradingLineItemDto>()), "u"));
    }

    // ===== TARE WEIGHT =====

    [Fact]
    public async Task RecordTareWeight_CalculatesNetWeight_Correctly()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.Graded);

        var result = await _service.RecordTareWeightAsync(ticket.Id,
            new RecordTareWeightDto(1000), "user1");

        Assert.Equal(TicketStatus.TareWeighed.ToString(), result.Status);
        Assert.Equal(4000, result.NetWeight); // 5000 gross - 1000 tare
    }

    [Fact]
    public async Task RecordTareWeight_Throws_WhenTareExceedsGross()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.Graded);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.RecordTareWeightAsync(ticket.Id, new RecordTareWeightDto(6000), "u"));
    }

    // ===== PAYMENT =====

    [Fact]
    public async Task RecordPayment_AdvancesStatus_ToPaymentRecorded()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.TareWeighed);

        var result = await _service.RecordPaymentAsync(ticket.Id,
            new RecordPaymentDto("EFT-REF-12345", null), "user1");

        Assert.Equal(TicketStatus.PaymentRecorded.ToString(), result.Status);
        Assert.Equal("EFT-REF-12345", result.PaymentReference);
    }

    [Fact]
    public async Task RecordPayment_ThrowsArgumentException_WhenReferenceIsEmpty()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.TareWeighed);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.RecordPaymentAsync(ticket.Id, new RecordPaymentDto("", null), "u"));
    }

    // ===== COMPLETE =====

    [Fact]
    public async Task CompleteTicket_Succeeds_WhenFullyCompliant()
    {
        var ticket = await CreateFullyCompliantTicket();

        var result = await _service.CompleteTicketAsync(ticket.Id,
            new CompleteTicketDto("sig-data=="), "user1");

        Assert.Equal(TicketStatus.Completed.ToString(), result.Status);
        Assert.NotNull(result.CompletedAt);

        // Inventory lot should have been created
        var lots = await _db.InventoryLots.Where(l => l.InboundTicketId == ticket.Id).ToListAsync();
        Assert.NotEmpty(lots);
    }

    [Fact]
    public async Task CompleteTicket_CreatesInventoryLot_WithCorrectValues()
    {
        var ticket = await CreateFullyCompliantTicket();
        await _service.CompleteTicketAsync(ticket.Id, new CompleteTicketDto(null), "user1");

        var lot = await _db.InventoryLots.FirstAsync(l => l.InboundTicketId == ticket.Id);
        Assert.Equal(LotStatus.InStock, lot.Status);
        Assert.Equal(_grade.Id, lot.MaterialGradeId);
        Assert.True(lot.Quantity > 0);
    }

    [Fact]
    public async Task CompleteTicket_Fails_WhenPaymentReferenceMissing()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.PaymentRecorded);

        var ticketEntity = await _db.InboundTickets.FindAsync(ticket.Id);
        ticketEntity!.PaymentReference = null;
        await _db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CompleteTicketAsync(ticket.Id, new CompleteTicketDto(null), "u"));

        Assert.Contains("payment reference is missing", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CompleteTicket_Fails_WhenRequiredPhotosAreMissing()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.PaymentRecorded);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CompleteTicketAsync(ticket.Id, new CompleteTicketDto(null), "u"));

        Assert.Contains("photo", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    // ===== CANCEL =====

    [Fact]
    public async Task CancelTicket_AdvancesStatus_ToCancelled()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.Created);
        var result = await _service.CancelTicketAsync(ticket.Id, "user1");
        Assert.Equal(TicketStatus.Cancelled.ToString(), result.Status);
    }

    [Fact]
    public async Task CancelTicket_ThrowsInvalidOperation_WhenAlreadyCompleted()
    {
        var ticket = await CreateFullyCompliantTicket();
        await _service.CompleteTicketAsync(ticket.Id, new CompleteTicketDto(null), "u");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CancelTicketAsync(ticket.Id, "u"));
    }

    [Fact]
    public async Task CancelTicket_ThrowsInvalidOperation_WhenAlreadyCancelled()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.Created);
        await _service.CancelTicketAsync(ticket.Id, "u");

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CancelTicketAsync(ticket.Id, "u"));
    }

    // ===== ADD PHOTO =====

    [Fact]
    public async Task AddPhoto_AddsPhotoRecord_ToDatabase()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.Created);

        await _service.AddPhotoAsync(ticket.Id, PhotoType.SellerFace, "photos/test.jpg", "u");

        var photos = await _db.TicketPhotos.Where(p => p.InboundTicketId == ticket.Id).ToListAsync();
        Assert.Single(photos);
        Assert.Equal(PhotoType.SellerFace, photos[0].PhotoType);
    }

    [Fact]
    public async Task AddPhoto_UpdatesComplianceFlags_Correctly()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.GrossWeighed);

        await _service.AddPhotoAsync(ticket.Id, PhotoType.SellerFace, "photos/face.jpg", "u");
        await _service.AddPhotoAsync(ticket.Id, PhotoType.MaterialLoad, "photos/load.jpg", "u");
        await _service.AddPhotoAsync(ticket.Id, PhotoType.IdDocument, "photos/id.jpg", "u");

        var compliance = await _db.ComplianceRecords
            .FirstOrDefaultAsync(c => c.InboundTicketId == ticket.Id);

        Assert.NotNull(compliance);
        Assert.True(compliance.HasSellerPhoto);
        Assert.True(compliance.HasLoadPhoto);
        Assert.True(compliance.HasIdPhoto);
    }

    // ===== GET =====

    [Fact]
    public async Task GetTicket_ReturnsNull_ForNonExistentId()
    {
        var result = await _service.GetTicketAsync(Guid.NewGuid());
        Assert.Null(result);
    }

    [Fact]
    public async Task GetTickets_ReturnsOnlyMatchingSite()
    {
        var otherSite = new Domain.Entities.Site
        {
            Id = Guid.NewGuid(), Name = "Other Site", Address = "2 Other Street"
        };
        _db.Sites.Add(otherSite);
        await _db.SaveChangesAsync();

        await _service.CreateInboundTicketAsync(
            new CreateInboundTicketDto(_supplier.Id, _site.Id, null), "u");
        await _service.CreateInboundTicketAsync(
            new CreateInboundTicketDto(_supplier.Id, otherSite.Id, null), "u");

        var result = await _service.GetTicketsAsync(siteId: _site.Id);
        Assert.All(result.Items, t => Assert.Equal(_site.Id, t.Site!.Id));
    }

    // ===== HELPERS =====

    /// <summary>Create ticket and advance it to a given status via service calls.</summary>
    private async Task<InboundTicketResponseDto> CreateTicketAtStatus(TicketStatus targetStatus)
    {
        var ticket = await _service.CreateInboundTicketAsync(
            new CreateInboundTicketDto(_supplier.Id, _site.Id, null), "user1");

        if (targetStatus == TicketStatus.Created) return ticket;

        ticket = await _service.RecordGrossWeightAsync(ticket.Id, new RecordGrossWeightDto(5000), "u");
        if (targetStatus == TicketStatus.GrossWeighed) return ticket;

        ticket = await _service.RecordGradingAsync(ticket.Id,
            new RecordGradingDto(new List<GradingLineItemDto> { new(_grade.Id, 4500, null, 100) }), "u");
        if (targetStatus == TicketStatus.Graded) return ticket;

        ticket = await _service.RecordTareWeightAsync(ticket.Id, new RecordTareWeightDto(1000), "u");
        if (targetStatus == TicketStatus.TareWeighed) return ticket;

        ticket = await _service.RecordPaymentAsync(ticket.Id,
            new RecordPaymentDto("EFT-TEST-001", null), "u");
        return ticket;
    }

    private async Task<InboundTicketResponseDto> CreateFullyCompliantTicket()
    {
        var ticket = await CreateTicketAtStatus(TicketStatus.PaymentRecorded);

        // Add required photos via DB directly (bypasses file upload)
        _db.TicketPhotos.AddRange(
            new TicketPhoto { InboundTicketId = ticket.Id, PhotoType = PhotoType.SellerFace, FilePath = "face.jpg" },
            new TicketPhoto { InboundTicketId = ticket.Id, PhotoType = PhotoType.MaterialLoad, FilePath = "load.jpg" },
            new TicketPhoto { InboundTicketId = ticket.Id, PhotoType = PhotoType.IdDocument, FilePath = "id.jpg" }
        );

        var compliance = await _db.ComplianceRecords.FirstAsync(c => c.InboundTicketId == ticket.Id);
        compliance.IdVerified = true;
        compliance.HasSellerPhoto = true;
        compliance.HasLoadPhoto = true;
        compliance.HasIdPhoto = true;
        await _db.SaveChangesAsync();

        // Re-read to get fresh DTO
        return (await _service.GetTicketAsync(ticket.Id))!;
    }
}
