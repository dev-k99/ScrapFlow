using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using ScrapFlow.API.Controllers;
using ScrapFlow.API.Hubs;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Tests;

public class OutboundTicketsControllerTests : IAsyncLifetime
{
    private Infrastructure.Data.ScrapFlowDbContext _db = null!;
    private OutboundTicketsController _controller = null!;
    private Domain.Entities.Site _site = null!;
    private Domain.Entities.Customer _customer = null!;
    private Domain.Entities.MaterialGrade _grade = null!;

    public async Task InitializeAsync()
    {
        var (db, site, _, customer, grade) = await TestDbFactory.CreateWithSeedAsync();
        _db = db;
        _site = site;
        _customer = customer;
        _grade = grade;
        var mockHub     = new Mock<IHubContext<InventoryHub>>();
        var mockClients = new Mock<IHubClients>();
        var mockProxy   = new Mock<IClientProxy>();
        mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(mockProxy.Object);
        mockHub.Setup(h => h.Clients).Returns(mockClients.Object);
        var mockWebhook = new Mock<IWebhookService>();
        _controller = new OutboundTicketsController(_db, mockHub.Object, mockWebhook.Object);
        SetFakeUser(_controller);
    }

    public Task DisposeAsync()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
        return Task.CompletedTask;
    }

    // ===== CREATE =====

    [Fact]
    public async Task Create_ReturnsCreated_WithTicketNumber()
    {
        var dto = new CreateOutboundTicketDto(_customer.Id, _site.Id, "Test outbound");
        var result = await _controller.Create(dto);
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var ticket = Assert.IsType<OutboundTicketResponseDto>(created.Value);

        Assert.StartsWith("OUT-", ticket.TicketNumber);
        Assert.Equal(TicketStatus.Created.ToString(), ticket.Status);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenCustomerNotFound()
    {
        var dto = new CreateOutboundTicketDto(Guid.NewGuid(), _site.Id, null);
        var result = await _controller.Create(dto);
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenSiteNotFound()
    {
        var dto = new CreateOutboundTicketDto(_customer.Id, Guid.NewGuid(), null);
        var result = await _controller.Create(dto);
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    // ===== GET ALL =====

    [Fact]
    public async Task GetAll_ReturnsTickets_ForSite()
    {
        await CreateTicket();
        var result = await _controller.GetAll(_site.Id, null);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var list = Assert.IsType<PagedResult<OutboundTicketResponseDto>>(ok.Value).Items;
        Assert.Single(list);
    }

    // ===== GET BY ID =====

    [Fact]
    public async Task Get_ReturnsTicket_WhenFound()
    {
        var ticket = await CreateTicket();
        var result = await _controller.Get(ticket.Id);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<OutboundTicketResponseDto>(ok.Value);
        Assert.Equal(ticket.Id, dto.Id);
    }

    [Fact]
    public async Task Get_ReturnsNotFound_ForUnknownId()
    {
        var result = await _controller.Get(Guid.NewGuid());
        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ===== FULL WORKFLOW =====

    [Fact]
    public async Task FullWorkflow_CompletesSuccessfully()
    {
        // Create
        var created = await CreateTicket();
        Assert.Equal(TicketStatus.Created.ToString(), created.Status);

        // Gross weight
        var afterGross = await _controller.RecordGrossWeight(
            created.Id, new RecordOutboundGrossWeightDto(8000));
        var okGross = Assert.IsType<OkObjectResult>(afterGross.Result);
        var grossDto = Assert.IsType<OutboundTicketResponseDto>(okGross.Value);
        Assert.Equal(TicketStatus.GrossWeighed.ToString(), grossDto.Status);
        Assert.Equal(8000, grossDto.GrossWeight);

        // Grading
        var gradingDto = new RecordOutboundGradingDto(new List<GradingLineItemDto>
        {
            new(_grade.Id, 7500, "Good HMS", 90)
        });
        var afterGrading = await _controller.RecordGrading(created.Id, gradingDto);
        var okGrading = Assert.IsType<OkObjectResult>(afterGrading.Result);
        var gradingResult = Assert.IsType<OutboundTicketResponseDto>(okGrading.Value);
        Assert.Equal(TicketStatus.Graded.ToString(), gradingResult.Status);
        Assert.Single(gradingResult.LineItems);

        // Tare weight
        var afterTare = await _controller.RecordTareWeight(
            created.Id, new RecordOutboundTareWeightDto(500));
        var okTare = Assert.IsType<OkObjectResult>(afterTare.Result);
        var tareDto = Assert.IsType<OutboundTicketResponseDto>(okTare.Value);
        Assert.Equal(TicketStatus.TareWeighed.ToString(), tareDto.Status);
        Assert.Equal(7500, tareDto.NetWeight);

        // Complete
        var afterComplete = await _controller.Complete(
            created.Id, new CompleteOutboundTicketDto("INV-2026-001", null));
        var okComplete = Assert.IsType<OkObjectResult>(afterComplete.Result);
        var completeDto = Assert.IsType<OutboundTicketResponseDto>(okComplete.Value);
        Assert.Equal(TicketStatus.Completed.ToString(), completeDto.Status);
        Assert.Equal("INV-2026-001", completeDto.InvoiceNumber);
        Assert.NotNull(completeDto.CompletedAt);
    }

    [Fact]
    public async Task RecordGrossWeight_ReturnsUnprocessable_WhenStatusIsWrong()
    {
        var ticket = await CreateTicket();
        // Advance to GrossWeighed first
        await _controller.RecordGrossWeight(ticket.Id, new RecordOutboundGrossWeightDto(5000));

        // Try again — should fail
        var result = await _controller.RecordGrossWeight(ticket.Id, new RecordOutboundGrossWeightDto(6000));
        Assert.IsType<UnprocessableEntityObjectResult>(result.Result);
    }

    [Fact]
    public async Task RecordTareWeight_ReturnsUnprocessable_WhenTareExceedsGross()
    {
        var ticket = await CreateTicketAtGraded();
        var result = await _controller.RecordTareWeight(ticket.Id, new RecordOutboundTareWeightDto(9999));
        Assert.IsType<UnprocessableEntityObjectResult>(result.Result);
    }

    [Fact]
    public async Task RecordGrading_ReturnsBadRequest_WhenMaterialGradeNotFound()
    {
        var ticket = await CreateTicket();
        await _controller.RecordGrossWeight(ticket.Id, new RecordOutboundGrossWeightDto(5000));

        var badDto = new RecordOutboundGradingDto(new List<GradingLineItemDto>
        {
            new(Guid.NewGuid(), 4500, null, 100)
        });
        var result = await _controller.RecordGrading(ticket.Id, badDto);
        Assert.IsType<BadRequestObjectResult>(result.Result);
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

    private async Task<OutboundTicketResponseDto> CreateTicket()
    {
        var result = await _controller.Create(
            new CreateOutboundTicketDto(_customer.Id, _site.Id, null));
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        return Assert.IsType<OutboundTicketResponseDto>(created.Value);
    }

    private async Task<OutboundTicketResponseDto> CreateTicketAtGraded()
    {
        var ticket = await CreateTicket();

        await _controller.RecordGrossWeight(ticket.Id, new RecordOutboundGrossWeightDto(5000));
        await _controller.RecordGrading(ticket.Id, new RecordOutboundGradingDto(
            new List<GradingLineItemDto> { new(_grade.Id, 4500, null, 100) }));

        var db = await _db.OutboundTickets.FindAsync(ticket.Id);
        return new OutboundTicketResponseDto { Id = ticket.Id, Status = db!.Status.ToString() };
    }
}
