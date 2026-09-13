import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dnsPromises from 'dns/promises';
import net from 'net';

dotenv.config();

/**
 * Resolves a hostname directly to an IPv4 address.
 * Because cloud container environments (Render/AWS) do not have outbound IPv6 routing,
 * resolving to IPv4 prevents Nodemailer from randomly attempting unreachable IPv6 addresses.
 */
export const resolveIpv4Host = async (hostname) => {
  if (!hostname || net.isIP(hostname)) {
    return { host: hostname, servername: hostname };
  }

  try {
    const addresses = await dnsPromises.resolve4(hostname);
    if (addresses && addresses.length > 0) {
      return { host: addresses[0], servername: hostname };
    }
  } catch (err) {
    console.warn(`IPv4 DNS resolution fallback for ${hostname}: ${err.message}`);
  }

  return { host: hostname, servername: hostname };
};

/**
 * Defensive configuration resolver.
 * Trims whitespace, strips accidental wrapping quotes, and resolves provider priority.
 */
export const getEmailConfig = () => {
  const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').replace(/^["']|["']$/g, '').trim();
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

  const defaultPort = 587;
  const SMTP_PORT = portStr ? parseInt(portStr, 10) || defaultPort : defaultPort;

  const isBrevoConfigured = Boolean(BREVO_API_KEY && !BREVO_API_KEY.includes('placeholder'));
  const isResendConfigured = Boolean(RESEND_API_KEY && !RESEND_API_KEY.includes('placeholder'));

  // Provider selection: prioritize Brevo or Resend for cloud delivery to all recipients
  let preferredProvider = 'none';
  if (process.env.EMAIL_PROVIDER === 'brevo' && isBrevoConfigured) {
    preferredProvider = 'brevo';
  } else if (isBrevoConfigured) {
    preferredProvider = 'brevo';
  } else if (process.env.EMAIL_PROVIDER === 'resend' && isResendConfigured) {
    preferredProvider = 'resend';
  } else if (isSmtpConfigured) {
    preferredProvider = 'smtp';
  } else if (isResendConfigured) {
    preferredProvider = 'resend';
  }

  return {
    BREVO_API_KEY,
    isBrevoConfigured,
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
  console.log(`   - Brevo configured: ${cfg.isBrevoConfigured}`);
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
 * TCP Port Prober to test network reachability to SMTP ports within cloud containers.
 */
export const probeTcpPort = (host, port, timeoutMs = 3000) => {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let isDone = false;

    const finish = (reachable, error = null) => {
      if (!isDone) {
        isDone = true;
        socket.removeAllListeners();
        socket.destroy();
        resolve({
          port,
          reachable,
          error,
          latencyMs: Date.now() - start
        });
      }
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false, 'ETIMEDOUT'));
    socket.once('error', (err) => finish(false, err.code || err.message));

    socket.connect(port, host);
  });
};

/**
 * Creates a Nodemailer transporter with direct IPv4 resolution to prevent ENETUNREACH on Render.
 */
export const createSmtpTransporter = async (options = {}) => {
  const cfg = getEmailConfig();

  const targetHost = options.host || cfg.SMTP_HOST || 'smtp.gmail.com';
  const { host: ipv4Host, servername } = await resolveIpv4Host(targetHost);

  const port = options.port || cfg.SMTP_PORT;
  const secure = options.secure !== undefined ? options.secure : (port === 465);

  return nodemailer.createTransport({
    host: ipv4Host,
    port,
    secure,
    servername,
    auth: {
      user: cfg.SMTP_USER,
      pass: cfg.SMTP_PASS
    },
    tls: {
      servername,
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
};

/**
 * Safe verification helper to validate SMTP/Resend connection without sending an email.
 */
export const verifyEmailConfig = async (options = {}) => {
  const cfg = getEmailConfig();
  const maskedUser = cfg.SMTP_USER ? cfg.SMTP_USER.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null;
  const targetHost = cfg.SMTP_HOST || 'smtp.gmail.com';
  const { host: ipv4Host } = await resolveIpv4Host(targetHost);

  // Probe both standard SMTP ports in parallel
  const [probe465, probe587] = await Promise.all([
    probeTcpPort(ipv4Host, 465, 3000),
    probeTcpPort(ipv4Host, 587, 3000)
  ]);

  const networkProbes = {
    resolvedIpv4: ipv4Host,
    port465: probe465,
    port587: probe587
  };

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
    resendConfigured: cfg.isResendConfigured,
    networkProbes
  };

  if (!cfg.isSmtpConfigured && !cfg.isResendConfigured) {
    return {
      success: false,
      message: 'No email credentials configured. Please set SMTP_USER and SMTP_PASS in Render environment variables.',
      diagnostics
    };
  }

  if (cfg.preferredProvider === 'smtp') {
    // Determine primary port:
    // If explicitly requested via options.port (e.g. from query param ?port=465), use that.
    // Otherwise, if port 465 probe succeeded and 587 failed, automatically select 465.
    let primaryPort = options.port ? parseInt(options.port, 10) : cfg.SMTP_PORT || 587;
    if (!options.port && probe465.reachable && !probe587.reachable) {
      primaryPort = 465;
    }

    const altPort = primaryPort === 465 ? 587 : 465;
    let primaryResult = null;
    let fallbackResult = null;

    try {
      const transporter = await createSmtpTransporter({ port: primaryPort, secure: primaryPort === 465 });
      await transporter.verify();
      return {
        success: true,
        message: `Gmail SMTP verified successfully on port ${primaryPort}.`,
        diagnostics: { ...diagnostics, activePort: primaryPort }
      };
    } catch (err) {
      primaryResult = {
        port: primaryPort,
        error: err.message,
        code: err.code || null,
        command: err.command || null,
        response: err.response || null
      };
      console.error(`❌ [SMTP Verify Error on port ${primaryPort}]: ${err.message}`);

      // Attempt alternate port fallback
      try {
        console.log(`🔄 Attempting fallback verification via port ${altPort}...`);
        const fallbackTransporter = await createSmtpTransporter({ port: altPort, secure: altPort === 465 });
        await fallbackTransporter.verify();
        return {
          success: true,
          message: `Gmail SMTP verified successfully via fallback (port ${altPort}).`,
          diagnostics: { ...diagnostics, activePort: altPort, fallbackUsed: true, primaryAttempt: primaryResult }
        };
      } catch (fallbackErr) {
        fallbackResult = {
          port: altPort,
          error: fallbackErr.message,
          code: fallbackErr.code || null,
          command: fallbackErr.command || null,
          response: fallbackErr.response || null
        };
        console.error(`❌ [SMTP Fallback Verify Failed on port ${altPort}]: ${fallbackErr.message}`);
      }

      return {
        success: false,
        message: `SMTP verification failed on both ports (${primaryPort} & ${altPort}): ${err.message}`,
        error: primaryResult,
        fallbackError: fallbackResult,
        diagnostics
      };
    }
  }

  if (cfg.preferredProvider === 'brevo') {
    try {
      const resp = await fetch('https://api.brevo.com/v3/account', {
        headers: {
          'accept': 'application/json',
          'api-key': cfg.BREVO_API_KEY
        }
      });
      const data = await resp.json();
      if (!resp.ok) {
        return {
          success: false,
          message: `Brevo API key verification failed: ${data.message || resp.statusText}`,
          diagnostics: { ...diagnostics, brevoConfigured: true }
        };
      }
      return {
        success: true,
        message: `Brevo API verified successfully. Account: ${data.email || 'active'}. Ready to send OTPs to all students.`,
        diagnostics: { ...diagnostics, brevoConfigured: true, brevoAccount: data.email }
      };
    } catch (err) {
      return {
        success: false,
        message: `Brevo verification error: ${err.message}`,
        diagnostics: { ...diagnostics, brevoConfigured: true }
      };
    }
  }

  if (cfg.preferredProvider === 'resend') {
    try {
      const resendClient = new Resend(cfg.RESEND_API_KEY);
      const keys = await resendClient.apiKeys.list();
      if (keys.error) {
        return {
          success: false,
          message: `Resend API key check failed: ${keys.error.message}`,
          diagnostics
        };
      }
      return {
        success: true,
        message: 'Resend API key verified successfully via HTTPS port 443.',
        diagnostics
      };
    } catch (resendErr) {
      return {
        success: true,
        message: 'Resend email provider configured.',
        diagnostics
      };
    }
  }

  return {
    success: true,
    message: 'Email provider configured.',
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
    // For Gmail SMTP, ensure the 'from' address uses the authenticated Gmail address
    const fromAddress = (cfg.isGmail && (!cfg.OTP_FROM_EMAIL || cfg.OTP_FROM_EMAIL.includes('resend.dev')))
      ? `BookBridge <${cfg.SMTP_USER}>`
      : (cfg.OTP_FROM_EMAIL || `BookBridge <${cfg.SMTP_USER}>`);

    const trySend = async (transportOptions) => {
      const transporter = await createSmtpTransporter(transportOptions);
      return await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        html: htmlContent
      });
    };

    const primaryPort = cfg.SMTP_PORT || 587;
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

      // Attempt alternate port (587 <-> 465)
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

  // 1. Dispatch via Brevo REST API (HTTPS port 443 - Can send to ANY recipient worldwide)
  if (cfg.preferredProvider === 'brevo') {
    const rawSender = cfg.OTP_FROM_EMAIL || cfg.SMTP_USER || 'aleenax657@gmail.com';
    const senderEmail = (rawSender.includes('<') ? rawSender.replace(/.*<([^>]+)>.*/, '$1') : rawSender).trim();
    const senderName = 'BookBridge';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': cfg.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: studentName || 'Student' }],
        subject,
        htmlContent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ [Brevo API Error ${response.status}]: ${data.message || JSON.stringify(data)}`);
      throw new Error(`Brevo API Error: ${data.message || response.statusText}`);
    }

    console.log(`✉️ [Brevo] Real OTP email sent successfully to ${toEmail} (MessageId: ${data.messageId})`);
    return { success: true, provider: 'brevo', messageId: data.messageId };
  }

  // 2. Dispatch via Resend API (if Resend is active provider)
  if (cfg.preferredProvider === 'resend') {
    const resendClient = new Resend(cfg.RESEND_API_KEY);
    // Resend requires sending from onboarding@resend.dev unless a custom domain is verified.
    // Setting an unverified @gmail.com from address will cause Resend API 403 error.
    let resendFrom = 'BookBridge <onboarding@resend.dev>';
    if (cfg.OTP_FROM_EMAIL && !cfg.OTP_FROM_EMAIL.includes('@gmail.com') && !cfg.OTP_FROM_EMAIL.includes('@yahoo.com') && !cfg.OTP_FROM_EMAIL.includes('@hotmail.com') && !cfg.OTP_FROM_EMAIL.includes('@outlook.com')) {
      resendFrom = cfg.OTP_FROM_EMAIL;
    }

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
