import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.OTP_FROM_EMAIL || 'BookBridge <onboarding@resend.dev>';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let resendClient = null;
if (RESEND_API_KEY && !RESEND_API_KEY.includes('placeholder')) {
  resendClient = new Resend(RESEND_API_KEY);
}

/**
 * Send real 6-digit OTP email using Resend API or Production SMTP Transporter
 * Ethereal test fallback removed completely.
 */
export const sendOtpEmail = async ({ toEmail, studentName, otpCode, purpose = 'REGISTER' }) => {
  const isPasswordReset = purpose === 'PASSWORD_RESET';
  const subject = isPasswordReset ? 'Your BookBridge Password Reset Code' : 'Your BookBridge Verification Code';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .logo { font-size: 24px; font-weight: 800; color: #16a34a; text-decoration: none; display: inline-block; margin-bottom: 24px; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
        .text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .otp-box { background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; text-align: center; padding: 20px; margin: 24px 0; }
        .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #15803d; font-family: monospace; }
        .expiry { font-size: 13px; color: #64748b; margin-top: 8px; }
        .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <a href="https://bookbridge.edu" class="logo">📚 BookBridge</a>
        <h1 class="title">${isPasswordReset ? 'Password Reset Verification' : 'Verify Your Email Address'}</h1>
        <p class="text">Hello <strong>${studentName || 'Student'}</strong>,</p>
        <p class="text">Use the following 6-digit verification code to ${isPasswordReset ? 'reset your password' : 'complete your BookBridge student account registration'}:</p>
        
        <div class="otp-box">
          <div class="otp-code">${otpCode}</div>
          <div class="expiry">⏰ Code expires in 10 minutes</div>
        </div>

        <p class="text">If you did not request this code, you can safely ignore this email. Do not share this code with anyone.</p>
        
        <div class="footer">
          BookBridge — Read. Exchange. Give. Repeat.<br>
          One Student Account. One Platform. Every Book Gets Another Chance.
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. Dispatch via Resend API
  if (resendClient) {
    const response = await resendClient.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html: htmlContent
    });

    if (response.error) {
      console.error(`❌ [Resend API Error] ${response.error.message}`);
      throw new Error(`Resend API Error: ${response.error.message}`);
    }

    console.log(`✉️ [Resend] Real OTP email sent successfully to ${toEmail} (ID: ${response.data?.id})`);
    return { success: true, provider: 'resend', id: response.data?.id };
  }

  // 2. Dispatch via Production SMTP Server (Gmail / Brevo / SendGrid / Custom SMTP)
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const cleanPass = SMTP_PASS.replace(/\s+/g, '');
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: cleanPass
      }
    });

    const info = await transporter.sendMail({
      from: FROM_EMAIL || `BookBridge Support <${SMTP_USER}>`,
      to: toEmail,
      subject,
      html: htmlContent
    });

    console.log(`✉️ [Production SMTP] Real OTP email (${otpCode}) sent to ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, provider: 'smtp', messageId: info.messageId };
  }

  // If no real provider credentials configured
  console.error('❌ [Email Service Error] No valid email provider configured (RESEND_API_KEY or SMTP credentials required).');
  throw new Error('Real email provider is not configured. Please set RESEND_API_KEY or SMTP credentials in .env');
};

export default sendOtpEmail;
