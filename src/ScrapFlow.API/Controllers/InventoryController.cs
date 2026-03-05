using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.API.Hubs;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly ScrapFlowDbContext _db;
    private readonly IHubContext<InventoryHub> _hub;
    private readonly IWebhookService _webhookService;

    public InventoryController(ScrapFlowDbContext db, IHubContext<InventoryHub> hub, IWebhookService webhookService)
    {
        _db  = db;
        _hub = hub;
        _webhookService = webhookService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<InventoryLotDto>>> GetAll(
        [FromQuery] Guid?   siteId,
        [FromQuery] string? status,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 50)
    {
        var today = DateTime.UtcNow.Date;
        var query = _db.InventoryLots
            .Include(l => l.MaterialGrade).ThenInclude(g => g.Category)
            .Include(l => l.MaterialGrade).ThenInclude(g => g.DailyPrices.Where(dp => dp.EffectiveDate == today))
            .Include(l => l.Site)
            .AsQueryable();

        if (siteId.HasValue) query = query.Where(l => l.SiteId == siteId.Value);
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<LotStatus>(status, true, out var ls))
            query = query.Where(l => l.Status == ls);

        var total = await query.CountAsync();
        var lots = await query
            .OrderByDescending(l => l.ReceivedDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<InventoryLotDto>
        {
            Items      = lots.Select(MapToDto).ToList(),
            TotalCount = total,
            Page       = page,
            PageSize   = pageSize
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<InventoryLotDto>> Get(Guid id)
    {
        var today = DateTime.UtcNow.Date;
        var lot = await _db.InventoryLots
            .Include(l => l.MaterialGrade).ThenInclude(g => g.Category)
            .Include(l => l.MaterialGrade).ThenInclude(g => g.DailyPrices.Where(dp => dp.EffectiveDate == today))
            .Include(l => l.Site)
            .FirstOrDefaultAsync(l => l.Id == id);

        return lot == null ? NotFound() : Ok(MapToDto(lot));
    }

    [HttpPut("{id}/adjust")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<InventoryLotDto>> Adjust(Guid id, AdjustLotDto dto)
    {
        var lot = await _db.InventoryLots.FindAsync(id);
        if (lot == null) return NotFound();
        if (lot.Status == LotStatus.WrittenOff)
            return UnprocessableEntity(new { message = "Cannot adjust a written-off lot" });
        if (dto.NewQuantity < 0)
            return BadRequest(new { message = "Quantity cannot be negative" });

        var previousQty = lot.Quantity;
        lot.Quantity = dto.NewQuantity;
        lot.Notes = string.IsNullOrWhiteSpace(lot.Notes)
            ? dto.Reason
            : $"{lot.Notes} | Adjusted: {dto.Reason}";
        lot.Status = dto.NewQuantity == 0 ? LotStatus.Sold : LotStatus.InStock;

        await _db.SaveChangesAsync();

        var result = await GetFull(id);
        await _hub.Clients.Group($"site-{lot.SiteId}").SendAsync("InventoryUpdated", new
        {
            siteId = lot.SiteId,
            source = "Adjustment",
            lotId  = id
        });

        _ = Task.Run(() => _webhookService.FireAsync("inventory.lot.adjusted", new
        {
            lotNumber = result.LotNumber,
            materialCode = result.MaterialCode,
            siteName = result.SiteName,
            previousQuantity = previousQty,
            newQuantity = dto.NewQuantity,
            delta = dto.NewQuantity - previousQty,
            reason = dto.Reason
        }));

        return Ok(result);
    }

    [HttpPut("{id}/write-off")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<InventoryLotDto>> WriteOff(Guid id, WriteOffLotDto dto)
    {
        var lot = await _db.InventoryLots.FindAsync(id);
        if (lot == null) return NotFound();
        if (lot.Status == LotStatus.WrittenOff)
            return UnprocessableEntity(new { message = "Lot is already written off" });

        var writeOffQty = lot.Quantity;
        var writeOffSiteId = lot.SiteId;
        lot.Status   = LotStatus.WrittenOff;
        lot.Quantity = 0;
        lot.Notes = string.IsNullOrWhiteSpace(lot.Notes)
            ? $"Written off: {dto.Reason}"
            : $"{lot.Notes} | Written off: {dto.Reason}";

        await _db.SaveChangesAsync();

        var result = await GetFull(id);
        await _hub.Clients.Group($"site-{writeOffSiteId}").SendAsync("InventoryUpdated", new
        {
            siteId = writeOffSiteId,
            source = "WriteOff",
            lotId  = id
        });

        _ = Task.Run(() => _webhookService.FireAsync("inventory.lot.written_off", new
        {
            lotNumber = result.LotNumber,
            materialCode = result.MaterialCode,
            siteName = result.SiteName,
            quantity = writeOffQty,
            estimatedValue = result.EstimatedValue,
            reason = dto.Reason
        }));

        return Ok(result);
    }

    private async Task<InventoryLotDto> GetFull(Guid id)
    {
        var today = DateTime.UtcNow.Date;
        var lot = await _db.InventoryLots
            .Include(l => l.MaterialGrade).ThenInclude(g => g.Category)
            .Include(l => l.MaterialGrade).ThenInclude(g => g.DailyPrices.Where(dp => dp.EffectiveDate == today))
            .Include(l => l.Site)
            .FirstAsync(l => l.Id == id);
        return MapToDto(lot);
    }

    private static InventoryLotDto MapToDto(Domain.Entities.InventoryLot l)
    {
        var todayPrice = l.MaterialGrade?.DailyPrices?.FirstOrDefault();
        var sellPrice  = todayPrice?.SellPricePerTon ?? l.MaterialGrade?.DefaultSellPrice ?? 0;

        return new InventoryLotDto
        {
            Id               = l.Id,
            LotNumber        = l.LotNumber,
            MaterialCode     = l.MaterialGrade?.Code ?? "",
            MaterialName     = l.MaterialGrade?.Name ?? "",
            Category         = l.MaterialGrade?.Category?.Name ?? "",
            SiteName         = l.Site?.Name ?? "",
            Quantity         = l.Quantity,
            OriginalQuantity = l.OriginalQuantity,
            WeightedAvgCost  = l.WeightedAvgCost,
            TodaySellPrice   = sellPrice,
            EstimatedValue   = Math.Round(l.Quantity / 1000 * sellPrice, 2),
            Location         = l.Location,
            Status           = l.Status.ToString(),
            ReceivedDate     = l.ReceivedDate,
            Notes            = l.Notes,
            InboundTicketId  = l.InboundTicketId
        };
    }
}
