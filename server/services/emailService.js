import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

// Ensure IPv4 resolution priority in cloud containers (Render/AWS) where outbound IPv6 is unreachable
if (dns && typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Defensive configuration resolver.
 * Trims whitespace, strips accidental wrapping quotes, and resolves provider priority.
 */
export const getEmailConfig = () => {
  const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').replace(/^["']|["']$/g, '').trim();
  const SMTP_HOST = (process.env.SMTP_HOST || '').replace(/^["']|["']$/g, '').trim();
  const portStr = (process.env.SMTP_PORT || '587').toString().replace(/^["']|["']$/g, '').trim();
  const SMTP_PORT = parseInt(portStr, 10) || 587;
  const SMTP_USER = (process.env.SMTP_USER || '').replace(/^["']|["']$/g, '').trim();
  const rawPass = (process.env.SMTP_PASS || '').replace(/^["']|["']$/g, '').trim();
  // Strip all internal and trailing whitespace from Google App Passwords (e.g. 'abcd efgh ijkl mnop')
  const SMTP_PASS = rawPass.replace(/\s+/g, '');
  const OTP_FROM_EMAIL = (process.env.OTP_FROM_EMAIL || '').replace(/^["']|["']$/g, '').trim();

  const isResendConfigured = Boolean(RESEND_API_KEY && !RESEND_API_KEY.includes('placeholder'));
  const isSmtpConfigured = Boolean(SMTP_USER && SMTP_PASS);

  // Determine active provider:
  // User explicitly uses Nodemailer with Gmail SMTP.
  // If SMTP is configured, prioritize SMTP.
  // If ONLY Resend is provided or explicitly requested via EMAIL_PROVIDER=resend, use Resend.
  let preferredProvider = 'none';
  if (process.env.EMAIL_PROVIDER === 'resend' && isResendConfigured) {
    preferredProvider = 'resend';
  } else if (isSmtpConfigured) {
    preferredProvider = 'smtp';
  } else if (isResendConfigured) {
    preferredProvider = 'resend';
  }

  return {
    RESEND_API_KEY,
    SMTP_HOST: SMTP_HOST || (isSmtpConfigured && SMTP_USER.toLowerCase().endsWith('@gmail.com') ? 'smtp.gmail.com' : SMTP_HOST),
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    OTP_FROM_EMAIL,
    isResendConfigured,
    isSmtpConfigured,
    preferredProvider
  };
};

/**
 * Safe diagnostic logger - never outputs passwords, API keys, or raw secrets.
 */
export const logEmailDiagnostics = () => {
  const cfg = getEmailConfig();
  const maskedUser = cfg.SMTP_USER ? cfg.SMTP_USER.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 'none';

  console.log('📧 [Email Service Diagnostic]');
  console.log(`   - SMTP_HOST configured: ${Boolean(cfg.SMTP_HOST)} (${cfg.SMTP_HOST || 'none'})`);
  console.log(`   - SMTP_PORT: ${cfg.SMTP_PORT}`);
  console.log(`   - SMTP_USER configured: ${Boolean(cfg.SMTP_USER)} (${maskedUser})`);
  console.log(`   - SMTP_PASS configured: ${Boolean(cfg.SMTP_PASS)} (sanitized length: ${cfg.SMTP_PASS.length})`);
  console.log(`   - OTP_FROM_EMAIL configured: ${Boolean(cfg.OTP_FROM_EMAIL)}`);
  console.log(`   - Resend configured: ${cfg.isResendConfigured}`);
  console.log(`   - Selected Provider Strategy: ${cfg.preferredProvider}`);
};

// Log diagnostics on startup
logEmailDiagnostics();

/**
 * Creates a Nodemailer transporter with resilient connection timeouts
 * tailored for cloud hosting environments (Render / AWS / Linux containers).
 */
export const createSmtpTransporter = (options = {}) => {
  const cfg = getEmailConfig();
  const isGmail =
    (cfg.SMTP_HOST && cfg.SMTP_HOST.toLowerCase().includes('gmail')) ||
    (cfg.SMTP_USER && cfg.SMTP_USER.toLowerCase().endsWith('@gmail.com'));

  const usePort = options.port || cfg.SMTP_PORT;
  const isSecure = options.secure !== undefined ? options.secure : (usePort === 465);

  // If using Gmail on port 465 or service override
  if (isGmail && (usePort === 465 || options.service === 'gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      family: 4,
      auth: {
        user: cfg.SMTP_USER,
        pass: cfg.SMTP_PASS
      },
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 30000
    });
  }

  // Standard host/port transporter with resilient timeouts
  return nodemailer.createTransport({
    host: cfg.SMTP_HOST || 'smtp.gmail.com',
    port: usePort,
    secure: isSecure,
    family: 4,
    auth: {
      user: cfg.SMTP_USER,
      pass: cfg.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000
  });
};

/**
 * Safe verification helper to validate SMTP/Resend connection without sending an email.
 */
export const verifyEmailConfig = async () => {
  const cfg = getEmailConfig();
  const maskedUser = cfg.SMTP_USER ? cfg.SMTP_USER.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null;

  const diagnostics = {
    provider: cfg.preferredProvider,
    smtpHostConfigured: Boolean(cfg.SMTP_HOST),
    smtpHost: cfg.SMTP_HOST || null,
    smtpPort: cfg.SMTP_PORT,
    smtpUserConfigured: Boolean(cfg.SMTP_USER),
    smtpUserMasked: maskedUser,
    smtpPassConfigured: Boolean(cfg.SMTP_PASS),
    smtpPassLength: cfg.SMTP_PASS ? cfg.SMTP_PASS.length : 0,
    otpFromEmailConfigured: Boolean(cfg.OTP_FROM_EMAIL),
    resendConfigured: cfg.isResendConfigured
  };

  if (!cfg.isSmtpConfigured && !cfg.isResendConfigured) {
    return {
      success: false,
      message: 'No email credentials configured. Please set SMTP_USER and SMTP_PASS (or RESEND_API_KEY) in Render environment variables.',
      diagnostics
    };
  }

  if (cfg.preferredProvider === 'smtp') {
    try {
      const transporter = createSmtpTransporter();
      await transporter.verify();
      return {
        success: true,
        message: 'Gmail SMTP authentication verified successfully.',
        diagnostics
      };
    } catch (err) {
      console.error('❌ [SMTP Verify Error]');
      console.error(`   - Message: ${err.message}`);
      console.error(`   - Code: ${err.code || 'N/A'}`);
      console.error(`   - Command: ${err.command || 'N/A'}`);
      console.error(`   - Response: ${err.response || 'N/A'}`);

      // Try automatic fallback to port 465 direct SSL if port 587 timed out
      if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKET' || err.code === 'ECONNREFUSED') {
        try {
          console.log('🔄 Attempting fallback verification via direct SSL (port 465)...');
          const fallbackTransporter = createSmtpTransporter({ service: 'gmail', port: 465, secure: true });
          await fallbackTransporter.verify();
          return {
            success: true,
            message: 'Gmail SMTP verified successfully via SSL fallback (port 465).',
            diagnostics: { ...diagnostics, fallbackPortUsed: 465 }
          };
        } catch (fallbackErr) {
          console.error(`❌ [SMTP Fallback Verify Failed] ${fallbackErr.message}`);
        }
      }

      return {
        success: false,
        message: `SMTP verification failed: ${err.message}`,
        error: {
          code: err.code || null,
          command: err.command || null,
          response: err.response || null
        },
        diagnostics
      };
    }
  }

  return {
    success: true,
    message: 'Resend email provider configured.',
    diagnostics
  };
};

/**
 * Send real 6-digit OTP email using Gmail SMTP or Resend.
 */
export const sendOtpEmail = async ({ toEmail, studentName, otpCode, purpose = 'REGISTER' }) => {
  const cfg = getEmailConfig();
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
          <div class="expiry">⏰ Code expires in 5 minutes</div>
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

  // 1. Dispatch via Production SMTP Server (Prioritized for Gmail)
  if (cfg.preferredProvider === 'smtp') {
    const fromAddress = cfg.OTP_FROM_EMAIL || `BookBridge <${cfg.SMTP_USER}>`;

    try {
      const transporter = createSmtpTransporter();
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        html: htmlContent
      });

      console.log(`✉️ [Production SMTP] Real OTP email sent successfully to ${toEmail} (MessageId: ${info.messageId})`);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.error('❌ [Production SMTP Send Error]');
      console.error(`   - Message: ${smtpErr.message}`);
      console.error(`   - Code: ${smtpErr.code || 'N/A'}`);
      console.error(`   - Command: ${smtpErr.command || 'N/A'}`);
      console.error(`   - Response: ${smtpErr.response || 'N/A'}`);

      // If connection timed out or reset on port 587, attempt fallback via port 465 (Direct SSL)
      if (smtpErr.code === 'ETIMEDOUT' || smtpErr.code === 'ESOCKET' || smtpErr.code === 'ECONNREFUSED') {
        try {
          console.log('🔄 Attempting fallback send via direct SSL (port 465)...');
          const fallbackTransporter = createSmtpTransporter({ service: 'gmail', port: 465, secure: true });
          const fallbackInfo = await fallbackTransporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject,
            html: htmlContent
          });

          console.log(`✉️ [Production SMTP Fallback] OTP email sent successfully via port 465 (MessageId: ${fallbackInfo.messageId})`);
          return { success: true, provider: 'smtp_fallback', messageId: fallbackInfo.messageId };
        } catch (fallbackErr) {
          console.error(`❌ [SMTP Fallback Send Failed] ${fallbackErr.message}`);
        }
      }

      // If Resend is also configured, attempt secondary fallback
      if (cfg.isResendConfigured) {
        try {
          console.log('🔄 Attempting secondary fallback via Resend API...');
          const resendClient = new Resend(cfg.RESEND_API_KEY);
          const resendFrom = cfg.OTP_FROM_EMAIL && !cfg.OTP_FROM_EMAIL.includes('@gmail.com')
            ? cfg.OTP_FROM_EMAIL
            : 'BookBridge <onboarding@resend.dev>';

          const resendRes = await resendClient.emails.send({
            from: resendFrom,
            to: toEmail,
            subject,
            html: htmlContent
          });

          if (!resendRes.error) {
            console.log(`✉️ [Resend Fallback] Real OTP sent via Resend (ID: ${resendRes.data?.id})`);
            return { success: true, provider: 'resend_fallback', id: resendRes.data?.id };
          }
        } catch (resendFallbackErr) {
          console.error(`❌ [Resend Secondary Fallback Failed] ${resendFallbackErr.message}`);
        }
      }

      throw smtpErr;
    }
  }

  // 2. Dispatch via Resend API (if Resend is active provider)
  if (cfg.preferredProvider === 'resend') {
    const resendClient = new Resend(cfg.RESEND_API_KEY);
    const resendFrom = cfg.OTP_FROM_EMAIL || 'BookBridge <onboarding@resend.dev>';

    const response = await resendClient.emails.send({
      from: resendFrom,
      to: toEmail,
      subject,
      html: htmlContent
    });

    if (response.error) {
      console.error(`❌ [Resend API Error] ${response.error.message}`);

      // If Resend fails and SMTP credentials exist, fallback to SMTP
      if (cfg.isSmtpConfigured) {
        console.log('🔄 Resend failed; attempting fallback via Gmail SMTP...');
        const transporter = createSmtpTransporter();
        const info = await transporter.sendMail({
          from: `BookBridge <${cfg.SMTP_USER}>`,
          to: toEmail,
          subject,
          html: htmlContent
        });
        return { success: true, provider: 'smtp_fallback', messageId: info.messageId };
      }

      throw new Error(`Resend API Error: ${response.error.message}`);
    }

    console.log(`✉️ [Resend] Real OTP email sent successfully to ${toEmail} (ID: ${response.data?.id})`);
    return { success: true, provider: 'resend', id: response.data?.id };
  }

  // If no credentials configured
  console.error('❌ [Email Service Error] No valid email provider credentials found (SMTP_USER/SMTP_PASS or RESEND_API_KEY required).');
  throw new Error('Real email provider is not configured. Please set SMTP_USER and SMTP_PASS in environment variables.');
};

export default sendOtpEmail;
