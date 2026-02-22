using Microsoft.AspNetCore.SignalR;

namespace ScrapFlow.API.Hubs;

public class InventoryHub : Hub
{
    public async Task JoinSiteGroup(string siteId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"site-{siteId}");
        await Clients.Caller.SendAsync("Joined", $"Connected to site {siteId}");
    }

    public async Task LeaveSiteGroup(string siteId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"site-{siteId}");
    }

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "all");
        await base.OnConnectedAsync();
    }
}
