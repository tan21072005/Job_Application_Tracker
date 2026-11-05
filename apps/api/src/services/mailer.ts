import { createTransport, type Transporter } from 'nodemailer';

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type MailerMode = 'smtp' | 'brevo-api' | 'console';

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before sending mail through this transport.`);
  return value;
};

export const mailerMode = (): MailerMode => {
  const configured = (process.env.MAIL_TRANSPORT || '').toLowerCase();
  if (configured === 'console') return 'console';
  if (configured === 'brevo-api') return 'brevo-api';
  if (configured === 'smtp') return 'smtp';
  return process.env.BREVO_API_KEY ? 'brevo-api' : process.env.SMTP_HOST ? 'smtp' : 'console';
};

let cached: Transporter | null = null;

const transport = (): Transporter => {
  if (cached) return cached;
  const port = Number(process.env.SMTP_PORT || 587);
  cached = createTransport({
    host: required('SMTP_HOST'),
    port,
    secure: port === 465,
    auth: {
      user: required('SMTP_USER'),
      pass: required('SMTP_PASSWORD')
    },
    requireTLS: port !== 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  });
  return cached;
};

const redact = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 2)}***@${domain}`;
};

const parseFrom = (raw: string): { name?: string; email: string } => {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || undefined, email: match[2].trim() };
  return { email: raw.trim() };
};

async function sendThroughBrevoApi(mail: OutboundMail): Promise<void> {
  const apiKey = required('BREVO_API_KEY');
  const sender = parseFrom(required('SMTP_FROM'));

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender,
      to: [{ email: mail.to }],
      subject: mail.subject,
      textContent: mail.text,
      ...(mail.html ? { htmlContent: mail.html } : {})
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Brevo API ${response.status}: ${detail.slice(0, 300)}`);
  }
}

export async function sendMail(mail: OutboundMail): Promise<{ delivered: boolean; transport: MailerMode }> {
  const mode = mailerMode();

  if (mode === 'console') {
    console.info(`[mail:console] to=${redact(mail.to)} subject=${JSON.stringify(mail.subject)}`);
    console.info(`[mail:console] body:\n${mail.text}`);
    return { delivered: false, transport: 'console' };
  }

  if (mode === 'brevo-api') {
    await sendThroughBrevoApi(mail);
    console.info(`[mail:brevo-api] to=${redact(mail.to)} subject=${JSON.stringify(mail.subject)}`);
    return { delivered: true, transport: 'brevo-api' };
  }

  await transport().sendMail({
    from: required('SMTP_FROM'),
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  });
  console.info(`[mail:smtp] to=${redact(mail.to)} subject=${JSON.stringify(mail.subject)}`);
  return { delivered: true, transport: 'smtp' };
}

export async function verifyMailer(): Promise<{ ok: boolean; transport: MailerMode; detail?: string }> {
  const mode = mailerMode();
  if (mode === 'console') return { ok: true, transport: 'console', detail: 'console transport never fails' };

  try {
    if (mode === 'brevo-api') {
      const response = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': required('BREVO_API_KEY'), accept: 'application/json' }
      });
      if (!response.ok) {
        const body = await response.text();
        return { ok: false, transport: mode, detail: `HTTP ${response.status}: ${body.slice(0, 200)}` };
      }
      return { ok: true, transport: mode };
    }
    await transport().verify();
    return { ok: true, transport: mode };
  } catch (error) {
    return { ok: false, transport: mode, detail: (error as Error).message };
  }
}
