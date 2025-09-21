import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private static from = process.env.EMAIL_FROM || 'noreply@sukamajurun.com';
  private static apiKey = process.env.EMAIL_API_KEY; // For your email provider (SendGrid/Resend/etc)
  private static isMockMode = process.env.EMAIL_MOCK_MODE === 'true';

  // Send custom email message
  static async sendCustomMessage(
    to: string,
    subject: string,
    content: string
  ): Promise<boolean> {
    try {
      // Log to database
      const notification = await prisma.notification.create({
        data: {
          recipientEmail: to,
          type: 'EMAIL',
          category: 'TRANSACTIONAL',
          subject,
          message: content,
          status: 'PENDING',
          metadata: {}
        }
      });

      // Mock mode for testing
      if (this.isMockMode) {
        console.log('📧 MOCK Email:');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Content:', content.substring(0, 200) + '...');

        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            metadata: { mockMode: true }
          }
        });

        return true;
      }

      // If using Resend (recommended for simplicity)
      if (process.env.EMAIL_PROVIDER === 'RESEND') {
        const result = await this.sendViaResend(to, subject, content);

        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: result.success ? 'SENT' : 'FAILED',
            sentAt: result.success ? new Date() : null,
            failureReason: result.error,
            metadata: { messageId: result.messageId } as Prisma.JsonObject
          }
        });

        return result.success;
      }

      // If using SendGrid
      if (process.env.EMAIL_PROVIDER === 'SENDGRID') {
        const result = await this.sendViaSendGrid(to, subject, content);

        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: result.success ? 'SENT' : 'FAILED',
            sentAt: result.success ? new Date() : null,
            failureReason: result.error,
            metadata: { messageId: result.messageId } as Prisma.JsonObject
          }
        });

        return result.success;
      }

      // Default: log only
      console.warn('No email provider configured. Email not sent.');
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          failureReason: 'No email provider configured'
        }
      });

      return false;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  // Send via Resend
  private static async sendViaResend(
    to: string,
    subject: string,
    html: string
  ): Promise<EmailResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('Resend API key not configured');
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.from,
          to: [to],
          subject,
          html: this.formatHtmlEmail(html)
        })
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, messageId: data.id };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send via SendGrid
  private static async sendViaSendGrid(
    to: string,
    subject: string,
    content: string
  ): Promise<EmailResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('SendGrid API key not configured');
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: to }]
          }],
          from: { email: this.from },
          subject,
          content: [{
            type: 'text/html',
            value: this.formatHtmlEmail(content)
          }]
        })
      });

      if (response.ok || response.status === 202) {
        const messageId = response.headers.get('X-Message-Id');
        return { success: true, messageId: messageId || undefined };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Format plain text to HTML email
  private static formatHtmlEmail(content: string): string {
    // Convert WhatsApp-style formatting to HTML
    const html = content
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>') // Bold
      .replace(/_([^_]+)_/g, '<em>$1</em>') // Italic
      .replace(/\n/g, '<br>'); // Line breaks

    // Wrap in email template
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e0e0e0;
      border-radius: 0 0 10px 10px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
    strong {
      color: #4a5568;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border-radius: 5px;
      text-decoration: none;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏃 Sukamaju Run 2025</h1>
  </div>
  <div class="content">
    ${html}
  </div>
  <div class="footer">
    <p>© 2025 Sukamaju Run. All rights reserved.</p>
    <p>Jl. Raya Sukamaju No. 123, Bogor, Jawa Barat</p>
  </div>
</body>
</html>`;
  }

  // Send bulk emails with rate limiting
  static async sendBulkEmails(
    recipients: Array<{ email: string; subject: string; content: string }>
  ): Promise<Array<{ email: string; success: boolean; error?: string }>> {
    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    for (const recipient of recipients) {
      try {
        const success = await this.sendCustomMessage(
          recipient.email,
          recipient.subject,
          recipient.content
        );

        results.push({
          email: recipient.email,
          success
        });

        // Rate limiting - 1 second between emails
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          email: recipient.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

export default EmailService;