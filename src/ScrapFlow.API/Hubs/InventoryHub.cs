using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ScrapFlow.API.Hubs;

[Authorize]
public class InventoryHub : Hub
{
    public async Task JoinSiteGroup(string siteId)
    {
        // Validate siteId is a well-formed GUID to prevent group-name injection
        if (!Guid.TryParse(siteId, out _))
        {
            await Clients.Caller.SendAsync("Error", "Invalid siteId format");
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"site-{siteId}");
        await Clients.Caller.SendAsync("Joined", $"Connected to site {siteId}");
    }

    public async Task LeaveSiteGroup(string siteId)
    {
        if (!Guid.TryParse(siteId, out _)) return;

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"site-{siteId}");
    }

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "all");
        await base.OnConnectedAsync();
    }
}
