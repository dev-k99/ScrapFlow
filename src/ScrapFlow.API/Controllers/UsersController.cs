using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Domain.Entities;

namespace ScrapFlow.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Owner,Manager")]
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
                Id          = u.Id,
                FullName    = u.FullName,
                Email       = u.Email ?? "",
                Role        = roles.FirstOrDefault(),
                SiteName    = u.Site?.Name,
                IsActive    = u.IsActive,
                CreatedAt   = u.CreatedAt,
                LastLoginAt = u.LastLoginAt
            });
        }

        return Ok(dtos);
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateProfile(UpdateProfileDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = await _userManager.FindByIdAsync(userId!);
        if (user == null) return NotFound();

        if (!await _userManager.CheckPasswordAsync(user, dto.CurrentPassword))
            return BadRequest(new { message = "Current password is incorrect" });

        user.FirstName = dto.FirstName;
        user.LastName  = dto.LastName;

        if (!string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var pwResult = await _userManager.ResetPasswordAsync(user, token, dto.NewPassword);
            if (!pwResult.Succeeded)
                return BadRequest(new { message = string.Join(", ", pwResult.Errors.Select(e => e.Description)) });
        }

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            return BadRequest(new { message = string.Join(", ", updateResult.Errors.Select(e => e.Description)) });

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new UserDto
        {
            Id          = user.Id,
            FullName    = user.FullName,
            Email       = user.Email ?? "",
            Role        = roles.FirstOrDefault(),
            SiteName    = null,
            IsActive    = user.IsActive,
            CreatedAt   = user.CreatedAt,
            LastLoginAt = user.LastLoginAt
        });
    }

    [HttpPut("{id}/deactivate")]
    [Authorize(Roles = "Owner")]
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
