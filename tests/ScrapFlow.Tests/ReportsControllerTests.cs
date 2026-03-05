using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.API.Controllers;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Tests;

public class ReportsControllerTests : IAsyncLifetime
{
    private Infrastructure.Data.ScrapFlowDbContext _db = null!;
    private ReportsController _controller = null!;
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
        _controller = new ReportsController(_db);
        SetFakeUser(_controller);
    }

    public Task DisposeAsync()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
        return Task.CompletedTask;
    }

    // ===== GET ALL =====

    [Fact]
    public async Task GetAll_ReturnsEmpty_WhenNoReports()
    {
        var result = await _controller.GetAll();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<ItacReportDto>>(ok.Value).ToList();
        Assert.Empty(list);
    }

    [Fact]
    public async Task GetAll_ReturnsReports_OrderedDescending()
    {
        _db.ItacReports.AddRange(
            new ItacReport { ReportYear = 2025, ReportMonth = 6, Status = ReportStatus.Generated },
            new ItacReport { ReportYear = 2026, ReportMonth = 1, Status = ReportStatus.Generated }
        );
        await _db.SaveChangesAsync();

        var result = await _controller.GetAll();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsAssignableFrom<IEnumerable<ItacReportDto>>(ok.Value).ToList();

        Assert.Equal(2026, list[0].ReportYear); // most recent first
        Assert.Equal(2025, list[1].ReportYear);
    }

    // ===== GENERATE =====

    [Fact]
    public async Task Generate_CreatesReport_WithAggregatedTotals()
    {
        await SeedCompletedTickets(2026, 1, 3); // 3 tickets in Jan 2026

        var result = await _controller.Generate(new GenerateReportDto(2026, 1, null));
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<ItacReportDto>(created.Value);

        Assert.Equal(2026, dto.ReportYear);
        Assert.Equal(1, dto.ReportMonth);
        Assert.Equal(ReportStatus.Generated.ToString(), dto.Status);
        Assert.True(dto.TotalAcquisitionTonnage > 0);
        Assert.True(dto.TotalAcquisitionValue > 0);
    }

    [Fact]
    public async Task Generate_ReturnsConflict_WhenReportAlreadyExists()
    {
        _db.ItacReports.Add(new ItacReport
        {
            ReportYear = 2026, ReportMonth = 2, Status = ReportStatus.Generated
        });
        await _db.SaveChangesAsync();

        var result = await _controller.Generate(new GenerateReportDto(2026, 2, null));
        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task Generate_ReturnsBadRequest_WhenInvalidMonth()
    {
        var result = await _controller.Generate(new GenerateReportDto(2026, 13, null));
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Generate_ReturnsBadRequest_WhenInvalidYear()
    {
        var result = await _controller.Generate(new GenerateReportDto(1990, 1, null));
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // ===== GET BY ID =====

    [Fact]
    public async Task Get_ReturnsReport_WhenFound()
    {
        var report = new ItacReport
        {
            ReportYear = 2026, ReportMonth = 3, Status = ReportStatus.Generated
        };
        _db.ItacReports.Add(report);
        await _db.SaveChangesAsync();

        var result = await _controller.Get(report.Id);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ItacReportDto>(ok.Value);
        Assert.Equal(3, dto.ReportMonth);
    }

    [Fact]
    public async Task Get_ReturnsNotFound_ForUnknownId()
    {
        var result = await _controller.Get(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ===== SUBMIT =====

    [Fact]
    public async Task Submit_ChangesStatusToSubmitted()
    {
        var report = new ItacReport
        {
            ReportYear = 2026, ReportMonth = 4, Status = ReportStatus.Generated
        };
        _db.ItacReports.Add(report);
        await _db.SaveChangesAsync();

        var result = await _controller.Submit(report.Id);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<ItacReportDto>(ok.Value);

        Assert.Equal(ReportStatus.Submitted.ToString(), dto.Status);
        Assert.NotNull(dto.SubmittedAt);
    }

    [Fact]
    public async Task Submit_ReturnsConflict_WhenAlreadySubmitted()
    {
        var report = new ItacReport
        {
            ReportYear = 2026, ReportMonth = 5,
            Status = ReportStatus.Submitted,
            SubmittedAt = DateTime.UtcNow
        };
        _db.ItacReports.Add(report);
        await _db.SaveChangesAsync();

        var result = await _controller.Submit(report.Id);
        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    // ===== DOWNLOAD CSV =====

    [Fact]
    public async Task DownloadCsv_ReturnsFileResult_WithCsvContentType()
    {
        await SeedCompletedTickets(2026, 1, 1);
        var genResult = await _controller.Generate(new GenerateReportDto(2026, 1, null));
        var created = Assert.IsType<CreatedAtActionResult>(genResult.Result);
        var dto = Assert.IsType<ItacReportDto>(created.Value);

        var result = await _controller.DownloadCsv(dto.Id);
        var file = Assert.IsType<FileContentResult>(result);

        Assert.Equal("text/csv", file.ContentType);
        Assert.StartsWith("ITAC_2026_01", file.FileDownloadName);

        var content = System.Text.Encoding.UTF8.GetString(file.FileContents);
        Assert.Contains("ITAC Monthly Scrap Metal Report", content);
        Assert.Contains("TicketNumber", content);
    }

    [Fact]
    public async Task DownloadCsv_ReturnsNotFound_ForUnknownId()
    {
        var result = await _controller.DownloadCsv(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result);
    }

    // ===== HELPERS =====

    private static void SetFakeUser(ControllerBase controller)
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "test-user-id")
        }, "test"));
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };
    }

    private async Task SeedCompletedTickets(int year, int month, int count)
    {
        var completedAt = new DateTime(year, month, 15, 10, 0, 0, DateTimeKind.Utc);

        for (int i = 0; i < count; i++)
        {
            var ticket = new InboundTicket
            {
                TicketNumber = $"INB-{year}{month:D2}-{i + 1:D4}",
                SupplierId = _supplier.Id,
                SiteId = _site.Id,
                Status = TicketStatus.Completed,
                GrossWeight = 5000,
                TareWeight = 1000,
                NetWeight = 4000,
                TotalPrice = 8800,
                PaymentReference = $"EFT-{i + 1:D4}",
                CompletedAt = completedAt,
                ComplianceRecord = new ComplianceRecord { IdVerified = true, IsFullyCompliant = true }
            };

            _db.InboundTickets.Add(ticket);
            await _db.SaveChangesAsync();

            _db.TicketLineItems.Add(new TicketLineItem
            {
                InboundTicketId = ticket.Id,
                MaterialGradeId = _grade.Id,
                NetWeight = 4000,
                PricePerTon = 2200,
                LineTotal = 8800
            });
        }
        await _db.SaveChangesAsync();
    }
}
