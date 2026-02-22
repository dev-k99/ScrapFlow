using Microsoft.Extensions.Logging;
using ScrapFlow.Application.Interfaces;

namespace ScrapFlow.Infrastructure.Services;

public class NotificationService
{
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(ILogger<NotificationService> logger)
    {
        _logger = logger;
    }

    public async Task SendWhatsAppNotificationAsync(string phoneNumber, string message)
    {
        // In a real production environment, this would call Twilio, Infobip, or a local SA provider.
        // For the portfolio demo, we log the action and simulate a delay.
        _logger.LogInformation("WHATSAPP NOTIFICATION to {PhoneNumber}: {Message}", phoneNumber, message);
        await Task.Delay(500); // Simulate API call
    }

    public async Task SendTicketConfirmationAsync(string supplierName, string ticketNumber, decimal totalValue, string phoneNumber)
    {
        var message = $"Hello {supplierName}, your ScrapFlow ticket {ticketNumber} has been finalized. Total value: R{totalValue:N2}. Paid via EFT to your registered account. Thank you!";
        await SendWhatsAppNotificationAsync(phoneNumber, message);
    }
}
