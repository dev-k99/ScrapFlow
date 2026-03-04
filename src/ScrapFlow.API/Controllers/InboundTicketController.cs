using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ScrapFlow.API.Hubs;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/tickets/inbound")]
[Authorize]
public class InboundTicketController : ControllerBase
{
    private readonly ITicketService _ticketService;
    private readonly IHubContext<InventoryHub> _hub;

    private static readonly string[] AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    private static readonly string[] AllowedMimeTypes  = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    public InboundTicketController(ITicketService ticketService, IHubContext<InventoryHub> hub)
    {
        _ticketService = ticketService;
        _hub = hub;
    }

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

    /// <summary>Step 3: Record grading (material grades and weights)</summary>
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

    /// <summary>Step 4: Record tare weight - auto-calculates net weight + price</summary>
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

    /// <summary>Step 6: Complete ticket - broadcasts TicketCompleted via SignalR</summary>
    [HttpPut("{id}/complete")]
    public async Task<ActionResult<InboundTicketResponseDto>> Complete(Guid id, CompleteTicketDto dto)
    {
        try
        {
            var result = await _ticketService.CompleteTicketAsync(id, dto, UserId);

            if (result.Site != null)
            {
                var group = $"site-{result.Site.Id}";
                await _hub.Clients.Group(group).SendAsync("TicketCompleted", new
                {
                    ticketId     = result.Id,
                    ticketNumber = result.TicketNumber,
                    supplierId   = result.Supplier?.Id,
                    netWeight    = result.NetWeight,
                    totalPrice   = result.TotalPrice
                });
                await _hub.Clients.Group(group).SendAsync("InventoryUpdated", new
                {
                    siteId   = result.Site.Id,
                    source   = "InboundTicket",
                    ticketId = result.Id
                });
            }

            return Ok(result);
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

    /// <summary>List tickets with optional filters - returns PagedResult with pagination metadata</summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<InboundTicketResponseDto>>> GetAll(
        [FromQuery] Guid?     siteId,
        [FromQuery] string?   status,
        [FromQuery] Guid?     supplierId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _ticketService.GetTicketsAsync(siteId, status, page, pageSize);
        return Ok(result);
    }

    /// <summary>Upload a compliance photo for a ticket (multipart/form-data, max 10 MB)</summary>
    [HttpPost("{id}/photos")]
    public async Task<ActionResult> UploadPhoto(Guid id, [FromForm] IFormFile file, [FromForm] string photoType)
    {
        var ticket = await _ticketService.GetTicketAsync(id);
        if (ticket == null) return NotFound();

        if (!Enum.TryParse<ScrapFlow.Domain.Enums.PhotoType>(photoType, ignoreCase: true, out var parsedType))
            return BadRequest(new { message = $"Invalid photoType '{photoType}'. Allowed: SellerFace, MaterialLoad, IdDocument" });

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { message = $"File exceeds 10 MB limit ({file.Length / 1024 / 1024} MB received)" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { message = $"File type '{ext}' not allowed. Use: jpg, png, webp, gif" });

        if (!AllowedMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
            return BadRequest(new { message = $"MIME type '{file.ContentType}' not allowed" });

        var uploads = Path.Combine("wwwroot", "photos", id.ToString());
        Directory.CreateDirectory(uploads);

        // Safe filename - no user-supplied path components
        var safeFileName = $"{parsedType}_{Guid.NewGuid()}{ext}";
        var filePath     = Path.Combine(uploads, safeFileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream);

        var relativePath = $"photos/{id}/{safeFileName}";
        await _ticketService.AddPhotoAsync(id, parsedType, relativePath, UserId);

        return Ok(new { photoType = parsedType.ToString(), filePath = relativePath });
    }

    /// <summary>Cancel a ticket</summary>
    [HttpPut("{id}/cancel")]
    public async Task<ActionResult<InboundTicketResponseDto>> Cancel(Guid id)
    {
        try
        {
            return Ok(await _ticketService.CancelTicketAsync(id, UserId));
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
}
