// lib/services/qrcode.service.ts
import QRCode from 'qrcode';

export class QRCodeService {
  /**
   * Generate QR code as data URL (base64)
   */
  static async generateDataURL(data: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate QR code as SVG string
   */
  static async generateSVG(data: string): Promise<string> {
    try {
      const svgString = await QRCode.toString(data, {
        errorCorrectionLevel: 'M',
        type: 'svg',
        width: 256,
        margin: 1
      });

      return svgString;
    } catch (error) {
      console.error('Error generating QR SVG:', error);
      throw new Error('Failed to generate QR SVG');
    }
  }

  /**
   * Generate participant QR data
   */
  static generateParticipantQRData(participantId: string, registrationCode: string): string {
    return JSON.stringify({
      id: participantId,
      code: registrationCode,
      type: 'PARTICIPANT',
      timestamp: Date.now()
    });
  }

  /**
   * Generate community QR data
   */
  static generateCommunityQRData(communityId: string, registrationCode: string): string {
    return JSON.stringify({
      id: communityId,
      code: registrationCode,
      type: 'COMMUNITY',
      timestamp: Date.now()
    });
  }
}