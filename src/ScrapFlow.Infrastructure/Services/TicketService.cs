using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.Infrastructure.Services;

public class TicketService : ITicketService
{
    private readonly ScrapFlowDbContext _db;
    private readonly QrCodeService _qrCodeService;
    private readonly NotificationService _notificationService;

    public TicketService(ScrapFlowDbContext db, QrCodeService qrCodeService, NotificationService notificationService)
    {
        _db = db;
        _qrCodeService = qrCodeService;
        _notificationService = notificationService;
    }

    public async Task<InboundTicketResponseDto> CreateInboundTicketAsync(CreateInboundTicketDto dto, string userId)
    {
        var supplier = await _db.Suppliers.FindAsync(dto.SupplierId)
            ?? throw new ArgumentException("Supplier not found");

        var site = await _db.Sites.FindAsync(dto.SiteId)
            ?? throw new ArgumentException("Site not found");

        // Generate ticket number: INB-YYYYMMDD-NNNN
        var today = DateTime.UtcNow.Date;
        var count = await _db.InboundTickets
            .IgnoreQueryFilters()
            .CountAsync(t => t.CreatedAt.Date == today) + 1;

        var ticketNumber = $"INB-{today:yyyyMMdd}-{count:D4}";

        var ticket = new InboundTicket
        {
            TicketNumber = ticketNumber,
            QrCodeData = _qrCodeService.GenerateQrCodeBase64(ticketNumber),
            SupplierId = dto.SupplierId,
            SiteId = dto.SiteId,
            Status = TicketStatus.Created,
            Notes = dto.Notes,
            CreatedByUserId = userId,
            ComplianceRecord = new ComplianceRecord
            {
                IdVerificationMethod = IdVerificationMethod.Manual,
                IdVerified = supplier.IsVerified,
                HasSellerPhoto = false,
                HasLoadPhoto = false,
                HasIdPhoto = false,
                HasElectronicPaymentProof = false,
                HasValidPaymentReference = false,
                IsFullyCompliant = false
            }
        };

        _db.InboundTickets.Add(ticket);
        await _db.SaveChangesAsync();

        return await GetTicketAsync(ticket.Id) ?? throw new Exception("Failed to create ticket");
    }

    public async Task<InboundTicketResponseDto> RecordGrossWeightAsync(Guid ticketId, RecordGrossWeightDto dto, string userId)
    {
        var ticket = await GetTicketEntity(ticketId);
        ValidateStatus(ticket, TicketStatus.Created);

        ticket.GrossWeight = dto.GrossWeight;
        ticket.Status = TicketStatus.GrossWeighed;
        ticket.UpdatedBy = userId;

        await _db.SaveChangesAsync();
        return await GetTicketAsync(ticketId) ?? throw new Exception("Ticket not found");
    }

    public async Task<InboundTicketResponseDto> RecordGradingAsync(Guid ticketId, RecordGradingDto dto, string userId)
    {
        var ticket = await GetTicketEntity(ticketId);
        ValidateStatus(ticket, TicketStatus.GrossWeighed);

        if (dto.LineItems == null || !dto.LineItems.Any())
            throw new ArgumentException("At least one line item is required");

        // Remove existing line items
        var existing = await _db.TicketLineItems.Where(li => li.InboundTicketId == ticketId).ToListAsync();
        _db.TicketLineItems.RemoveRange(existing);

        foreach (var item in dto.LineItems)
        {
            var grade = await _db.MaterialGrades.FindAsync(item.MaterialGradeId)
                ?? throw new ArgumentException($"Material grade not found: {item.MaterialGradeId}");

            // Get today's price or fall back to default
            var today = DateTime.UtcNow.Date;
            var dailyPrice = await _db.DailyPrices
                .Where(dp => dp.MaterialGradeId == item.MaterialGradeId && dp.EffectiveDate == today)
                .FirstOrDefaultAsync();

            var pricePerTon = dailyPrice?.BuyPricePerTon ?? grade.DefaultBuyPrice;
            var lineTotal = Math.Round(item.NetWeight / 1000 * pricePerTon, 2);

            _db.TicketLineItems.Add(new TicketLineItem
            {
                InboundTicketId = ticketId,
                MaterialGradeId = item.MaterialGradeId,
                NetWeight = item.NetWeight,
                PricePerTon = pricePerTon,
                LineTotal = lineTotal,
                GradeNotes = item.GradeNotes,
                QualityScore = item.QualityScore
            });
        }

        ticket.Status = TicketStatus.Graded;
        ticket.UpdatedBy = userId;
        await _db.SaveChangesAsync();

        return await GetTicketAsync(ticketId) ?? throw new Exception("Ticket not found");
    }

    public async Task<InboundTicketResponseDto> RecordTareWeightAsync(Guid ticketId, RecordTareWeightDto dto, string userId)
    {
        var ticket = await _db.InboundTickets
            .Include(t => t.LineItems)
            .FirstOrDefaultAsync(t => t.Id == ticketId)
            ?? throw new ArgumentException("Ticket not found");

        ValidateStatus(ticket, TicketStatus.Graded);

        if (ticket.GrossWeight == null)
            throw new InvalidOperationException("Gross weight not recorded");

        ticket.TareWeight = dto.TareWeight;
        ticket.NetWeight = ticket.GrossWeight.Value - dto.TareWeight;

        if (ticket.NetWeight <= 0)
            throw new InvalidOperationException("Net weight must be positive. Check gross and tare weights.");

        // Recalculate total price from line items
        ticket.TotalPrice = ticket.LineItems.Sum(li => li.LineTotal);
        ticket.Status = TicketStatus.TareWeighed;
        ticket.UpdatedBy = userId;

        await _db.SaveChangesAsync();
        return await GetTicketAsync(ticketId) ?? throw new Exception("Ticket not found");
    }

    public async Task<InboundTicketResponseDto> RecordPaymentAsync(Guid ticketId, RecordPaymentDto dto, string userId)
    {
        var ticket = await GetTicketEntity(ticketId);
        ValidateStatus(ticket, TicketStatus.TareWeighed);

        // ===== COMPLIANCE: Electronic payment ONLY =====
        if (string.IsNullOrWhiteSpace(dto.PaymentReference))
            throw new ArgumentException("Payment reference (EFT/bank transfer reference number) is REQUIRED. Cash payments are prohibited under the Second-Hand Goods Act.");

        ticket.PaymentMethod = PaymentMethod.EFT;
        ticket.PaymentReference = dto.PaymentReference;
        ticket.PaymentProofPath = dto.PaymentProofPath;
        ticket.PaymentVerified = true;
        ticket.PaymentVerifiedByUserId = userId;
        ticket.Status = TicketStatus.PaymentRecorded;
        ticket.UpdatedBy = userId;

        // Update compliance record
        var compliance = await _db.ComplianceRecords.FirstOrDefaultAsync(cr => cr.InboundTicketId == ticketId);
        if (compliance != null)
        {
            compliance.HasElectronicPaymentProof = !string.IsNullOrWhiteSpace(dto.PaymentProofPath);
            compliance.HasValidPaymentReference = true;
        }

        await _db.SaveChangesAsync();
        return await GetTicketAsync(ticketId) ?? throw new Exception("Ticket not found");
    }

    public async Task<InboundTicketResponseDto> CompleteTicketAsync(Guid ticketId, CompleteTicketDto dto, string userId)
    {
        var ticket = await _db.InboundTickets
            .Include(t => t.LineItems).ThenInclude(li => li.MaterialGrade)
            .Include(t => t.ComplianceRecord)
            .Include(t => t.Photos)
            .FirstOrDefaultAsync(t => t.Id == ticketId)
            ?? throw new ArgumentException("Ticket not found");

        ValidateStatus(ticket, TicketStatus.PaymentRecorded);

        // ===== FULL COMPLIANCE VALIDATION =====
        var errors = new List<string>();

        if (ticket.ComplianceRecord == null || !ticket.ComplianceRecord.IdVerified)
            errors.Add("Seller ID has not been verified.");

        if (string.IsNullOrWhiteSpace(ticket.PaymentReference))
            errors.Add("Electronic payment reference is missing. Cash payments are prohibited.");

        // Photo requirements (minimum 3)
        var photoTypes = ticket.Photos.Select(p => p.PhotoType).ToHashSet();
        if (!photoTypes.Contains(PhotoType.SellerFace))
            errors.Add("Seller face photo is required.");
        if (!photoTypes.Contains(PhotoType.MaterialLoad))
            errors.Add("Material load photo is required.");
        if (!photoTypes.Contains(PhotoType.IdDocument))
            errors.Add("ID document photo is required.");

        if (errors.Any())
            throw new InvalidOperationException($"Compliance validation failed: {string.Join(" | ", errors)}");

        // Mark compliant
        if (ticket.ComplianceRecord != null)
        {
            ticket.ComplianceRecord.IsFullyCompliant = true;
            ticket.ComplianceRecord.ReviewedAt = DateTime.UtcNow;
            ticket.ComplianceRecord.ReviewedByUserId = userId;
        }

        ticket.SellerSignatureData = dto.SellerSignatureData;
        ticket.CompletedAt = DateTime.UtcNow;
        ticket.CompletedByUserId = userId;
        ticket.Status = TicketStatus.Completed;

        // ===== ADD TO INVENTORY =====
        foreach (var lineItem in ticket.LineItems)
        {
            var lotCount = await _db.InventoryLots.IgnoreQueryFilters().CountAsync() + 1;
            _db.InventoryLots.Add(new InventoryLot
            {
                LotNumber = $"LOT-{DateTime.UtcNow:yyyyMMdd}-{lineItem.MaterialGrade.Code}-{lotCount:D4}",
                MaterialGradeId = lineItem.MaterialGradeId,
                SiteId = ticket.SiteId,
                Quantity = lineItem.NetWeight,
                OriginalQuantity = lineItem.NetWeight,
                WeightedAvgCost = lineItem.PricePerTon,
                ReceivedDate = DateTime.UtcNow,
                InboundTicketId = ticket.Id,
                Status = LotStatus.InStock
            });
        }

        await _db.SaveChangesAsync();
        return await GetTicketAsync(ticketId) ?? throw new Exception("Ticket not found");
    }

    public async Task<InboundTicketResponseDto?> GetTicketAsync(Guid ticketId)
    {
        var ticket = await _db.InboundTickets
            .Include(t => t.Supplier)
            .Include(t => t.Site)
            .Include(t => t.LineItems).ThenInclude(li => li.MaterialGrade)
            .Include(t => t.Photos)
            .Include(t => t.ComplianceRecord)
            .FirstOrDefaultAsync(t => t.Id == ticketId);

        if (ticket == null) return null;
        return MapToDto(ticket);
    }

    public async Task<List<InboundTicketResponseDto>> GetTicketsAsync(Guid? siteId = null, string? status = null, int page = 1, int pageSize = 20)
    {
        var query = _db.InboundTickets
            .Include(t => t.Supplier)
            .Include(t => t.Site)
            .Include(t => t.LineItems).ThenInclude(li => li.MaterialGrade)
            .Include(t => t.ComplianceRecord)
            .AsQueryable();

        if (siteId.HasValue)
            query = query.Where(t => t.SiteId == siteId.Value);
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TicketStatus>(status, true, out var st))
            query = query.Where(t => t.Status == st);

        var tickets = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return tickets.Select(MapToDto).ToList();
    }

    // ===== HELPERS =====
    private async Task<InboundTicket> GetTicketEntity(Guid ticketId) =>
        await _db.InboundTickets.FindAsync(ticketId)
        ?? throw new ArgumentException("Ticket not found");

    private static void ValidateStatus(InboundTicket ticket, TicketStatus expected)
    {
        if (ticket.Status != expected)
            throw new InvalidOperationException(
                $"Ticket is in '{ticket.Status}' status. Expected '{expected}' to proceed.");
    }

    private static InboundTicketResponseDto MapToDto(InboundTicket t) => new()
    {
        Id = t.Id,
        TicketNumber = t.TicketNumber,
        QrCodeData = t.QrCodeData,
        Status = t.Status.ToString(),
        GrossWeight = t.GrossWeight,
        TareWeight = t.TareWeight,
        NetWeight = t.NetWeight,
        TotalPrice = t.TotalPrice,
        PaymentReference = t.PaymentReference,
        PaymentVerified = t.PaymentVerified,
        CreatedAt = t.CreatedAt,
        CompletedAt = t.CompletedAt,
        Notes = t.Notes,
        Supplier = t.Supplier != null
            ? new SupplierSummaryDto(t.Supplier.Id, t.Supplier.FullName, t.Supplier.IdNumber, t.Supplier.ContactNumber, t.Supplier.VehicleRegistration)
            : null,
        Site = t.Site != null ? new SiteSummaryDto(t.Site.Id, t.Site.Name, t.Site.City) : null,
        LineItems = t.LineItems.Select(li => new LineItemDto
        {
            Id = li.Id,
            MaterialCode = li.MaterialGrade?.Code ?? "",
            MaterialName = li.MaterialGrade?.Name ?? "",
            NetWeight = li.NetWeight,
            PricePerTon = li.PricePerTon,
            LineTotal = li.LineTotal,
            QualityScore = li.QualityScore
        }).ToList(),
        Photos = t.Photos.Select(p => new TicketPhotoDto(p.Id, p.PhotoType.ToString(), p.FilePath)).ToList(),
        Compliance = t.ComplianceRecord != null ? new ComplianceStatusDto
        {
            IdVerified = t.ComplianceRecord.IdVerified,
            HasSellerPhoto = t.ComplianceRecord.HasSellerPhoto,
            HasLoadPhoto = t.ComplianceRecord.HasLoadPhoto,
            HasIdPhoto = t.ComplianceRecord.HasIdPhoto,
            HasElectronicPaymentProof = t.ComplianceRecord.HasElectronicPaymentProof,
            IsFullyCompliant = t.ComplianceRecord.IsFullyCompliant,
            Notes = t.ComplianceRecord.ComplianceNotes
        } : null
    };
}
