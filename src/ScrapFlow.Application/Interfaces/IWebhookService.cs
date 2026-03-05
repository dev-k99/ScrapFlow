namespace ScrapFlow.Application.Interfaces;

public interface IWebhookService
{
    Task FireAsync(string eventName, object payload);
}
