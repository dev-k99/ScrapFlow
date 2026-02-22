using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/tickets/inbound")]
// [Authorize]  // Uncomment when auth is enforced
public class InboundTicketController : ControllerBase
{
    private readonly ITicketService _ticketService;

    public InboundTicketController(ITicketService ticketService) => _ticketService = ticketService;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";

    /// <summary>Step 1: Create a new inbound ticket</summary>
    [HttpPost]
    public async Task<ActionResult<InboundTicketResponseDto>> Create(CreateInboundTicketDto dto)
    {
        try
        {
            var result = await _ticketService.CreateInboundTicketAsync(dto, UserId);
            return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Step 2: Record gross weight</summary>
    [HttpPut("{id}/gross-weight")]
    public async Task<ActionResult<InboundTicketResponseDto>> RecordGrossWeight(Guid id, RecordGrossWeightDto dto)
    {
        try
        {
            return Ok(await _ticketService.RecordGrossWeightAsync(id, dto, UserId));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Step 3: Record grading (material grades & weights)</summary>
    [HttpPut("{id}/grading")]
    public async Task<ActionResult<InboundTicketResponseDto>> RecordGrading(Guid id, RecordGradingDto dto)
    {
        try
        {
            return Ok(await _ticketService.RecordGradingAsync(id, dto, UserId));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Step 4: Record tare weight → auto-calculates net weight + price</summary>
    [HttpPut("{id}/tare-weight")]
    public async Task<ActionResult<InboundTicketResponseDto>> RecordTareWeight(Guid id, RecordTareWeightDto dto)
    {
        try
        {
            return Ok(await _ticketService.RecordTareWeightAsync(id, dto, UserId));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Step 5: Record electronic payment details (CASH BANNED)</summary>
    [HttpPut("{id}/payment")]
    public async Task<ActionResult<InboundTicketResponseDto>> RecordPayment(Guid id, RecordPaymentDto dto)
    {
        try
        {
            return Ok(await _ticketService.RecordPaymentAsync(id, dto, UserId));
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Step 6: Complete ticket (full compliance validation)</summary>
    [HttpPut("{id}/complete")]
    public async Task<ActionResult<InboundTicketResponseDto>> Complete(Guid id, CompleteTicketDto dto)
    {
        try
        {
            return Ok(await _ticketService.CompleteTicketAsync(id, dto, UserId));
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Get single ticket with all details</summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<InboundTicketResponseDto>> Get(Guid id)
    {
        var ticket = await _ticketService.GetTicketAsync(id);
        return ticket == null ? NotFound() : Ok(ticket);
    }

    /// <summary>List tickets with optional filters</summary>
    [HttpGet]
    public async Task<ActionResult<List<InboundTicketResponseDto>>> GetAll(
        [FromQuery] Guid? siteId,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        return Ok(await _ticketService.GetTicketsAsync(siteId, status, page, pageSize));
    }
}
