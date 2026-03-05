using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService) => _dashboardService = dashboardService;

    [HttpGet]
    public async Task<ActionResult<DashboardDto>> GetDashboard(
        [FromQuery] Guid?   siteId,
        [FromQuery] string? range = "7d")
    {
        return Ok(await _dashboardService.GetDashboardAsync(siteId, range));
    }
}
