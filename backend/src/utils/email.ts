import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

type PasswordResetEmailInput = {
  firstname: string;
  to: string;
  resetUrl: string;
};

type SupplierOrderEmailLine = {
  ingredientName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
};

type SupplierOrderEmailInput = {
  to: string;
  supplierName: string;
  orderNumber: string;
  restaurantName: string;
  deliveryAddress: string;
  estimatedDeliveryDate?: string | undefined;
  totalInclTax: number;
  supplierSubtotal: number;
  notes?: string | undefined;
  items: SupplierOrderEmailLine[];
};

type SupplierMessageEmailInput = {
  to: string;
  supplierName: string;
  restaurantName: string;
  subject: string;
  body: string;
};

type AppEmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
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

function formatCurrency(value: number) {
  return `${Number(value || 0).toFixed(2)} EUR`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendAppEmail(message: AppEmailMessage, logLabel: string) {
  const from = resolveFromAddress();

  if (shouldLogMail() || !hasMailConfig() || !from) {
    console.warn(`[mail] SMTP not configured. ${logLabel} for ${message.to}:\n${message.text}`);
    return { mode: "log" as const };
  }

  const mailer = getTransporter();

  await mailer.sendMail({
    from,
    ...message
  });

  return { mode: "smtp" as const };
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

  await sendAppEmail({
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
  }, "Password reset link");
}

export async function sendSupplierOrderEmail({
  to,
  supplierName,
  orderNumber,
  restaurantName,
  deliveryAddress,
  estimatedDeliveryDate,
  totalInclTax,
  supplierSubtotal,
  notes,
  items
}: SupplierOrderEmailInput) {
  const appName = getEnvValue("SMTP_APP_NAME", "MAIL_APP_NAME") ?? "Eat Planner";
  const subject = `${appName} - Commande ${orderNumber}`;
  const lines = items.map((item) =>
    `- ${item.ingredientName}: ${item.quantity} ${item.unit} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.lineTotal)}`
  );

  return await sendAppEmail({
    to,
    subject,
    text: [
      `Bonjour ${supplierName},`,
      "",
      `${restaurantName} vous transmet une commande fournisseur.`,
      `Commande: ${orderNumber}`,
      estimatedDeliveryDate ? `Livraison souhaitee/estimee: ${estimatedDeliveryDate}` : "",
      `Adresse: ${deliveryAddress || "-"}`,
      "",
      "Articles:",
      ...lines,
      "",
      `Sous-total fournisseur: ${formatCurrency(supplierSubtotal)}`,
      `Total commande TTC: ${formatCurrency(totalInclTax)}`,
      notes ? `Commentaire: ${notes}` : "",
      "",
      "Ceci est un email de demonstration envoye depuis Eat Planner."
    ].filter(Boolean).join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1a1c1c;">
        <h2 style="margin: 0 0 12px;">Commande fournisseur ${escapeHtml(orderNumber)}</h2>
        <p>Bonjour ${escapeHtml(supplierName)},</p>
        <p><strong>${escapeHtml(restaurantName)}</strong> vous transmet une commande fournisseur.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
          <thead>
            <tr>
              <th style="border-bottom: 1px solid #d7ddd2; padding: 8px; text-align: left;">Article</th>
              <th style="border-bottom: 1px solid #d7ddd2; padding: 8px; text-align: right;">Quantite</th>
              <th style="border-bottom: 1px solid #d7ddd2; padding: 8px; text-align: right;">Prix</th>
              <th style="border-bottom: 1px solid #d7ddd2; padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td style="border-bottom: 1px solid #edf0ea; padding: 8px;">${escapeHtml(item.ingredientName)}</td>
                <td style="border-bottom: 1px solid #edf0ea; padding: 8px; text-align: right;">${item.quantity} ${escapeHtml(item.unit)}</td>
                <td style="border-bottom: 1px solid #edf0ea; padding: 8px; text-align: right;">${formatCurrency(item.unitPrice)}</td>
                <td style="border-bottom: 1px solid #edf0ea; padding: 8px; text-align: right;"><strong>${formatCurrency(item.lineTotal)}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p><strong>Sous-total fournisseur:</strong> ${formatCurrency(supplierSubtotal)}</p>
        <p><strong>Total commande TTC:</strong> ${formatCurrency(totalInclTax)}</p>
        <p><strong>Livraison:</strong> ${escapeHtml(estimatedDeliveryDate || "-")}</p>
        <p><strong>Adresse:</strong> ${escapeHtml(deliveryAddress || "-")}</p>
        ${notes ? `<p><strong>Commentaire:</strong> ${escapeHtml(notes)}</p>` : ""}
        <p style="margin-top: 18px; color: #64748b; font-size: 12px;">Email de demonstration envoye depuis Eat Planner.</p>
      </div>
    `
  }, `Supplier order ${orderNumber}`);
}

export async function sendSupplierMessageEmail({
  to,
  supplierName,
  restaurantName,
  subject,
  body
}: SupplierMessageEmailInput) {
  const appName = getEnvValue("SMTP_APP_NAME", "MAIL_APP_NAME") ?? "Eat Planner";
  const mailSubject = `${appName} - ${subject}`;
  const escapedBody = escapeHtml(body).replace(/\n/g, "<br>");

  return await sendAppEmail({
    to,
    subject: mailSubject,
    text: [
      `Bonjour ${supplierName},`,
      "",
      `${restaurantName} vous envoie un message depuis Eat Planner.`,
      "",
      body,
      "",
      "Ceci est un email de demonstration envoye depuis Eat Planner."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1a1c1c;">
        <p>Bonjour ${escapeHtml(supplierName)},</p>
        <p><strong>${escapeHtml(restaurantName)}</strong> vous envoie un message depuis Eat Planner.</p>
        <div style="margin: 18px 0; padding: 14px 16px; border: 1px solid #d7ddd2; border-radius: 8px; background: #f8faf7;">
          ${escapedBody}
        </div>
        <p style="margin-top: 18px; color: #64748b; font-size: 12px;">Email de demonstration envoye depuis Eat Planner.</p>
      </div>
    `
  }, `Supplier message ${subject}`);
}
