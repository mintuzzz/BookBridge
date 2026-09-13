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
  const portStr = (process.env.SMTP_PORT || '').toString().replace(/^["']|["']$/g, '').trim();
  const rawPass = (process.env.SMTP_PASS || '').replace(/^["']|["']$/g, '').trim();
  // Strip all internal and trailing whitespace from Google App Passwords
  const SMTP_PASS = rawPass.replace(/\s+/g, '');
  const SMTP_USER = (process.env.SMTP_USER || '').replace(/^["']|["']$/g, '').trim();
  const OTP_FROM_EMAIL = (process.env.OTP_FROM_EMAIL || '').replace(/^["']|["']$/g, '').trim();

  const isSmtpConfigured = Boolean(SMTP_USER && SMTP_PASS);
  const isGmail =
    (SMTP_HOST && SMTP_HOST.toLowerCase().includes('gmail')) ||
    (SMTP_USER && SMTP_USER.toLowerCase().endsWith('@gmail.com'));

  // Default to port 465 with SSL for Gmail (works reliably on Render/cloud hosts where 587 is throttled)
  const defaultPort = isGmail ? 465 : 587;
  const SMTP_PORT = portStr ? parseInt(portStr, 10) || defaultPort : defaultPort;

  const isResendConfigured = Boolean(RESEND_API_KEY && !RESEND_API_KEY.includes('placeholder'));

  // Provider selection: prioritize Gmail SMTP when SMTP credentials are present
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
    SMTP_HOST: SMTP_HOST || (isGmail ? 'smtp.gmail.com' : 'localhost'),
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    OTP_FROM_EMAIL,
    isGmail,
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
 * Creates a Nodemailer transporter with resilient connection timeouts and IPv4 forcing.
 */
export const createSmtpTransporter = (options = {}) => {
  const cfg = getEmailConfig();

  const host = options.host || cfg.SMTP_HOST || 'smtp.gmail.com';
  const port = options.port || cfg.SMTP_PORT;
  const secure = options.secure !== undefined ? options.secure : (port === 465);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    family: 4, // Force IPv4 to prevent ENETUNREACH in cloud containers
    lookup: (hostname, opts, cb) => dns.lookup(hostname, { family: 4 }, cb),
    auth: {
      user: cfg.SMTP_USER,
      pass: cfg.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 45000
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
      message: 'No email credentials configured. Please set SMTP_USER and SMTP_PASS in Render environment variables.',
      diagnostics
    };
  }

  if (cfg.preferredProvider === 'smtp') {
    // Try primary port (465 SSL for Gmail, or configured port)
    const primaryPort = cfg.isGmail ? 465 : cfg.SMTP_PORT;
    const primarySecure = primaryPort === 465;

    try {
      const transporter = createSmtpTransporter({ port: primaryPort, secure: primarySecure });
      await transporter.verify();
      return {
        success: true,
        message: `Gmail SMTP verified successfully on port ${primaryPort} (Direct SSL).`,
        diagnostics: { ...diagnostics, activePort: primaryPort }
      };
    } catch (err) {
      console.error(`❌ [SMTP Verify Error on port ${primaryPort}]: ${err.message}`);

      // Attempt alternate port fallback
      const altPort = primaryPort === 465 ? 587 : 465;
      try {
        console.log(`🔄 Attempting fallback verification via port ${altPort}...`);
        const fallbackTransporter = createSmtpTransporter({ port: altPort, secure: altPort === 465 });
        await fallbackTransporter.verify();
        return {
          success: true,
          message: `Gmail SMTP verified successfully via fallback (port ${altPort}).`,
          diagnostics: { ...diagnostics, activePort: altPort, fallbackUsed: true }
        };
      } catch (fallbackErr) {
        console.error(`❌ [SMTP Fallback Verify Failed on port ${altPort}]: ${fallbackErr.message}`);
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
    // For Gmail SMTP, the 'from' address must be the authenticated user address
    const fromAddress = (cfg.isGmail && (!cfg.OTP_FROM_EMAIL || cfg.OTP_FROM_EMAIL.includes('resend.dev')))
      ? `BookBridge <${cfg.SMTP_USER}>`
      : (cfg.OTP_FROM_EMAIL || `BookBridge <${cfg.SMTP_USER}>`);

    const trySend = async (transportOptions) => {
      const transporter = createSmtpTransporter(transportOptions);
      return await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        html: htmlContent
      });
    };

    // Primary attempt: use configured SMTP_PORT (defaults to 587 or 465)
    const primaryPort = cfg.SMTP_PORT || (cfg.isGmail ? 587 : 587);
    const primarySecure = primaryPort === 465;

    try {
      const info = await trySend({ port: primaryPort, secure: primarySecure });
      console.log(`✉️ [Production SMTP] Real OTP email sent successfully to ${toEmail} via port ${primaryPort} (MessageId: ${info.messageId})`);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.error(`❌ [Production SMTP Send Error on port ${primaryPort}]`);
      console.error(`   - Message: ${smtpErr.message}`);
      console.error(`   - Code: ${smtpErr.code || 'N/A'}`);
      console.error(`   - Command: ${smtpErr.command || 'N/A'}`);
      console.error(`   - Response: ${smtpErr.response || 'N/A'}`);

      // Attempt alternate port (465 <-> 587)
      const altPort = primaryPort === 465 ? 587 : 465;
      try {
        console.log(`🔄 Attempting fallback send via port ${altPort}...`);
        const fallbackInfo = await trySend({ port: altPort, secure: altPort === 465 });
        console.log(`✉️ [Production SMTP Fallback] OTP email sent successfully via port ${altPort} (MessageId: ${fallbackInfo.messageId})`);
        return { success: true, provider: 'smtp_fallback', messageId: fallbackInfo.messageId };
      } catch (fallbackErr) {
        console.error(`❌ [SMTP Fallback Send Failed on port ${altPort}]: ${fallbackErr.message}`);
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
