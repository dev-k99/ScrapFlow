using Microsoft.AspNetCore.Mvc;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService) => _dashboardService = dashboardService;

    [HttpGet]
    public async Task<ActionResult<DashboardDto>> GetDashboard([FromQuery] Guid? siteId)
    {
        return Ok(await _dashboardService.GetDashboardAsync(siteId));
    }
}
