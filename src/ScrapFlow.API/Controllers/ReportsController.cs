using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/reports/itac")]
public class ReportsController : ControllerBase
{
    private readonly ScrapFlowDbContext _db;

    public ReportsController(ScrapFlowDbContext db) => _db = db;

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "system";

    [HttpGet]
    public async Task<ActionResult<List<ItacReportDto>>> GetAll()
    {
        var reports = await _db.ItacReports
            .OrderByDescending(r => r.ReportYear)
            .ThenByDescending(r => r.ReportMonth)
            .ToListAsync();

        return Ok(reports.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ItacReportDto>> Get(Guid id)
    {
        var report = await _db.ItacReports.FindAsync(id);
        return report == null ? NotFound() : Ok(MapToDto(report));
    }

    [HttpPost("generate")]
    public async Task<ActionResult<ItacReportDto>> Generate(GenerateReportDto dto)
    {
        // Validate year/month
        if (dto.Year < 2020 || dto.Year > DateTime.UtcNow.Year + 1)
            return BadRequest(new { message = "Invalid year" });
        if (dto.Month < 1 || dto.Month > 12)
            return BadRequest(new { message = "Invalid month (1-12)" });

        // Check for existing report
        var existing = await _db.ItacReports
            .FirstOrDefaultAsync(r => r.ReportYear == dto.Year && r.ReportMonth == dto.Month);
        if (existing != null)
            return Conflict(new { message = $"Report for {dto.Year}/{dto.Month:D2} already exists", reportId = existing.Id });

        // Aggregate from completed inbound tickets for that month
        var start = new DateTime(dto.Year, dto.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);

        var inboundTickets = await _db.InboundTickets
            .Include(t => t.LineItems)
            .Where(t => t.Status == TicketStatus.Completed
                     && t.CompletedAt >= start && t.CompletedAt < end)
            .ToListAsync();

        var outboundTickets = await _db.OutboundTickets
            .Include(t => t.LineItems)
            .Where(t => t.Status == TicketStatus.Completed
                     && t.CompletedAt >= start && t.CompletedAt < end)
            .ToListAsync();

        var report = new ItacReport
        {
            ReportYear = dto.Year,
            ReportMonth = dto.Month,
            Status = ReportStatus.Generated,
            GeneratedAt = DateTime.UtcNow,
            GeneratedByUserId = UserId,
            Notes = dto.Notes,
            TotalAcquisitionTonnage = inboundTickets.Sum(t => (t.NetWeight ?? 0) / 1000),
            TotalAcquisitionValue = inboundTickets.Sum(t => t.TotalPrice),
            TotalDisposalTonnage = outboundTickets.Sum(t => (t.NetWeight ?? 0) / 1000),
            TotalDisposalValue = outboundTickets.Sum(t => t.TotalPrice)
        };

        _db.ItacReports.Add(report);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = report.Id }, MapToDto(report));
    }

    [HttpPost("{id}/submit")]
    public async Task<ActionResult<ItacReportDto>> Submit(Guid id)
    {
        var report = await _db.ItacReports.FindAsync(id);
        if (report == null) return NotFound();
        if (report.Status == ReportStatus.Submitted)
            return Conflict(new { message = "Report has already been submitted" });

        report.Status = ReportStatus.Submitted;
        report.SubmittedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(MapToDto(report));
    }

    [HttpGet("{id}/csv")]
    public async Task<ActionResult> DownloadCsv(Guid id)
    {
        var report = await _db.ItacReports.FindAsync(id);
        if (report == null) return NotFound();

        var start = new DateTime(report.ReportYear, report.ReportMonth, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = start.AddMonths(1);

        var inboundTickets = await _db.InboundTickets
            .Include(t => t.Supplier)
            .Include(t => t.LineItems).ThenInclude(li => li.MaterialGrade)
            .Where(t => t.Status == TicketStatus.Completed
                     && t.CompletedAt >= start && t.CompletedAt < end)
            .OrderBy(t => t.CompletedAt)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("ITAC Monthly Acquisition Report");
        sb.AppendLine($"Period,{report.ReportYear}/{report.ReportMonth:D2}");
        sb.AppendLine($"Generated,{report.GeneratedAt:yyyy-MM-dd HH:mm}");
        sb.AppendLine($"Status,{report.Status}");
        sb.AppendLine();
        sb.AppendLine("TicketNumber,Date,SupplierName,SupplierId,Material,NetWeightKg,PricePerTon,LineTotal");

        foreach (var ticket in inboundTickets)
        {
            foreach (var li in ticket.LineItems)
            {
                sb.AppendLine(string.Join(",",
                    ticket.TicketNumber,
                    ticket.CompletedAt?.ToString("yyyy-MM-dd"),
                    $"\"{ticket.Supplier?.FullName}\"",
                    ticket.Supplier?.IdNumber,
                    $"\"{li.MaterialGrade?.Name}\"",
                    li.NetWeight,
                    li.PricePerTon,
                    li.LineTotal));
            }
        }

        sb.AppendLine();
        sb.AppendLine($"Total Acquisition Tonnage (ton),{report.TotalAcquisitionTonnage:F3}");
        sb.AppendLine($"Total Acquisition Value (ZAR),{report.TotalAcquisitionValue:F2}");

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        var fileName = $"ITAC_{report.ReportYear}_{report.ReportMonth:D2}.csv";
        return File(bytes, "text/csv", fileName);
    }

    private static ItacReportDto MapToDto(ItacReport r) => new()
    {
        Id = r.Id,
        ReportYear = r.ReportYear,
        ReportMonth = r.ReportMonth,
        Status = r.Status.ToString(),
        TotalAcquisitionTonnage = r.TotalAcquisitionTonnage,
        TotalAcquisitionValue = r.TotalAcquisitionValue,
        TotalDisposalTonnage = r.TotalDisposalTonnage,
        TotalDisposalValue = r.TotalDisposalValue,
        GeneratedAt = r.GeneratedAt,
        SubmittedAt = r.SubmittedAt,
        Notes = r.Notes
    };
}
