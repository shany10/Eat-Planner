import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

type PasswordResetEmailInput = {
  firstname: string;
  to: string;
  resetUrl: string;
};

let transporter: nodemailer.Transporter | null = null;

function getEnvValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value !== undefined && value !== "") {
      return value;
    }
  }

  return undefined;
}

function shouldLogMail() {
  return getEnvValue("SMTP_MODE", "MAIL_MODE") === "log";
}

function parseBooleanEnv(value: string | undefined) {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function isGmailHost(host: string | undefined) {
  return host?.toLowerCase().includes("gmail.com") ?? false;
}

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

function extractDisplayName(value: string) {
  const match = value.match(/^\s*"?([^"<]+?)"?\s*</);
  return match?.[1]?.trim();
}

function resolveFromAddress() {
  const configuredFrom = getEnvValue("SMTP_FROM", "MAIL_FROM");
  const smtpUser = getEnvValue("SMTP_USER", "MAIL_USER");
  const host = getEnvValue("SMTP_HOST", "MAIL_HOST");

  if (!configuredFrom) {
    return smtpUser;
  }

  if (!smtpUser || !isGmailHost(host)) {
    return configuredFrom;
  }

  if (extractEmailAddress(configuredFrom) === extractEmailAddress(smtpUser)) {
    return configuredFrom;
  }

  const appName = getEnvValue("SMTP_APP_NAME", "MAIL_APP_NAME") ?? "EatPlanner";
  const displayName = extractDisplayName(configuredFrom) ?? appName;

  return `${displayName} <${smtpUser}>`;
}

function hasMailConfig() {
  return Boolean(
    getEnvValue("SMTP_HOST", "MAIL_HOST")
      && (getEnvValue("SMTP_FROM", "MAIL_FROM") || getEnvValue("SMTP_USER", "MAIL_USER"))
  );
}

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const host = getEnvValue("SMTP_HOST", "MAIL_HOST");
  if (!host) {
    throw new Error("SMTP_HOST is not configured");
  }

  const port = Number(getEnvValue("SMTP_PORT", "MAIL_PORT") ?? 587);
  const secure = parseBooleanEnv(getEnvValue("SMTP_SECURE", "MAIL_SECURE")) ?? false;
  const transportOptions: SMTPTransport.Options = {
    host,
    port,
    secure
  };
  const tlsRejectUnauthorized = parseBooleanEnv(
    getEnvValue("SMTP_TLS_REJECT_UNAUTHORIZED", "MAIL_TLS_REJECT_UNAUTHORIZED")
  );

  if (tlsRejectUnauthorized !== undefined) {
    transportOptions.tls = {
      rejectUnauthorized: tlsRejectUnauthorized
    };
  }

  const user = getEnvValue("SMTP_USER", "MAIL_USER");
  const rawPass = getEnvValue("SMTP_PASS", "MAIL_PASS");
  const pass = isGmailHost(host) ? rawPass?.replace(/\s+/g, "") : rawPass;

  if (user && pass) {
    transportOptions.auth = {
      user,
      pass
    };
  }

  transporter = nodemailer.createTransport(transportOptions);

  return transporter;
}

export async function sendPasswordResetEmail({ firstname, to, resetUrl }: PasswordResetEmailInput) {
  const appName = getEnvValue("SMTP_APP_NAME", "MAIL_APP_NAME") ?? "EatPlanner";
  const from = resolveFromAddress();

  if (shouldLogMail() || !hasMailConfig() || !from) {
    console.warn(`[mail] SMTP not configured. Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const mailer = getTransporter();

  await mailer.sendMail({
    from,
    to,
    subject: `${appName} - Reinitialisation du mot de passe`,
    text: [
      `Bonjour ${firstname},`,
      "",
      "Tu as demande la reinitialisation de ton mot de passe.",
      `Utilise ce lien pour definir un nouveau mot de passe : ${resetUrl}`,
      "",
      "Si tu n es pas a l origine de cette demande, ignore simplement cet email."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin-bottom: 12px;">Reinitialisation du mot de passe</h2>
        <p>Bonjour ${firstname},</p>
        <p>Tu as demande la reinitialisation de ton mot de passe.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; background: #0f172a; color: #ffffff; text-decoration: none; border-radius: 10px;">
            Definir un nouveau mot de passe
          </a>
        </p>
        <p>Si tu n es pas a l origine de cette demande, ignore simplement cet email.</p>
        <p style="font-size: 12px; color: #64748b;">Lien direct : ${resetUrl}</p>
      </div>
    `
  });
}
