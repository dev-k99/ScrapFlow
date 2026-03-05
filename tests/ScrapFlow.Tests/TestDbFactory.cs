using Microsoft.EntityFrameworkCore;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;
using ScrapFlow.Infrastructure.Data;

namespace ScrapFlow.Tests;


/// Creates a fresh in-memory ScrapFlowDbContext for each test.
/// Call SeedBasicData() to get pre-populated Site, Supplier, Customer, and MaterialGrade.
public static class TestDbFactory
{
    public static ScrapFlowDbContext Create(string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<ScrapFlowDbContext>()
            .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
            .Options;
        return new ScrapFlowDbContext(options);
    }

    public static async Task<(ScrapFlowDbContext db, Site site, Supplier supplier,
        Customer customer, MaterialGrade grade)> CreateWithSeedAsync()
    {
        var db = Create();

        var site = new Site
        {
            Id = Guid.NewGuid(),
            Name = "Test Site",
            Address = "1 Test Street",
            City = "Johannesburg",
            IsActive = true
        };

        var supplier = new Supplier
        {
            Id = Guid.NewGuid(),
            FullName = "Sipho Dlamini",
            IdNumber = "8001015009087",
            IdType = IdType.SouthAfricanId,
            IsVerified = true
        };

        var customer = new Customer
        {
            Id = Guid.NewGuid(),
            CompanyName = "Steel Buyers CC",
            ContactPerson = "John Smith",
            ContactNumber = "0118001234",
            IsActive = true
        };

        var category = new MaterialCategory
        {
            Id = Guid.NewGuid(),
            Name = "Ferrous",
            SortOrder = 1
        };

        var grade = new MaterialGrade
        {
            Id = Guid.NewGuid(),
            Code = "HMS1",
            Name = "Heavy Melting Steel 1",
            CategoryId = category.Id,
            Category = category,
            DefaultBuyPrice = 2200,
            DefaultSellPrice = 2800,
            Unit = MaterialUnit.Ton
        };

        db.Sites.Add(site);
        db.Suppliers.Add(supplier);
        db.Customers.Add(customer);
        db.MaterialCategories.Add(category);
        db.MaterialGrades.Add(grade);
        await db.SaveChangesAsync();

        return (db, site, supplier, customer, grade);
    }
}
