import type { Booking, PublicConfig, PublicStyle, Settings, Style } from "./types";

export function toPublicConfig(s: Settings): PublicConfig {
  return {
    timezone: s.timezone,
    etransferEmail: s.etransfer_email,
    defaultDeposit: s.default_deposit,
    depositHoldHours: s.deposit_hold_hours,
    blowDryPrice: s.blow_dry_price,
    blowDryMinutes: s.blow_dry_minutes,
    rescheduleCutoffHours: s.reschedule_cutoff_hours,
    acceptingBookings: s.accepting_bookings,
  };
}

export function toPublicStyle(s: Style): PublicStyle {
  const { is_active: _a, sort_order: _b, ...rest } = s;
  return rest;
}

/** Booking fields a client may see on their manage page. */
export function toPublicBooking(b: Booking) {
  return {
    code: b.code,
    style_name: b.style_name,
    variant_label: b.variant_label,
    blow_dry: b.blow_dry,
    starts_at: b.starts_at,
    ends_at: b.ends_at,
    price_total: b.price_total,
    deposit_amount: b.deposit_amount,
    deposit_paid: b.deposit_paid,
    client_name: b.client_name,
    status: b.status,
    reschedule_count: b.reschedule_count,
  };
}
export type PublicBooking = ReturnType<typeof toPublicBooking>;
