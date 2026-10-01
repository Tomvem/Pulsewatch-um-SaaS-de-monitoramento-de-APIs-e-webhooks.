import nodemailer from "nodemailer";

const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const smtpHost = process.env.SMTP_HOST;

const transporter = smtpHost ? nodemailer.createTransport({
  host: smtpHost,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    : undefined,
  pool: true,
  maxConnections: 3,
  disableFileAccess: true,
  disableUrlAccess: true,
}) : null;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
}

async function sendEmail(input: { to: string; subject: string; text: string; html: string; previewUrl?: string }) {
  if (!transporter) {
    if (process.env.NODE_ENV === "production") throw new Error("SMTP não configurado");
    return { delivered: false, previewUrl: input.previewUrl };
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Pulsewatch <no-reply@pulsewatch.local>",
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { delivered: true, previewUrl: undefined };
}

export function sendVerificationEmail(input: { email: string; name: string; token: string }) {
  const url = `${appUrl}/verify-email?token=${encodeURIComponent(input.token)}`;
  const name = escapeHtml(input.name);
  return sendEmail({
    to: input.email,
    subject: "Confirme o seu email — Pulsewatch",
    text: `Olá, ${input.name}. Confirme o seu email: ${url}. Este link expira em 8 horas.`,
    html: `<h2>Olá, ${name}</h2><p>Confirme o seu email para ativar a conta Pulsewatch.</p><p><a href="${url}">Confirmar email</a></p><p>Este link expira em 8 horas.</p>`,
    previewUrl: url,
  });
}

export function sendPasswordResetEmail(input: { email: string; name: string; token: string }) {
  const url = `${appUrl}/reset-password?token=${encodeURIComponent(input.token)}`;
  const name = escapeHtml(input.name);
  return sendEmail({
    to: input.email,
    subject: "Recupere a sua senha — Pulsewatch",
    text: `Olá, ${input.name}. Redefina a sua senha: ${url}. Este link expira em 30 minutos.`,
    html: `<h2>Olá, ${name}</h2><p>Recebemos um pedido para redefinir a sua senha.</p><p><a href="${url}">Criar nova senha</a></p><p>Este link expira em 30 minutos. Ignore esta mensagem se não fez o pedido.</p>`,
    previewUrl: url,
  });
}

export function sendPasswordChangedEmail(input: { email: string; name: string }) {
  return sendEmail({
    to: input.email,
    subject: "A sua senha foi alterada — Pulsewatch",
    text: `Olá, ${input.name}. A senha da sua conta Pulsewatch foi alterada. Se não reconhece esta ação, contacte o suporte imediatamente.`,
    html: `<h2>Olá, ${escapeHtml(input.name)}</h2><p>A senha da sua conta Pulsewatch foi alterada.</p><p>Se não reconhece esta ação, contacte o suporte imediatamente.</p>`,
  });
}
