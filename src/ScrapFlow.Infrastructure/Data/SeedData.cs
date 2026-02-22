using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ScrapFlow.Domain.Entities;
using ScrapFlow.Domain.Enums;

namespace ScrapFlow.Infrastructure.Data;

public static class SeedData
{
    public static async Task SeedAsync(ScrapFlowDbContext context, UserManager<AppUser> userManager, RoleManager<IdentityRole> roleManager)
    {
        await SeedRoles(roleManager);
        await SeedUsers(userManager);
        await SeedSites(context);
        await SeedMaterials(context);
        await SeedSuppliers(context);
        await SeedCustomers(context);
        await SeedSampleTickets(context);
        await context.SaveChangesAsync();
    }

    private static async Task SeedRoles(RoleManager<IdentityRole> roleManager)
    {
        string[] roles = { "Owner", "Manager", "ScaleOp", "Grader", "Accountant" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }
    }

    private static async Task SeedUsers(UserManager<AppUser> userManager)
    {
        if (await userManager.FindByEmailAsync("owner@scrapflow.co.za") != null) return;

        var users = new[]
        {
            new { Email = "owner@scrapflow.co.za", First = "Thabo", Last = "Molefe", Role = "Owner" },
            new { Email = "manager@scrapflow.co.za", First = "Lerato", Last = "Nkosi", Role = "Manager" },
            new { Email = "scale@scrapflow.co.za", First = "Sipho", Last = "Dlamini", Role = "ScaleOp" },
            new { Email = "grader@scrapflow.co.za", First = "Nomsa", Last = "Khumalo", Role = "Grader" },
            new { Email = "accounts@scrapflow.co.za", First = "Pieter", Last = "van der Merwe", Role = "Accountant" }
        };

        foreach (var u in users)
        {
            var user = new AppUser
            {
                UserName = u.Email,
                Email = u.Email,
                FirstName = u.First,
                LastName = u.Last,
                EmailConfirmed = true
            };
            await userManager.CreateAsync(user, "ScrapFlow@2026!");
            await userManager.AddToRoleAsync(user, u.Role);
        }
    }

    private static async Task SeedSites(ScrapFlowDbContext context)
    {
        if (await context.Sites.AnyAsync()) return;

        context.Sites.AddRange(
            new Site { Name = "Germiston Main Yard", Address = "45 Refinery Road, Germiston", City = "Germiston", Province = "Gauteng", PostalCode = "1401", Latitude = -26.2241, Longitude = 28.1712 },
            new Site { Name = "Durban North Depot", Address = "12 Jacobs Road, Durban North", City = "Durban", Province = "KwaZulu-Natal", PostalCode = "4051", Latitude = -29.7959, Longitude = 31.0210 }
        );
        await context.SaveChangesAsync();
    }

    private static async Task SeedMaterials(ScrapFlowDbContext context)
    {
        if (await context.MaterialCategories.AnyAsync()) return;

        var ferrous = new MaterialCategory { Name = "Ferrous", Description = "Iron and steel based metals", SortOrder = 1 };
        var nonFerrous = new MaterialCategory { Name = "Non-Ferrous", Description = "Copper, aluminium, brass, stainless, etc.", SortOrder = 2 };

        context.MaterialCategories.AddRange(ferrous, nonFerrous);
        await context.SaveChangesAsync();

        // ==== Ferrous Grades (prices per ton in ZAR, Feb 2026 realistic) ====
        var ferrousGrades = new[]
        {
            new MaterialGrade { Code = "HMS1", Name = "Heavy Melting Steel 1", CategoryId = ferrous.Id, DefaultBuyPrice = 4200, DefaultSellPrice = 4800, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "HMS2", Name = "Heavy Melting Steel 2", CategoryId = ferrous.Id, DefaultBuyPrice = 3800, DefaultSellPrice = 4400, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "CAST", Name = "Cast Iron", CategoryId = ferrous.Id, DefaultBuyPrice = 3500, DefaultSellPrice = 4100, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "TURN", Name = "Steel Turnings", CategoryId = ferrous.Id, DefaultBuyPrice = 2800, DefaultSellPrice = 3400, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "LIGHT", Name = "Light Steel / Tin", CategoryId = ferrous.Id, DefaultBuyPrice = 2200, DefaultSellPrice = 2800, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "REBAR", Name = "Rebar / Reinforcing", CategoryId = ferrous.Id, DefaultBuyPrice = 4000, DefaultSellPrice = 4600, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "RAIL", Name = "Rail / Heavy Plate", CategoryId = ferrous.Id, DefaultBuyPrice = 4500, DefaultSellPrice = 5200, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "SHRED", Name = "Shredded Steel", CategoryId = ferrous.Id, DefaultBuyPrice = 4100, DefaultSellPrice = 4700, Unit = MaterialUnit.Ton },
        };

        // ==== Non-Ferrous Grades ====
        var nonFerrousGrades = new[]
        {
            new MaterialGrade { Code = "CU-MILB", Name = "Copper Millberry (Bright)", CategoryId = nonFerrous.Id, DefaultBuyPrice = 145000, DefaultSellPrice = 158000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "CU-CANDY", Name = "Copper Candy (PVC stripped)", CategoryId = nonFerrous.Id, DefaultBuyPrice = 125000, DefaultSellPrice = 138000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "CU-BIRCH", Name = "Copper Birch Cliff", CategoryId = nonFerrous.Id, DefaultBuyPrice = 130000, DefaultSellPrice = 143000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "AL-TAINT", Name = "Aluminium Taint/Tabor", CategoryId = nonFerrous.Id, DefaultBuyPrice = 28000, DefaultSellPrice = 33000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "AL-UBC", Name = "Aluminium UBC (Cans)", CategoryId = nonFerrous.Id, DefaultBuyPrice = 22000, DefaultSellPrice = 27000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "AL-WHEEL", Name = "Aluminium Wheels", CategoryId = nonFerrous.Id, DefaultBuyPrice = 32000, DefaultSellPrice = 38000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "AL-CAST", Name = "Aluminium Cast", CategoryId = nonFerrous.Id, DefaultBuyPrice = 26000, DefaultSellPrice = 31000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "BRASS", Name = "Brass Mixed", CategoryId = nonFerrous.Id, DefaultBuyPrice = 78000, DefaultSellPrice = 88000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "SS304", Name = "Stainless Steel 304", CategoryId = nonFerrous.Id, DefaultBuyPrice = 28000, DefaultSellPrice = 34000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "SS316", Name = "Stainless Steel 316", CategoryId = nonFerrous.Id, DefaultBuyPrice = 35000, DefaultSellPrice = 42000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "LEAD", Name = "Lead (Battery / Sheet)", CategoryId = nonFerrous.Id, DefaultBuyPrice = 18000, DefaultSellPrice = 22000, Unit = MaterialUnit.Ton },
            new MaterialGrade { Code = "ZINC", Name = "Zinc Die Cast / Sheet", CategoryId = nonFerrous.Id, DefaultBuyPrice = 24000, DefaultSellPrice = 29000, Unit = MaterialUnit.Ton },
        };

        context.MaterialGrades.AddRange(ferrousGrades);
        context.MaterialGrades.AddRange(nonFerrousGrades);
        await context.SaveChangesAsync();

        // Seed today's daily prices from defaults
        var today = DateTime.UtcNow.Date;
        var allGrades = await context.MaterialGrades.ToListAsync();
        foreach (var grade in allGrades)
        {
            context.DailyPrices.Add(new DailyPrice
            {
                MaterialGradeId = grade.Id,
                EffectiveDate = today,
                BuyPricePerTon = grade.DefaultBuyPrice,
                SellPricePerTon = grade.DefaultSellPrice,
                Notes = "Initial seed price"
            });
        }
        await context.SaveChangesAsync();
    }

    private static async Task SeedSuppliers(ScrapFlowDbContext context)
    {
        if (await context.Suppliers.AnyAsync()) return;

        var suppliers = new[]
        {
            new Supplier { FullName = "Johannes Venter", IdNumber = "8501015800082", IdType = IdType.SouthAfricanId, ContactNumber = "082 555 1001", Email = "jventer@gmail.com", Address = "23 Voortrekker Rd, Germiston", VehicleRegistration = "GP 123-456", BankName = "FNB", AccountNumber = "62345678901", BranchCode = "250655", IsVerified = true },
            new Supplier { FullName = "Sibongile Ndlovu", IdNumber = "9003150345089", IdType = IdType.SouthAfricanId, ContactNumber = "073 444 2002", Email = "sibongile.n@yahoo.com", Address = "78 Main Reef Rd, Boksburg", VehicleRegistration = "GP 789-012", BankName = "Capitec", AccountNumber = "1234567890", BranchCode = "470010", IsVerified = true },
            new Supplier { FullName = "Ahmed Hassan", IdNumber = "A12345678", IdType = IdType.Passport, ContactNumber = "061 333 3003", Address = "12 Jules St, Jeppestown", VehicleRegistration = "GP 345-678", BankName = "Standard Bank", AccountNumber = "9876543210", BranchCode = "051001", IsVerified = true },
            new Supplier { FullName = "Pieter du Plessis", IdNumber = "7806225100080", IdType = IdType.SouthAfricanId, ContactNumber = "083 222 4004", Email = "pieter.dp@mweb.co.za", Address = "56 Commissioner St, Springs", VehicleRegistration = "GP 901-234", BankName = "Nedbank", AccountNumber = "1234509876", BranchCode = "198765", IsVerified = true },
            new Supplier { FullName = "Zanele Mkhize", IdNumber = "9505280247083", IdType = IdType.SouthAfricanId, ContactNumber = "071 111 5005", Email = "zanele.m@outlook.com", Address = "34 Durban Rd, Pinetown", VehicleRegistration = "ND 567-890", BankName = "FNB", AccountNumber = "62987654321", BranchCode = "250655", IsVerified = true },
            new Supplier { FullName = "David Mokoena", IdNumber = "8212015555086", IdType = IdType.SouthAfricanId, ContactNumber = "082 999 6006", Address = "89 Eloff St, Benoni", VehicleRegistration = "GP 234-567", BankName = "Absa", AccountNumber = "4098765432", BranchCode = "632005", IsVerified = true },
            new Supplier { FullName = "Fatima Osman", IdNumber = "9109170199088", IdType = IdType.SouthAfricanId, ContactNumber = "084 777 7007", Email = "fatima.o@gmail.com", Address = "67 Mint Rd, Fordsburg", VehicleRegistration = "GP 678-901", BankName = "Capitec", AccountNumber = "1122334455", BranchCode = "470010", IsVerified = true },
            new Supplier { FullName = "Bongani Sithole", IdNumber = "8707255432081", IdType = IdType.SouthAfricanId, ContactNumber = "072 666 8008", Address = "12 Old Main Rd, Kloof", VehicleRegistration = "ND 012-345", BankName = "Standard Bank", AccountNumber = "5566778899", BranchCode = "051001", IsVerified = true, IsWastePicker = true, WastePickerArea = "Durban CBD" },
            new Supplier { FullName = "Maria Ferreira", IdNumber = "8404190876085", IdType = IdType.SouthAfricanId, ContactNumber = "083 555 9009", Email = "maria.f@vodamail.co.za", Address = "45 Kerk St, Alberton", VehicleRegistration = "GP 456-789", BankName = "FNB", AccountNumber = "62111222333", BranchCode = "250655", IsVerified = true },
            new Supplier { FullName = "Tshepo Moloi", IdNumber = "9801015800088", IdType = IdType.SouthAfricanId, ContactNumber = "061 888 1010", Address = "23 Hendrik Verwoerd Dr, Randburg", VehicleRegistration = "GP 890-123", BankName = "TymeBank", AccountNumber = "9988776655", BranchCode = "678910", IsVerified = true, IsWastePicker = true, WastePickerArea = "Randburg / Sandton" }
        };

        context.Suppliers.AddRange(suppliers);
        await context.SaveChangesAsync();
    }

    private static async Task SeedCustomers(ScrapFlowDbContext context)
    {
        if (await context.Customers.AnyAsync()) return;

        context.Customers.AddRange(
            new Customer { CompanyName = "SA Metal Group", RegistrationNumber = "1999/012345/07", VatNumber = "4010123456", ContactPerson = "James Wilson", ContactNumber = "011 555 0001", Email = "purchases@sametal.co.za", Address = "Epping Industrial, Cape Town", Province = "Western Cape" },
            new Customer { CompanyName = "Collect-a-Can", RegistrationNumber = "1993/006789/07", VatNumber = "4020654321", ContactPerson = "Siphiwe Radebe", ContactNumber = "011 555 0002", Email = "buying@collectacan.co.za", Address = "Germiston, Gauteng", Province = "Gauteng" },
            new Customer { CompanyName = "Universal Recycling", RegistrationNumber = "2005/098765/07", VatNumber = "4030111222", ContactPerson = "Rashid Khan", ContactNumber = "031 555 0003", Email = "info@universalrecycling.co.za", Address = "Jacobs, Durban", Province = "KwaZulu-Natal" }
        );
        await context.SaveChangesAsync();
    }

    private static async Task SeedSampleTickets(ScrapFlowDbContext context)
    {
        if (await context.InboundTickets.AnyAsync()) return;

        var site = await context.Sites.FirstAsync();
        var suppliers = await context.Suppliers.Take(3).ToListAsync();
        var hms1 = await context.MaterialGrades.FirstAsync(g => g.Code == "HMS1");
        var copper = await context.MaterialGrades.FirstAsync(g => g.Code == "CU-MILB");
        var aluminium = await context.MaterialGrades.FirstAsync(g => g.Code == "AL-TAINT");

        var tickets = new[]
        {
            CreateSampleTicket("INB-20260220-0001", suppliers[0], site, hms1, 2450, 4200),
            CreateSampleTicket("INB-20260220-0002", suppliers[1], site, copper, 185, 145000),
            CreateSampleTicket("INB-20260220-0003", suppliers[2], site, aluminium, 890, 28000),
            CreateSampleTicket("INB-20260221-0001", suppliers[0], site, hms1, 3200, 4200),
            CreateSampleTicket("INB-20260221-0002", suppliers[1], site, copper, 120, 145000),
        };

        context.InboundTickets.AddRange(tickets);
        await context.SaveChangesAsync();
    }

    private static InboundTicket CreateSampleTicket(string ticketNumber, Supplier supplier, Site site, MaterialGrade grade, decimal netWeight, decimal pricePerTon)
    {
        var grossWeight = netWeight + 8500; // typical vehicle tare
        var lineTotal = Math.Round(netWeight / 1000 * pricePerTon, 2);

        return new InboundTicket
        {
            TicketNumber = ticketNumber,
            Status = TicketStatus.Completed,
            SupplierId = supplier.Id,
            SiteId = site.Id,
            GrossWeight = grossWeight,
            TareWeight = 8500,
            NetWeight = netWeight,
            TotalPrice = lineTotal,
            PaymentMethod = PaymentMethod.EFT,
            PaymentReference = $"FNB-REF-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            PaymentVerified = true,
            CompletedAt = DateTime.UtcNow.AddHours(-new Random().Next(1, 48)),
            LineItems = new List<TicketLineItem>
            {
                new TicketLineItem
                {
                    MaterialGradeId = grade.Id,
                    NetWeight = netWeight,
                    PricePerTon = pricePerTon,
                    LineTotal = lineTotal,
                    QualityScore = 90
                }
            },
            ComplianceRecord = new ComplianceRecord
            {
                IdVerificationMethod = IdVerificationMethod.Manual,
                IdVerified = true,
                IdVerifiedAt = DateTime.UtcNow.AddHours(-2),
                HasSellerPhoto = true,
                HasLoadPhoto = true,
                HasIdPhoto = true,
                HasElectronicPaymentProof = true,
                HasValidPaymentReference = true,
                IsFullyCompliant = true
            }
        };
    }
}
