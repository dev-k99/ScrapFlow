using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ScrapFlowDbContext _db;

    public CustomersController(ScrapFlowDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<CustomerDto>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Customers.AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.CompanyName.Contains(search) || (c.TradingAs != null && c.TradingAs.Contains(search)));

        var customers = await query.OrderBy(c => c.CompanyName).ToListAsync();

        var dtos = new List<CustomerDto>();
        foreach (var c in customers)
        {
            var tickets = await _db.OutboundTickets
                .Where(t => t.CustomerId == c.Id && t.Status == TicketStatus.Completed)
                .ToListAsync();
            dtos.Add(MapToDto(c, tickets.Count, tickets.Sum(t => t.TotalPrice)));
        }

        return Ok(dtos);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CustomerDto>> Get(Guid id)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c == null) return NotFound();

        var tickets = await _db.OutboundTickets
            .Where(t => t.CustomerId == c.Id && t.Status == TicketStatus.Completed)
            .ToListAsync();

        return Ok(MapToDto(c, tickets.Count, tickets.Sum(t => t.TotalPrice)));
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<CustomerDto>> Create(CreateCustomerDto dto)
    {
        var customer = new Customer
        {
            CompanyName        = dto.CompanyName,
            TradingAs          = dto.TradingAs,
            RegistrationNumber = dto.RegistrationNumber,
            VatNumber          = dto.VatNumber,
            ContactPerson      = dto.ContactPerson,
            ContactNumber      = dto.ContactNumber,
            Email              = dto.Email,
            Address            = dto.Address,
            City               = dto.City,
            Province           = dto.Province,
            BankName           = dto.BankName,
            AccountNumber      = dto.AccountNumber,
            BranchCode         = dto.BranchCode
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = customer.Id }, MapToDto(customer, 0, 0));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Owner,Manager")]
    public async Task<ActionResult<CustomerDto>> Update(Guid id, UpdateCustomerDto dto)
    {
        var c = await _db.Customers.FindAsync(id);
        if (c == null) return NotFound();

        c.ContactPerson = dto.ContactPerson;
        c.ContactNumber = dto.ContactNumber;
        c.Email         = dto.Email;
        c.Address       = dto.Address;
        c.City          = dto.City;
        c.Province      = dto.Province;
        c.BankName      = dto.BankName;
        c.AccountNumber = dto.AccountNumber;
        c.BranchCode    = dto.BranchCode;
        c.IsActive      = dto.IsActive;

        await _db.SaveChangesAsync();

        var tickets = await _db.OutboundTickets
            .Where(t => t.CustomerId == c.Id && t.Status == TicketStatus.Completed)
            .ToListAsync();

        return Ok(MapToDto(c, tickets.Count, tickets.Sum(t => t.TotalPrice)));
    }

    private static CustomerDto MapToDto(Customer c, int totalTickets, decimal totalValue) => new()
    {
        Id                 = c.Id,
        CompanyName        = c.CompanyName,
        TradingAs          = c.TradingAs,
        RegistrationNumber = c.RegistrationNumber,
        ContactPerson      = c.ContactPerson,
        ContactNumber      = c.ContactNumber,
        Email              = c.Email,
        City               = c.City,
        IsActive           = c.IsActive,
        TotalTickets       = totalTickets,
        TotalValue         = totalValue
    };
}
