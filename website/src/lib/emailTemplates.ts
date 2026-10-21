// Email-client-safe (table based, inline styles) templates.
import { DateTime } from "luxon";
import { business, contact } from "./content";
import { duration, firstName, fmtDateTime, fmtTime, money } from "./format";
import type { Booking, Settings } from "./types";

const C = {
  bg: "#f6efe8",
  card: "#fffdf9",
  ink: "#2e211d",
  muted: "#7a6a63",
  rose: "#a65e4e",
  blush: "#f3e4dc",
  line: "#eadfd5",
};

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "https://braidwithabi.ca";
export const manageUrl = (b: Booking) => `${siteUrl()}/booking/${b.manage_token}`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function shell(preheader: string, body: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${C.bg};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:28px 12px;">
<tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${C.card};border-radius:14px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:${C.ink};">
    <tr><td style="padding:28px 32px 6px;text-align:center;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:28px;color:${C.ink};">${business.name}</div>
      <div style="width:40px;height:2px;background:${C.rose};margin:12px auto 0;"></div>
    </td></tr>
    <tr><td style="padding:18px 32px 30px;font-size:15px;line-height:1.6;">${body}</td></tr>
    <tr><td style="padding:16px 32px;background:${C.blush};font-size:12px;color:${C.muted};text-align:center;line-height:1.6;">
      ${business.name} · ${business.area}<br>
      Instagram <a style="color:${C.rose};" href="https://instagram.com/${contact.instagram}">@${contact.instagram}</a> ·
      <a style="color:${C.rose};" href="mailto:${contact.email}">${contact.email}</a>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

const h1 = (t: string) =>
  `<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:24px;margin:0 0 12px;color:${C.ink};">${t}</h1>`;
const p = (t: string) => `<p style="margin:0 0 14px;">${t}</p>`;

function details(b: Booking, s: Settings, extra: Array<[string, string]> = []) {
  const rows: Array<[string, string]> = [
    ["Style", esc(b.style_name) + (b.variant_label ? ` — ${esc(b.variant_label)}` : "")],
    ["When", fmtDateTime(b.starts_at, s.timezone)],
    ["Length", `about ${duration(Math.round((Date.parse(b.ends_at) - Date.parse(b.starts_at)) / 60000))}`],
    ...(b.blow_dry ? ([["Blow-dry", "Included"]] as Array<[string, string]>) : []),
    ["Total", money(b.price_total)],
    ["Booking code", `<strong>${b.code}</strong>`],
    ...extra,
  ];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border-top:1px solid ${C.line};">
  ${rows
    .map(
      ([k, v]) => `<tr>
      <td style="padding:9px 0;border-bottom:1px solid ${C.line};color:${C.muted};font-size:13px;width:38%;vertical-align:top;">${k}</td>
      <td style="padding:9px 0;border-bottom:1px solid ${C.line};font-size:14px;">${v}</td></tr>`
    )
    .join("")}
  </table>`;
}

function callout(html: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;">
  <tr><td style="background:${C.blush};border-radius:10px;padding:16px 18px;font-size:14px;line-height:1.6;">${html}</td></tr></table>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;"><tr>
  <td style="background:${C.ink};border-radius:999px;"><a href="${href}" style="display:inline-block;padding:12px 24px;color:#fff;text-decoration:none;font-size:14px;">${label}</a></td>
  </tr></table>`;
}

function depositSteps(b: Booking, s: Settings) {
  return callout(`<strong>Please send your ${money(b.deposit_amount)} deposit</strong><br>
  1. Interac e-Transfer to <strong>${esc(s.etransfer_email)}</strong><br>
  2. In the message write: <strong>${b.code} – ${esc(firstName(b.client_name))}</strong><br>
  3. Send within <strong>${s.deposit_hold_hours} hours</strong> to keep your spot.<br>
  The deposit comes off your total on the day.`);
}

function gcalLink(b: Booking) {
  const f = (iso: string) => DateTime.fromISO(iso).toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${b.style_name} — ${business.name}`,
    dates: `${f(b.starts_at)}/${f(b.ends_at)}`,
    details: `Booking ${b.code}. Manage: ${manageUrl(b)}`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

const prepReminder = (b: Booking) =>
  callout(`<strong>Hair prep reminder</strong><br>
  Please come with hair washed, detangled${b.blow_dry ? "" : ", blown out/stretched"} and free of heavy products.
  ${b.blow_dry ? "Your blow-dry is included, so just come with clean, detangled hair." : ""}
  There's a 15-minute grace period — after that a late fee applies.`);

// ── Client emails ──────────────────────────────────────────────

const whereRow = (s: Settings): Array<[string, string]> =>
  s.address_details ? [["Where", esc(s.address_details).replace(/\n/g, "<br>")]] : [];

export function clientBookingReceived(b: Booking, s: Settings) {
  return {
    subject: `You're booked for ${DateTime.fromISO(b.starts_at, { zone: s.timezone }).toFormat("cccc, LLL d")} ✨ (${b.code})`,
    html: shell(
      b.deposit_paid ? "Your appointment is booked." : "Your appointment is booked — send your deposit to keep it.",
      h1(`Thank you, ${esc(firstName(b.client_name))}!`) +
        p("Your appointment is booked. Here are the details:") +
        (b.deposit_paid ? "" : depositSteps(b, s)) +
        details(b, s) +
        prepReminder(b) +
        p(`I'll send you a reminder with the address the day before. Need to change something? You can manage your booking here:`) +
        button(manageUrl(b), "View or change booking") +
        p(`See you soon,<br>Abi`)
    ),
  };
}

export function clientDepositReceived(b: Booking, s: Settings) {
  return {
    subject: `Deposit received — see you ${DateTime.fromISO(b.starts_at, { zone: s.timezone }).toFormat("cccc, LLL d")} ✨`,
    html: shell(
      "Deposit received — your appointment is confirmed.",
      h1(`You're all set, ${esc(firstName(b.client_name))}!`) +
        p(`I received your ${money(b.deposit_amount)} deposit — thank you!`) +
        details(b, s, [["Balance due on the day", money(Math.max(0, b.price_total - b.deposit_amount))], ...whereRow(s)]) +
        button(gcalLink(b), "Add to my calendar") +
        p(`Can't wait to see you,<br>Abi`)
    ),
  };
}

export function clientReminder(b: Booking, s: Settings) {
  return {
    subject: `See you tomorrow at ${fmtTime(b.starts_at, s.timezone)} 💕`,
    html: shell(
      "A quick reminder about your appointment tomorrow.",
      h1(`See you tomorrow, ${esc(firstName(b.client_name))}!`) +
        p("Just a friendly reminder about your appointment.") +
        details(b, s, whereRow(s)) +
        (b.deposit_paid ? "" : depositSteps(b, s)) +
        prepReminder(b) +
        p(`If something came up, please let me know as soon as possible: <a style="color:${C.rose};" href="${manageUrl(b)}">manage booking</a>.`) +
        p(`Abi`)
    ),
  };
}

export function clientSoon(b: Booking, s: Settings) {
  return {
    subject: `Today at ${fmtTime(b.starts_at, s.timezone)} — see you soon!`,
    html: shell(
      "Your appointment is in a couple of hours.",
      h1(`See you at ${fmtTime(b.starts_at, s.timezone)}, ${esc(firstName(b.client_name))}!`) +
        p("Your appointment is in about 2 hours.") +
        details(b, s, whereRow(s)) +
        p(`Running late? Please message me. There's a 15-minute grace period.`) +
        p(`Abi`)
    ),
  };
}

export function clientCancelled(b: Booking, s: Settings, byClient: boolean) {
  return {
    subject: `Your appointment has been cancelled (${b.code})`,
    html: shell(
      "Your appointment has been cancelled.",
      h1("Appointment cancelled") +
        p(
          byClient
            ? `Hi ${esc(firstName(b.client_name))}, as requested, your appointment has been cancelled.`
            : `Hi ${esc(firstName(b.client_name))}, unfortunately your appointment has been cancelled. If you have any questions, just reply to this email.`
        ) +
        details(b, s) +
        p(`Whenever you're ready, you can book again at <a style="color:${C.rose};" href="${siteUrl()}">${siteUrl().replace(/^https?:\/\//, "")}</a>.`) +
        p(`Abi`)
    ),
  };
}

export function clientRescheduled(b: Booking, s: Settings) {
  return {
    subject: `New time: ${fmtDateTime(b.starts_at, s.timezone)}`,
    html: shell(
      "Your appointment has a new time.",
      h1("Your appointment has moved") +
        p(`Hi ${esc(firstName(b.client_name))}, here are your updated appointment details:`) +
        details(b, s) +
        (b.deposit_paid ? "" : depositSteps(b, s)) +
        button(gcalLink(b), "Add to my calendar") +
        p(`Abi`)
    ),
  };
}

// ── Owner emails ───────────────────────────────────────────────

function clientBlock(b: Booking) {
  return callout(`<strong>${esc(b.client_name)}</strong><br>
  📞 <a style="color:${C.rose};" href="tel:${esc(b.client_phone)}">${esc(b.client_phone)}</a><br>
  ${b.client_email ? `✉️ <a style="color:${C.rose};" href="mailto:${esc(b.client_email)}">${esc(b.client_email)}</a><br>` : ""}
  ${b.client_notes ? `📝 ${esc(b.client_notes)}` : ""}`);
}

export function ownerNewBooking(b: Booking, s: Settings) {
  return {
    subject: `New booking: ${b.style_name} — ${DateTime.fromISO(b.starts_at, { zone: s.timezone }).toFormat("ccc LLL d, h:mm a")}`,
    html: shell(
      "You have a new booking.",
      h1("New booking 🎉") +
        p(`Watch for an e-Transfer of <strong>${money(b.deposit_amount)}</strong> with the message <strong>${b.code}</strong>, then tap <em>Deposit received</em> in the app.`) +
        details(b, s) +
        clientBlock(b)
    ),
  };
}

export function ownerClientChange(b: Booking, s: Settings, kind: "cancelled" | "rescheduled") {
  return {
    subject:
      kind === "cancelled"
        ? `Cancelled by client: ${b.client_name} (${b.code})`
        : `Rescheduled by client: ${b.client_name} → ${DateTime.fromISO(b.starts_at, { zone: s.timezone }).toFormat("ccc LLL d, h:mm a")}`,
    html: shell(
      `A client ${kind} their appointment.`,
      h1(kind === "cancelled" ? "A client cancelled" : "A client rescheduled") + details(b, s) + clientBlock(b)
    ),
  };
}
