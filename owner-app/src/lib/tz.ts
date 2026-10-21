// The app always shows times in the business's time zone (Toronto by
// default), even if the phone is set to another one — so a 10 AM booking on
// the website is 10 AM in the app, everywhere.
//
// wall(x) turns a real moment into a Date whose getHours()/getDate()/… read
// as the business's clock. fromWall(d) does the reverse before saving.

let zone = "America/Toronto";
let fmt: Intl.DateTimeFormat | null = null;

export function setTimezone(tz: string) {
  if (!tz || tz === zone) return;
  zone = tz;
  fmt = null;
}

function parts(ms: number): number[] | null {
  try {
    fmt ??= new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    });
    const p: Record<string, number> = {};
    for (const x of fmt.formatToParts(new Date(ms))) if (x.type !== "literal") p[x.type] = Number(x.value);
    return [p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second];
  } catch {
    return null; // no time zone support → fall back to the phone's own clock
  }
}

/** A real moment → the business's wall clock. */
export function wall(x: Date | string | number): Date {
  const ms = typeof x === "number" ? x : typeof x === "string" ? Date.parse(x) : x.getTime();
  const p = parts(ms);
  return p ? new Date(p[0], p[1], p[2], p[3], p[4], p[5]) : new Date(ms);
}

/** Right now, on the business's clock. */
export const nowWall = () => wall(Date.now());

/** The business's wall clock (from wall() / pickers) → the real moment. */
export function fromWall(d: Date): Date {
  const target = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
  const offsetAt = (ms: number) => {
    const p = parts(ms);
    return p ? Date.UTC(p[0], p[1], p[2], p[3], p[4], p[5]) - ms : -new Date(ms).getTimezoneOffset() * 60000;
  };
  let guess = target - offsetAt(target);
  guess = target - offsetAt(guess); // second pass handles daylight-saving changes
  return new Date(guess);
}
