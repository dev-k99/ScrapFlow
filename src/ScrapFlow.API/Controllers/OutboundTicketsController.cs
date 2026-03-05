using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.API.Hubs;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/tickets/outbound")]
[Authorize]
public class OutboundTicketsController : ControllerBase
{
    private readonly ScrapFlowDbContext _db;
    private readonly IHubContext<InventoryHub> _hub;
    private readonly IWebhookService _webhookService;

    public OutboundTicketsController(ScrapFlowDbContext db, IHubContext<InventoryHub> hub, IWebhookService webhookService)
    {
        _db  = db;
        _hub = hub;
        _webhookService = webhookService;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";

    [HttpGet]
    public async Task<ActionResult<PagedResult<OutboundTicketResponseDto>>> GetAll(
        [FromQuery] Guid?   siteId,
        [FromQuery] string? status,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.OutboundTickets
            .Include(t => t.Customer)
            .Include(t => t.Site)
            .Include(t => t.LineItems).ThenInclude(li => li.MaterialGrade)
            .AsQueryable();

        if (siteId.HasValue) query = query.Where(t => t.SiteId == siteId.Value);
        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<TicketStatus>(status, true, out var st))
            query = query.Where(t => t.Status == st);

        var total = await query.CountAsync();
        var tickets = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResult<OutboundTicketResponseDto>
        {
            Items      = tickets.Select(MapToDto).ToList(),
            TotalCount = total,
            Page       = page,
            PageSize   = pageSize
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OutboundTicketResponseDto>> Get(Guid id)
    {
        var ticket = await _db.OutboundTickets
            .Include(t => t.Customer)
            .Include(t => t.Site)
            .Include(t => t.LineItems).ThenInclude(li => li.MaterialGrade)
            .FirstOrDefaultAsync(t => t.Id == id);

        return ticket == null ? NotFound() : Ok(MapToDto(ticket));
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<OutboundTicketResponseDto>> Create(CreateOutboundTicketDto dto)
    {
        var customer = await _db.Customers.FindAsync(dto.CustomerId);
        if (customer == null) return BadRequest(new { message = "Customer not found" });

        var site = await _db.Sites.FindAsync(dto.SiteId);
        if (site == null) return BadRequest(new { message = "Site not found" });

        var today = DateTime.UtcNow.Date;
        var count = await _db.OutboundTickets.IgnoreQueryFilters().CountAsync(t => t.CreatedAt.Date == today) + 1;

        var ticket = new OutboundTicket
        {
            TicketNumber   = $"OUT-{today:yyyyMMdd}-{count:D4}",
            CustomerId     = dto.CustomerId,
            SiteId         = dto.SiteId,
            Status         = TicketStatus.Created,
            Notes          = dto.Notes,
            CreatedByUserId = UserId
        };

        _db.OutboundTickets.Add(ticket);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = ticket.Id }, MapToDto(ticket));
    }

    [HttpPut("{id}/gross-weight")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<OutboundTicketResponseDto>> RecordGrossWeight(Guid id, RecordOutboundGrossWeightDto dto)
    {
        var ticket = await FindTicket(id);
        if (ticket == null) return NotFound();
        if (ticket.Status != TicketStatus.Created)
            return UnprocessableEntity(new { message = $"Expected Created status, got {ticket.Status}" });

        ticket.GrossWeight = dto.GrossWeight;
        ticket.Status      = TicketStatus.GrossWeighed;
        await _db.SaveChangesAsync();
        return Ok(MapToDto(ticket));
    }

    [HttpPut("{id}/grading")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<OutboundTicketResponseDto>> RecordGrading(Guid id, RecordOutboundGradingDto dto)
    {
        var ticket = await _db.OutboundTickets
            .Include(t => t.LineItems)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (ticket == null) return NotFound();
        if (ticket.Status != TicketStatus.GrossWeighed)
            return UnprocessableEntity(new { message = $"Expected GrossWeighed status, got {ticket.Status}" });

        var existing = _db.TicketLineItems.Where(li => li.OutboundTicketId == id);
        _db.TicketLineItems.RemoveRange(existing);

        foreach (var item in dto.LineItems)
        {
            var grade = await _db.MaterialGrades.FindAsync(item.MaterialGradeId);
            if (grade == null) return BadRequest(new { message = $"Material grade not found: {item.MaterialGradeId}" });

            var today = DateTime.UtcNow.Date;
            var dailyPrice = await _db.DailyPrices
                .Where(dp => dp.MaterialGradeId == item.MaterialGradeId && dp.EffectiveDate == today)
                .FirstOrDefaultAsync();

            var pricePerTon = dailyPrice?.SellPricePerTon ?? grade.DefaultSellPrice;
            var lineTotal   = Math.Round(item.NetWeight / 1000 * pricePerTon, 2);

            _db.TicketLineItems.Add(new TicketLineItem
            {
                OutboundTicketId = id,
                MaterialGradeId  = item.MaterialGradeId,
                NetWeight        = item.NetWeight,
                PricePerTon      = pricePerTon,
                LineTotal        = lineTotal,
                QualityScore     = item.QualityScore
            });
        }

        ticket.Status = TicketStatus.Graded;
        await _db.SaveChangesAsync();

        return Ok(await GetFull(id));
    }

    [HttpPut("{id}/tare-weight")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<OutboundTicketResponseDto>> RecordTareWeight(Guid id, RecordOutboundTareWeightDto dto)
    {
        var ticket = await _db.OutboundTickets
            .Include(t => t.LineItems)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (ticket == null) return NotFound();
        if (ticket.Status != TicketStatus.Graded)
            return UnprocessableEntity(new { message = $"Expected Graded status, got {ticket.Status}" });
        if (ticket.GrossWeight == null)
            return UnprocessableEntity(new { message = "Gross weight not recorded" });

        ticket.TareWeight = dto.TareWeight;
        ticket.NetWeight  = ticket.GrossWeight.Value - dto.TareWeight;

        if (ticket.NetWeight <= 0)
            return UnprocessableEntity(new { message = "Net weight must be positive" });

        ticket.TotalPrice = ticket.LineItems.Sum(li => li.LineTotal);
        ticket.Status     = TicketStatus.TareWeighed;
        await _db.SaveChangesAsync();

        return Ok(await GetFull(id));
    }

    /// <summary>
    /// Complete an outbound ticket.
    /// Depletes inventory lots using FIFO order (oldest lot first) per material grade,
    /// then broadcasts InventoryUpdated via SignalR so the dashboard refreshes.
    /// </summary>
    [HttpPut("{id}/complete")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<OutboundTicketResponseDto>> Complete(Guid id, CompleteOutboundTicketDto dto)
    {
        var ticket = await _db.OutboundTickets
            .Include(t => t.LineItems)
            .Include(t => t.Site)
            .FirstOrDefaultAsync(t => t.Id == id);
        if (ticket == null) return NotFound();
        if (ticket.Status != TicketStatus.TareWeighed)
            return UnprocessableEntity(new { message = $"Expected TareWeighed status, got {ticket.Status}" });

        // FIFO inventory depletion per line item
        foreach (var line in ticket.LineItems)
        {
            var remaining = line.NetWeight;

            // Fetch InStock lots for this material grade at this site, oldest first
            var lots = await _db.InventoryLots
                .Where(l => l.MaterialGradeId == line.MaterialGradeId
                         && l.SiteId           == ticket.SiteId
                         && l.Status           == LotStatus.InStock
                         && l.Quantity         > 0)
                .OrderBy(l => l.ReceivedDate)
                .ToListAsync();

            foreach (var lot in lots)
            {
                if (remaining <= 0) break;

                if (lot.Quantity <= remaining)
                {
                    remaining    -= lot.Quantity;
                    lot.Quantity  = 0;
                    lot.Status    = LotStatus.Sold;
                }
                else
                {
                    lot.Quantity -= remaining;
                    remaining     = 0;
                }
            }

            // If stock was insufficient, continue anyway (yard may reconcile later)
            // You can return an error here if strict stock control is required:
            // if (remaining > 0) return UnprocessableEntity(new { message = $"Insufficient inventory for {line.MaterialCode}" });
        }

        ticket.InvoiceNumber = dto.InvoiceNumber;
        ticket.Notes         = dto.Notes ?? ticket.Notes;
        ticket.Status        = TicketStatus.Completed;
        ticket.CompletedAt   = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var result = await GetFull(id);

        // Broadcast inventory change to all connected clients in this site
        if (ticket.SiteId != Guid.Empty)
        {
            var group = $"site-{ticket.SiteId}";
            await _hub.Clients.Group(group).SendAsync("InventoryUpdated", new
            {
                siteId   = ticket.SiteId,
                source   = "OutboundTicket",
                ticketId = id
            });
            await _hub.Clients.Group(group).SendAsync("OutboundTicketCompleted", new
            {
                ticketId     = result.Id,
                ticketNumber = result.TicketNumber,
                totalPrice   = result.TotalPrice,
                netWeight    = result.NetWeight
            });
        }

        _ = Task.Run(() => _webhookService.FireAsync("ticket.outbound.completed", new
        {
            ticketNumber = result.TicketNumber,
            siteName = result.Site?.Name ?? "",
            customer = new
            {
                companyName = result.Customer?.CompanyName ?? "",
                contactNumber = result.Customer?.ContactNumber ?? "",
                email = (string?)null
            },
            lineItems = result.LineItems.Select(li => new
            {
                materialCode = li.MaterialCode,
                netWeight = li.NetWeight,
                lineTotal = li.LineTotal
            }),
            netWeight = result.NetWeight,
            totalPrice = result.TotalPrice,
            invoiceNumber = result.InvoiceNumber
        }));

        return Ok(result);
    }

    private async Task<OutboundTicket?> FindTicket(Guid id) =>
        await _db.OutboundTickets.FindAsync(id);

    private async Task<OutboundTicketResponseDto> GetFull(Guid id)
    {
        var t = await _db.OutboundTickets
            .Include(t => t.Customer)
            .Include(t => t.Site)
            .Include(t => t.LineItems).ThenInclude(li => li.MaterialGrade)
            .FirstAsync(t => t.Id == id);
        return MapToDto(t);
    }

    private static OutboundTicketResponseDto MapToDto(OutboundTicket t) => new()
    {
        Id              = t.Id,
        TicketNumber    = t.TicketNumber,
        Status          = t.Status.ToString(),
        GrossWeight     = t.GrossWeight,
        TareWeight      = t.TareWeight,
        NetWeight       = t.NetWeight,
        TotalPrice      = t.TotalPrice,
        InvoiceNumber   = t.InvoiceNumber,
        PaymentReference = t.PaymentReference,
        PaymentReceived  = t.PaymentReceived,
        Notes           = t.Notes,
        CreatedAt       = t.CreatedAt,
        CompletedAt     = t.CompletedAt,
        Customer = t.Customer != null
            ? new CustomerSummaryDto(t.Customer.Id, t.Customer.CompanyName, t.Customer.ContactPerson, t.Customer.ContactNumber)
            : null,
        Site     = t.Site != null ? new SiteSummaryDto(t.Site.Id, t.Site.Name, t.Site.City) : null,
        LineItems = t.LineItems.Select(li => new LineItemDto
        {
            Id           = li.Id,
            MaterialCode = li.MaterialGrade?.Code ?? "",
            MaterialName = li.MaterialGrade?.Name ?? "",
            NetWeight    = li.NetWeight,
            PricePerTon  = li.PricePerTon,
            LineTotal    = li.LineTotal,
            QualityScore = li.QualityScore
        }).ToList()
    };
}
