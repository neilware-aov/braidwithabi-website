// ============================================================
// All the words on the website live here.
// PLACEHOLDER TEXT — go through it with Abi and change anything that
// doesn't match how she actually works (prices/hours/deposit amounts are
// edited in the owner app instead, they are not in this file).
// ============================================================

export const business = {
  name: "Braid with Abi",
  tagline: "Neat parts. Gentle hands. Braids you'll love.",
  // Shown publicly. The exact address is only emailed to booked clients (set it in the app).
  area: "Toronto, ON",
  studio: "Private home studio",
};

// The "Chat with me" buttons. Leave any of these as "" to hide that button.
export const contact = {
  whatsapp: "14165550123", // digits only, with the 1 in front
  instagram: "braidwithabi", // username without @
  tiktok: "braidwithabi",
  facebook: "", // Facebook page username → opens Messenger
  snapchat: "",
  phone: "+1 (416) 555-0123", // for "Text me"
  email: "hello@braidwithabi.ca",
};

export type ChatLink = { id: string; label: string; handle: string; href: string };

export function chatLinks(): ChatLink[] {
  const c = contact;
  const digits = c.phone.replace(/[^\d+]/g, "");
  const all: Array<ChatLink | false> = [
    !!c.whatsapp && { id: "whatsapp", label: "WhatsApp", handle: c.phone, href: `https://wa.me/${c.whatsapp}` },
    !!c.instagram && { id: "instagram", label: "Instagram", handle: `@${c.instagram}`, href: `https://ig.me/m/${c.instagram}` },
    !!c.tiktok && { id: "tiktok", label: "TikTok", handle: `@${c.tiktok}`, href: `https://www.tiktok.com/@${c.tiktok}` },
    !!c.facebook && { id: "messenger", label: "Messenger", handle: c.facebook, href: `https://m.me/${c.facebook}` },
    !!c.snapchat && { id: "snapchat", label: "Snapchat", handle: c.snapchat, href: `https://www.snapchat.com/add/${c.snapchat}` },
    !!c.phone && { id: "sms", label: "Text me", handle: c.phone, href: `sms:${digits}` },
    !!c.email && { id: "email", label: "Email", handle: c.email, href: `mailto:${c.email}` },
  ];
  return all.filter(Boolean) as ChatLink[];
}

export const about = {
  title: "Hi, I'm Abi",
  paragraphs: [
    "I've been braiding since I was a little girl, and today I get to do what I love for amazing women across the city. Every appointment is calm, one-on-one and unrushed — just you, me, good music and a style you'll feel beautiful in.",
    "I care about the health of your hair as much as the look: neat parts, no unnecessary tension and edges that stay happy.",
  ],
  highlights: [
    { value: "8+", label: "years braiding" },
    { value: "1:1", label: "private appointments" },
    { value: "♡", label: "gentle on edges" },
  ],
};

export const hairPrep = {
  title: "Before your appointment",
  intro: "A little preparation makes your braids neater, faster and longer-lasting.",
  steps: [
    { title: "Wash & condition", text: "Come with freshly washed, deep-conditioned hair." },
    { title: "Detangle", text: "Hair should be fully detangled from root to tip." },
    { title: "Blow dry / stretch", text: "Hair must be blown out or well stretched — no wet or shrunken hair." },
    { title: "Product-free", text: "No heavy oils, gels or butters on the day." },
  ],
  blowDry: {
    title: "No time to blow dry?",
    text: "No problem — just choose “Add blow-dry” when you book and I'll blow dry and stretch your (clean, detangled) hair before we start.",
  },
  hairNote: "Braiding hair is not included unless the style says so. I'll tell you which colour and how many packs to bring once you book.",
};

export const policies = [
  {
    id: "deposit",
    title: "Deposit & installments",
    points: [
      "A non-refundable deposit is required to secure your appointment and is taken off your total.",
      "Send the deposit by Interac e-Transfer within 24 hours of booking to keep your spot.",
      "Styles over $200 can be paid in installments: deposit at booking, a second payment up to 3 days before, and the balance on the day.",
      "The balance is due before you leave — cash or e-Transfer.",
    ],
  },
  {
    id: "late",
    title: "Late policy",
    points: [
      "There is a 15-minute grace period.",
      "After 15 minutes, a $15 late fee applies.",
      "After 30 minutes, the appointment may be cancelled and the deposit kept.",
      "Please come alone — no extra guests (children only for kids' appointments).",
    ],
  },
  {
    id: "booking",
    title: "Booking",
    points: [
      "Choose your style, pick a time, and send your deposit — that's it.",
      "You'll get an email right away, a reminder the day before (with the address) and another a couple of hours before.",
      "Bring inspiration photos if you have a specific look in mind.",
      "Need a date you can't see? Send me a message — the chat buttons are at the bottom of the page.",
    ],
  },
  {
    id: "changes",
    title: "Rescheduling & cancellation",
    points: [
      "You can reschedule once, free, up to 48 hours before — use the link in your confirmation email.",
      "Cancellations or changes within 48 hours lose the deposit.",
      "No-shows lose the deposit and may need to pay in full to book again.",
    ],
  },
];

export const heroImages = [
  "/images/hero/hero-1.jpg",
  "/images/hero/hero-2.jpg",
  "/images/hero/hero-3.jpg",
  "/images/hero/hero-4.jpg",
  "/images/hero/hero-5.jpg",
];

export const aboutImage = "/images/about.jpg";
