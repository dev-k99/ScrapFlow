using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Domain.Entities;

namespace ScrapFlow.Infrastructure.Data;

public class ScrapFlowDbContext : IdentityDbContext<AppUser>
{
    public ScrapFlowDbContext(DbContextOptions<ScrapFlowDbContext> options) : base(options) { }

    // Core tables
    public DbSet<Site> Sites => Set<Site>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<MaterialCategory> MaterialCategories => Set<MaterialCategory>();
    public DbSet<MaterialGrade> MaterialGrades => Set<MaterialGrade>();
    public DbSet<DailyPrice> DailyPrices => Set<DailyPrice>();

    // Ticket tables
    public DbSet<InboundTicket> InboundTickets => Set<InboundTicket>();
    public DbSet<OutboundTicket> OutboundTickets => Set<OutboundTicket>();
    public DbSet<TicketLineItem> TicketLineItems => Set<TicketLineItem>();
    public DbSet<TicketPhoto> TicketPhotos => Set<TicketPhoto>();

    // Inventory
    public DbSet<InventoryLot> InventoryLots => Set<InventoryLot>();

    // Compliance & Audit
    public DbSet<ComplianceRecord> ComplianceRecords => Set<ComplianceRecord>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ItacReport> ItacReports => Set<ItacReport>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ===== Site =====
        builder.Entity<Site>(e =>
        {
            e.HasIndex(s => s.Name).IsUnique();
            e.HasQueryFilter(s => !s.IsDeleted);
        });

        // ===== Supplier =====
        builder.Entity<Supplier>(e =>
        {
            e.HasIndex(s => s.IdNumber);
            e.HasIndex(s => s.FullName);
            e.HasQueryFilter(s => !s.IsDeleted);
            e.Property(s => s.IdType).HasConversion<string>();
        });

        // ===== Customer =====
        builder.Entity<Customer>(e =>
        {
            e.HasIndex(c => c.CompanyName);
            e.HasQueryFilter(c => !c.IsDeleted);
        });

        // ===== AppUser =====
        builder.Entity<AppUser>(e =>
        {
            e.HasOne(u => u.Site)
                .WithMany()
                .HasForeignKey(u => u.SiteId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ===== MaterialCategory =====
        builder.Entity<MaterialCategory>(e =>
        {
            e.HasIndex(mc => mc.Name).IsUnique();
            e.HasQueryFilter(mc => !mc.IsDeleted);
        });

        // ===== MaterialGrade =====
        builder.Entity<MaterialGrade>(e =>
        {
            e.HasIndex(mg => mg.Code).IsUnique();
            e.HasQueryFilter(mg => !mg.IsDeleted);
            e.Property(mg => mg.DefaultBuyPrice).HasPrecision(18, 2);
            e.Property(mg => mg.DefaultSellPrice).HasPrecision(18, 2);
            e.Property(mg => mg.Unit).HasConversion<string>();

            e.HasOne(mg => mg.Category)
                .WithMany(mc => mc.Grades)
                .HasForeignKey(mg => mg.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== DailyPrice =====
        builder.Entity<DailyPrice>(e =>
        {
            e.HasIndex(dp => new { dp.MaterialGradeId, dp.EffectiveDate }).IsUnique();
            e.Property(dp => dp.BuyPricePerTon).HasPrecision(18, 2);
            e.Property(dp => dp.SellPricePerTon).HasPrecision(18, 2);
            e.Ignore(dp => dp.MarginPerTon);
            e.Ignore(dp => dp.MarginPercent);

            e.HasOne(dp => dp.MaterialGrade)
                .WithMany(mg => mg.DailyPrices)
                .HasForeignKey(dp => dp.MaterialGradeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== InboundTicket =====
        builder.Entity<InboundTicket>(e =>
        {
            e.HasIndex(t => t.TicketNumber).IsUnique();
            e.HasQueryFilter(t => !t.IsDeleted);
            e.Property(t => t.Status).HasConversion<string>();
            e.Property(t => t.PaymentMethod).HasConversion<string>();
            e.Property(t => t.GrossWeight).HasPrecision(18, 2);
            e.Property(t => t.TareWeight).HasPrecision(18, 2);
            e.Property(t => t.NetWeight).HasPrecision(18, 2);
            e.Property(t => t.TotalPrice).HasPrecision(18, 2);

            e.HasOne(t => t.Supplier)
                .WithMany(s => s.InboundTickets)
                .HasForeignKey(t => t.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(t => t.Site)
                .WithMany(s => s.InboundTickets)
                .HasForeignKey(t => t.SiteId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== OutboundTicket =====
        builder.Entity<OutboundTicket>(e =>
        {
            e.HasIndex(t => t.TicketNumber).IsUnique();
            e.HasQueryFilter(t => !t.IsDeleted);
            e.Property(t => t.Status).HasConversion<string>();
            e.Property(t => t.GrossWeight).HasPrecision(18, 2);
            e.Property(t => t.TareWeight).HasPrecision(18, 2);
            e.Property(t => t.NetWeight).HasPrecision(18, 2);
            e.Property(t => t.TotalPrice).HasPrecision(18, 2);

            e.HasOne(t => t.Customer)
                .WithMany(c => c.OutboundTickets)
                .HasForeignKey(t => t.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(t => t.Site)
                .WithMany(s => s.OutboundTickets)
                .HasForeignKey(t => t.SiteId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== TicketLineItem =====
        builder.Entity<TicketLineItem>(e =>
        {
            e.Property(li => li.NetWeight).HasPrecision(18, 2);
            e.Property(li => li.PricePerTon).HasPrecision(18, 2);
            e.Property(li => li.LineTotal).HasPrecision(18, 2);

            e.HasOne(li => li.InboundTicket)
                .WithMany(t => t.LineItems)
                .HasForeignKey(li => li.InboundTicketId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(li => li.OutboundTicket)
                .WithMany(t => t.LineItems)
                .HasForeignKey(li => li.OutboundTicketId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(li => li.MaterialGrade)
                .WithMany(mg => mg.TicketLineItems)
                .HasForeignKey(li => li.MaterialGradeId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== TicketPhoto =====
        builder.Entity<TicketPhoto>(e =>
        {
            e.Property(tp => tp.PhotoType).HasConversion<string>();

            e.HasOne(tp => tp.InboundTicket)
                .WithMany(t => t.Photos)
                .HasForeignKey(tp => tp.InboundTicketId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(tp => tp.OutboundTicket)
                .WithMany(t => t.Photos)
                .HasForeignKey(tp => tp.OutboundTicketId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== ComplianceRecord =====
        builder.Entity<ComplianceRecord>(e =>
        {
            e.HasIndex(cr => cr.InboundTicketId).IsUnique();
            e.Property(cr => cr.IdVerificationMethod).HasConversion<string>();

            e.HasOne(cr => cr.InboundTicket)
                .WithOne(t => t.ComplianceRecord)
                .HasForeignKey<ComplianceRecord>(cr => cr.InboundTicketId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ===== InventoryLot =====
        builder.Entity<InventoryLot>(e =>
        {
            e.HasIndex(il => il.LotNumber).IsUnique();
            e.HasQueryFilter(il => !il.IsDeleted);
            e.Property(il => il.Status).HasConversion<string>();
            e.Property(il => il.Quantity).HasPrecision(18, 2);
            e.Property(il => il.OriginalQuantity).HasPrecision(18, 2);
            e.Property(il => il.WeightedAvgCost).HasPrecision(18, 2);

            e.HasOne(il => il.MaterialGrade)
                .WithMany(mg => mg.InventoryLots)
                .HasForeignKey(il => il.MaterialGradeId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(il => il.Site)
                .WithMany(s => s.InventoryLots)
                .HasForeignKey(il => il.SiteId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ===== AuditLog =====
        builder.Entity<AuditLog>(e =>
        {
            e.HasIndex(al => al.EntityName);
            e.HasIndex(al => al.EntityId);
            e.HasIndex(al => al.Timestamp);
            e.HasIndex(al => al.UserId);
        });

        // ===== ItacReport =====
        builder.Entity<ItacReport>(e =>
        {
            e.HasIndex(ir => new { ir.ReportYear, ir.ReportMonth }).IsUnique();
            e.Property(ir => ir.Status).HasConversion<string>();
            e.Property(ir => ir.TotalAcquisitionTonnage).HasPrecision(18, 2);
            e.Property(ir => ir.TotalAcquisitionValue).HasPrecision(18, 2);
            e.Property(ir => ir.TotalDisposalTonnage).HasPrecision(18, 2);
            e.Property(ir => ir.TotalDisposalValue).HasPrecision(18, 2);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<Domain.Common.BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
