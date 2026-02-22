using Microsoft.EntityFrameworkCore;
using ScrapFlow.Application.DTOs;
using ScrapFlow.Application.Interfaces;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly ScrapFlowDbContext _db;

    public DashboardService(ScrapFlowDbContext db) => _db = db;

    public async Task<DashboardDto> GetDashboardAsync(Guid? siteId = null)
    {
        var today = DateTime.UtcNow.Date;
        var weekStart = today.AddDays(-7);

        var inboundQuery = _db.InboundTickets.AsQueryable();
        var outboundQuery = _db.OutboundTickets.AsQueryable();
        var inventoryQuery = _db.InventoryLots.AsQueryable();

        if (siteId.HasValue)
        {
            inboundQuery = inboundQuery.Where(t => t.SiteId == siteId.Value);
            outboundQuery = outboundQuery.Where(t => t.SiteId == siteId.Value);
            inventoryQuery = inventoryQuery.Where(l => l.SiteId == siteId.Value);
        }

        var completedInbound = inboundQuery.Where(t => t.Status == TicketStatus.Completed);

        var dto = new DashboardDto
        {
            TodayTonnageIn = await completedInbound.Where(t => t.CompletedAt.HasValue && t.CompletedAt.Value.Date == today).SumAsync(t => t.NetWeight ?? 0) / 1000,
            WeekTonnageIn = await completedInbound.Where(t => t.CompletedAt.HasValue && t.CompletedAt.Value.Date >= weekStart).SumAsync(t => t.NetWeight ?? 0) / 1000,
            TodayTonnageOut = await outboundQuery.Where(t => t.Status == TicketStatus.Completed && t.CompletedAt.HasValue && t.CompletedAt.Value.Date == today).SumAsync(t => t.NetWeight ?? 0) / 1000,
            WeekTonnageOut = await outboundQuery.Where(t => t.Status == TicketStatus.Completed && t.CompletedAt.HasValue && t.CompletedAt.Value.Date >= weekStart).SumAsync(t => t.NetWeight ?? 0) / 1000,
            TotalInventoryWeight = await inventoryQuery.Where(l => l.Status == LotStatus.InStock).SumAsync(l => l.Quantity) / 1000,
            TotalInventoryValue = await inventoryQuery.Where(l => l.Status == LotStatus.InStock).SumAsync(l => l.Quantity / 1000 * l.WeightedAvgCost),
            ActiveTickets = await inboundQuery.Where(t => t.Status != TicketStatus.Completed && t.Status != TicketStatus.Cancelled).CountAsync(),
            ComplianceIssues = await _db.ComplianceRecords.CountAsync(cr => !cr.IsFullyCompliant),
            SuppliersCount = await _db.Suppliers.CountAsync()
        };

        // Daily tonnage for last 30 days
        var thirtyDaysAgo = today.AddDays(-30);
        var dailyData = await completedInbound
            .Where(t => t.CompletedAt.HasValue && t.CompletedAt.Value.Date >= thirtyDaysAgo)
            .GroupBy(t => t.CompletedAt!.Value.Date)
            .Select(g => new DailyTonnageDto(
                g.Key.ToString("yyyy-MM-dd"),
                Math.Round(g.Sum(t => t.NetWeight ?? 0) / 1000, 2),
                0
            ))
            .OrderBy(d => d.Date)
            .ToListAsync();
        dto.DailyTonnage = dailyData;

        // Inventory by grade
        dto.InventoryByGrade = await inventoryQuery
            .Where(l => l.Status == LotStatus.InStock)
            .GroupBy(l => new { l.MaterialGrade.Code, l.MaterialGrade.Name, Category = l.MaterialGrade.Category.Name })
            .Select(g => new InventoryByGradeDto(
                g.Key.Code, g.Key.Name, g.Key.Category,
                Math.Round(g.Sum(l => l.Quantity) / 1000, 2),
                Math.Round(g.Sum(l => l.Quantity / 1000 * l.WeightedAvgCost), 2)
            ))
            .OrderByDescending(i => i.Value)
            .ToListAsync();

        // Top 10 suppliers
        dto.TopSuppliers = await completedInbound
            .GroupBy(t => t.Supplier.FullName)
            .Select(g => new TopSupplierDto(
                g.Key,
                Math.Round(g.Sum(t => t.NetWeight ?? 0) / 1000, 2),
                Math.Round(g.Sum(t => t.TotalPrice), 2),
                g.Count()
            ))
            .OrderByDescending(s => s.TotalValue)
            .Take(10)
            .ToListAsync();

        // Margins by grade
        var todayPrices = await _db.DailyPrices
            .Include(dp => dp.MaterialGrade)
            .Where(dp => dp.EffectiveDate == today)
            .ToListAsync();

        dto.MarginByGrade = todayPrices.Select(dp => new MarginByGradeDto(
            dp.MaterialGrade.Code,
            dp.BuyPricePerTon,
            dp.SellPricePerTon,
            dp.MarginPercent
        )).OrderByDescending(m => m.MarginPercent).ToList();

        // Calculate overall margin
        if (todayPrices.Any())
        {
            var totalBuy = todayPrices.Sum(p => p.BuyPricePerTon);
            var totalSell = todayPrices.Sum(p => p.SellPricePerTon);
            dto.OverallMarginPercent = totalSell > 0 ? Math.Round((totalSell - totalBuy) / totalSell * 100, 2) : 0;
        }

        // Recent activity
        var recentTickets = await inboundQuery
            .OrderByDescending(t => t.CreatedAt)
            .Take(10)
            .Select(t => new RecentActivityDto(
                "Inbound",
                $"Ticket {t.TicketNumber} – {t.Supplier.FullName} – {t.Status}",
                t.CreatedAt.ToString("HH:mm"),
                null
            ))
            .ToListAsync();
        dto.RecentActivity = recentTickets;

        return dto;
    }
}
