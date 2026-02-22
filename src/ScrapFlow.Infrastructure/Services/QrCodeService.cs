using QRCoder;
using ScrapFlow.Application.Interfaces;

namespace ScrapFlow.Infrastructure.Services;

public class QrCodeService
{
    public string GenerateQrCodeBase64(string text)
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(text, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        byte[] qrCodeAsPngByteArr = qrCode.GetGraphic(20);
        
        return Convert.ToBase64String(qrCodeAsPngByteArr);
    }
}
