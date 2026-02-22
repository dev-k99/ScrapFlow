namespace ScrapFlow.Domain.Enums;

public enum TicketStatus
{
    Created = 0,
    GrossWeighed = 1,
    Graded = 2,
    TareWeighed = 3,
    PaymentRecorded = 4,
    Completed = 5,
    Cancelled = 6
}

public enum TicketType
{
    Inbound = 0,
    Outbound = 1
}

public enum PaymentMethod
{
    EFT = 0,
    BankTransfer = 1
}

public enum IdType
{
    SouthAfricanId = 0,
    Passport = 1,
    BusinessRegistration = 2,
    AsylumPermit = 3
}

public enum IdVerificationMethod
{
    Manual = 0,
    HomeAffairsOnline = 1,
    ThirdPartyApi = 2
}

public enum PhotoType
{
    SellerFace = 0,
    MaterialLoad = 1,
    IdDocument = 2,
    PaymentProof = 3,
    MaterialAfterGrading = 4,
    Other = 5
}

public enum MaterialUnit
{
    Kilogram = 0,
    Ton = 1
}

public enum LotStatus
{
    InStock = 0,
    PartiallyAllocated = 1,
    Allocated = 2,
    Sold = 3,
    WrittenOff = 4
}

public enum ReportStatus
{
    Pending = 0,
    Generated = 1,
    Submitted = 2
}
