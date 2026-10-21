// Sends email through Resend. With no RESEND_API_KEY (local preview) each
// email is written to .email-previews/ so you can open it in a browser.
import "server-only";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "Braid with Abi <bookings@braidwithabi.ca>";
const REPLY_TO = process.env.EMAIL_REPLY_TO || "hello@braidwithabi.ca";
export const OWNER_EMAIL = process.env.OWNER_EMAIL || REPLY_TO;

let resend: Resend | null = null;

export async function sendEmail(opts: { to: string; subject: string; html: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    await savePreview(opts);
    return;
  }
  try {
    resend ??= new Resend(key);
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      replyTo: opts.replyTo ?? REPLY_TO,
    });
    if (error) console.error("[email] Resend error:", error);
  } catch (e) {
    // Email must never break a booking — log and carry on.
    console.error("[email] failed:", e);
  }
}

async function savePreview(opts: { to: string; subject: string; html: string }) {
  console.log(`[email:preview] to=${opts.to} subject="${opts.subject}"`);
  if (process.env.VERCEL) return;
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), ".email-previews");
    await fs.mkdir(dir, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${opts.subject
      .replace(/[^a-z0-9]+/gi, "-")
      .slice(0, 50)}.html`;
    await fs.writeFile(
      path.join(dir, name),
      `<!-- To: ${opts.to} | Subject: ${opts.subject} -->\n<meta charset="utf-8">${opts.html}`
    );
  } catch (e) {
    console.error("[email:preview] could not save", e);
  }
}
