using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SuppliersController : ControllerBase
{
    private readonly ScrapFlowDbContext _db;
    private readonly IWebhookService _webhookService;

    public SuppliersController(ScrapFlowDbContext db, IWebhookService webhookService)
    {
        _db = db;
        _webhookService = webhookService;
    }

    [HttpGet]
    public async Task<ActionResult<List<SupplierDto>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Suppliers.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(s => s.FullName.Contains(search) || s.IdNumber.Contains(search));

        var suppliers = await query.OrderBy(s => s.FullName).ToListAsync();

        var dtos = new List<SupplierDto>();
        foreach (var s in suppliers)
        {
            var tickets = await _db.InboundTickets.Where(t => t.SupplierId == s.Id && t.Status == TicketStatus.Completed).ToListAsync();
            dtos.Add(new SupplierDto
            {
                Id = s.Id, FullName = s.FullName, IdNumber = s.IdNumber, IdType = s.IdType.ToString(),
                ContactNumber = s.ContactNumber, Email = s.Email, VehicleRegistration = s.VehicleRegistration,
                BankName = s.BankName, IsWastePicker = s.IsWastePicker, IsVerified = s.IsVerified,
                TotalTickets = tickets.Count,
                TotalWeight  = tickets.Sum(t => t.NetWeight ?? 0),
                TotalValue   = tickets.Sum(t => t.TotalPrice)
            });
        }
        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SupplierDto>> Get(Guid id)
    {
        var s = await _db.Suppliers.FindAsync(id);
        if (s == null) return NotFound();

        var tickets = await _db.InboundTickets.Where(t => t.SupplierId == s.Id && t.Status == TicketStatus.Completed).ToListAsync();
        return Ok(new SupplierDto
        {
            Id = s.Id, FullName = s.FullName, IdNumber = s.IdNumber, IdType = s.IdType.ToString(),
            ContactNumber = s.ContactNumber, Email = s.Email, VehicleRegistration = s.VehicleRegistration,
            BankName = s.BankName, IsWastePicker = s.IsWastePicker, IsVerified = s.IsVerified,
            TotalTickets = tickets.Count,
            TotalWeight  = tickets.Sum(t => t.NetWeight ?? 0),
            TotalValue   = tickets.Sum(t => t.TotalPrice)
        });
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<SupplierDto>> Create(CreateSupplierDto dto)
    {
        var supplier = new Supplier
        {
            FullName = dto.FullName, IdNumber = dto.IdNumber, IdType = dto.IdType,
            ContactNumber = dto.ContactNumber, Email = dto.Email, Address = dto.Address,
            VehicleRegistration = dto.VehicleRegistration, BankName = dto.BankName,
            AccountNumber = dto.AccountNumber, BranchCode = dto.BranchCode,
            IsWastePicker = dto.IsWastePicker, WastePickerArea = dto.WastePickerArea
        };
        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync();

        _ = Task.Run(() => _webhookService.FireAsync("supplier.registered", new
        {
            fullName = supplier.FullName,
            idNumber = supplier.IdNumber,
            contactNumber = supplier.ContactNumber,
            isVerified = supplier.IsVerified
        }));

        return CreatedAtAction(nameof(Get), new { id = supplier.Id }, new SupplierDto
        {
            Id = supplier.Id, FullName = supplier.FullName, IdNumber = supplier.IdNumber
        });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<SupplierDto>> Update(Guid id, UpdateSupplierDto dto)
    {
        var s = await _db.Suppliers.FindAsync(id);
        if (s == null) return NotFound();

        s.FullName           = dto.FullName;
        s.ContactNumber      = dto.ContactNumber;
        s.Email              = dto.Email;
        s.Address            = dto.Address;
        s.VehicleRegistration = dto.VehicleRegistration;
        s.BankName           = dto.BankName;
        s.AccountNumber      = dto.AccountNumber;
        s.BranchCode         = dto.BranchCode;
        s.IsWastePicker      = dto.IsWastePicker;
        s.WastePickerArea    = dto.WastePickerArea;

        await _db.SaveChangesAsync();

        var tickets = await _db.InboundTickets.Where(t => t.SupplierId == s.Id && t.Status == TicketStatus.Completed).ToListAsync();
        return Ok(new SupplierDto
        {
            Id = s.Id, FullName = s.FullName, IdNumber = s.IdNumber, IdType = s.IdType.ToString(),
            ContactNumber = s.ContactNumber, Email = s.Email, VehicleRegistration = s.VehicleRegistration,
            BankName = s.BankName, IsWastePicker = s.IsWastePicker, IsVerified = s.IsVerified,
            TotalTickets = tickets.Count,
            TotalWeight  = tickets.Sum(t => t.NetWeight ?? 0),
            TotalValue   = tickets.Sum(t => t.TotalPrice)
        });
    }

    [HttpPost("{id}/verify")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult> Verify(Guid id)
    {
        var s = await _db.Suppliers.FindAsync(id);
        if (s == null) return NotFound();

        s.IsVerified = true;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Supplier verified successfully" });
    }
}
