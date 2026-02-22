using ScrapFlow.Application.DTOs;

namespace ScrapFlow.Application.Interfaces;

public interface ITicketService
{
    Task<InboundTicketResponseDto> CreateInboundTicketAsync(CreateInboundTicketDto dto, string userId);
    Task<InboundTicketResponseDto> RecordGrossWeightAsync(Guid ticketId, RecordGrossWeightDto dto, string userId);
    Task<InboundTicketResponseDto> RecordGradingAsync(Guid ticketId, RecordGradingDto dto, string userId);
    Task<InboundTicketResponseDto> RecordTareWeightAsync(Guid ticketId, RecordTareWeightDto dto, string userId);
    Task<InboundTicketResponseDto> RecordPaymentAsync(Guid ticketId, RecordPaymentDto dto, string userId);
    Task<InboundTicketResponseDto> CompleteTicketAsync(Guid ticketId, CompleteTicketDto dto, string userId);
    Task<InboundTicketResponseDto?> GetTicketAsync(Guid ticketId);
    Task<List<InboundTicketResponseDto>> GetTicketsAsync(Guid? siteId = null, string? status = null, int page = 1, int pageSize = 20);
}

public interface IMaterialService
{
    Task<List<MaterialGradeDto>> GetAllGradesAsync();
    Task<MaterialGradeDto?> GetGradeAsync(Guid id);
    Task UpdateDailyPricesAsync(List<UpdateDailyPriceDto> prices, string userId);
    Task<List<MarginByGradeDto>> GetMarginsAsync();
}

public interface IDashboardService
{
    Task<DashboardDto> GetDashboardAsync(Guid? siteId = null);
}

public interface ISupplierService
{
    Task<List<SupplierDto>> GetSuppliersAsync(string? search = null);
    Task<SupplierDto?> GetSupplierAsync(Guid id);
    Task<SupplierDto> CreateSupplierAsync(CreateSupplierDto dto);
}
