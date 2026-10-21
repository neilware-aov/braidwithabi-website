// Same palette as the website so both feel like one brand.
export const colors = {
  cream: "#faf5ef",
  ivory: "#fffdf9",
  ink: "#2e211d",
  muted: "#7a6a63",
  faint: "#b3a59e",
  rose: "#a65e4e",
  roseDark: "#8c4c3e",
  blush: "#f3e4dc",
  line: "#eadfd5",
  gold: "#b8925a",
  green: "#3f7d5c",
  greenBg: "#e7f2ea",
  amber: "#8a6a35",
  amberBg: "#f6eddc",
  red: "#a8443a",
  redBg: "#f8e5e1",
};

export const fonts = {
  display: "CormorantGaramond_500Medium",
  displayItalic: "CormorantGaramond_500Medium_Italic",
  light: "Jost_300Light",
  regular: "Jost_400Regular",
  medium: "Jost_500Medium",
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

/** The little coloured tag on each appointment. */
export function tagFor(b: { status: string; deposit_paid: boolean; ends_at: string }) {
  if (b.status === "done") return { label: "Done ✓", fg: colors.green, bg: colors.greenBg };
  if (b.status === "cancelled") return { label: "Cancelled", fg: colors.red, bg: colors.redBg };
  if (Date.parse(b.ends_at) < Date.now()) return { label: "Did it happen?", fg: colors.amber, bg: colors.amberBg };
  if (!b.deposit_paid) return { label: "Deposit due", fg: colors.amber, bg: colors.amberBg };
  return { label: "Deposit paid", fg: colors.green, bg: colors.greenBg };
}
