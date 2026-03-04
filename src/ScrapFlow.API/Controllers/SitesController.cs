using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SitesController : ControllerBase
{
    private readonly ScrapFlowDbContext _db;

    public SitesController(ScrapFlowDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<SiteDto>>> GetAll()
    {
        var sites = await _db.Sites.ToListAsync();

        var dtos = new List<SiteDto>();
        foreach (var s in sites)
        {
            var activeTickets = await _db.InboundTickets
                .CountAsync(t => t.SiteId == s.Id && t.Status != Domain.Enums.TicketStatus.Completed
                                                   && t.Status != Domain.Enums.TicketStatus.Cancelled);
            var inventoryWeight = await _db.InventoryLots
                .Where(l => l.SiteId == s.Id && l.Status == Domain.Enums.LotStatus.InStock)
                .SumAsync(l => (decimal?)l.Quantity) ?? 0;

            dtos.Add(MapToDto(s, activeTickets, inventoryWeight));
        }

        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SiteDto>> Get(Guid id)
    {
        var s = await _db.Sites.FindAsync(id);
        if (s == null) return NotFound();

        var activeTickets = await _db.InboundTickets
            .CountAsync(t => t.SiteId == s.Id && t.Status != Domain.Enums.TicketStatus.Completed
                                               && t.Status != Domain.Enums.TicketStatus.Cancelled);
        var inventoryWeight = await _db.InventoryLots
            .Where(l => l.SiteId == s.Id && l.Status == Domain.Enums.LotStatus.InStock)
            .SumAsync(l => (decimal?)l.Quantity) ?? 0;

        return Ok(MapToDto(s, activeTickets, inventoryWeight));
    }

    [HttpPost]
    public async Task<ActionResult<SiteDto>> Create(CreateSiteDto dto)
    {
        if (await _db.Sites.AnyAsync(s => s.Name == dto.Name))
            return Conflict(new { message = $"A site named '{dto.Name}' already exists" });

        var site = new Site
        {
            Name = dto.Name,
            Address = dto.Address,
            City = dto.City,
            Province = dto.Province,
            PostalCode = dto.PostalCode,
            PhoneNumber = dto.PhoneNumber
        };

        _db.Sites.Add(site);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = site.Id }, MapToDto(site, 0, 0));
    }

    private static SiteDto MapToDto(Site s, int activeTickets, decimal inventoryWeight) => new()
    {
        Id = s.Id,
        Name = s.Name,
        Address = s.Address,
        City = s.City,
        Province = s.Province,
        PostalCode = s.PostalCode,
        PhoneNumber = s.PhoneNumber,
        IsActive = s.IsActive,
        ActiveTickets = activeTickets,
        TotalInventoryWeight = inventoryWeight
    };
}
