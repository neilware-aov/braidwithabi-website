// On this computer only: check for due reminders every 5 minutes, the way
// Supabase does it every 15 minutes on the live site.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL || process.env.DATABASE_URL) return;
  const url = `http://localhost:${process.env.PORT || 3000}/api/reminders`;
  const tick = () => fetch(url).catch(() => {});
  setTimeout(tick, 20_000);
  setInterval(tick, 5 * 60_000);
}
