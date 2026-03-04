using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Domain.Entities;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;

    public UsersController(UserManager<AppUser> userManager) => _userManager = userManager;

    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetAll()
    {
        var users = await _userManager.Users
            .Include(u => u.Site)
            .OrderBy(u => u.LastName)
            .ToListAsync();

        var dtos = new List<UserDto>();
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            dtos.Add(new UserDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email ?? "",
                Role = roles.FirstOrDefault(),
                SiteName = u.Site?.Name,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                LastLoginAt = u.LastLoginAt
            });
        }

        return Ok(dtos);
    }

    [HttpPut("{id}/deactivate")]
    public async Task<ActionResult> Deactivate(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        user.IsActive = false;
        var result = await _userManager.UpdateAsync(user);

        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(", ", result.Errors.Select(e => e.Description)) });

        return Ok(new { message = $"User {user.FullName} has been deactivated" });
    }
}
