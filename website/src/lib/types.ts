export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type WorkingHours = Record<DayKey, { open: string; close: string } | null>;

export interface Settings {
  timezone: string;
  etransfer_email: string;
  default_deposit: number;
  deposit_hold_hours: number;
  blow_dry_price: number;
  blow_dry_minutes: number;
  slot_interval_minutes: number;
  buffer_minutes: number;
  min_notice_hours: number;
  max_days_ahead: number;
  reschedule_cutoff_hours: number;
  working_hours: WorkingHours;
  address_details: string;
  owner_email: string;
  accepting_bookings: boolean;
}

export interface StyleVariant {
  label: string;
  price: number;
  duration_minutes: number;
}

export interface Style {
  id: string;
  name: string;
  description: string;
  image_url: string;
  duration_minutes: number;
  price: number;
  deposit: number | null;
  variants: StyleVariant[];
  hair_included: boolean;
  is_active: boolean;
  sort_order: number;
}

/** booked = on the calendar · done = it happened (counts as money made) · cancelled */
export type BookingStatus = "booked" | "done" | "cancelled";

export interface Booking {
  id: string;
  code: string;
  manage_token: string;
  style_id: string | null;
  style_name: string;
  variant_label: string | null;
  blow_dry: boolean;
  starts_at: string;
  ends_at: string;
  price_total: number;
  deposit_amount: number;
  deposit_paid: boolean;
  client_name: string;
  client_email: string | null;
  client_phone: string;
  client_notes: string;
  owner_notes: string;
  status: BookingStatus;
  source: "website" | "owner";
  reschedule_count: number;
  remind_day_at: string | null;
  remind_soon_at: string | null;
  cancelled_by: "client" | "owner" | null;
  created_at: string;
}

export interface TimeOff {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
}

export interface PushSubscriptionRow {
  id: string;
  kind: "expo" | "web";
  token: string;
  p256dh: string | null;
  auth: string | null;
}

/** What the browser is allowed to see about a style. */
export type PublicStyle = Omit<Style, "is_active" | "sort_order">;

export interface PublicConfig {
  timezone: string;
  etransferEmail: string;
  defaultDeposit: number;
  depositHoldHours: number;
  blowDryPrice: number;
  blowDryMinutes: number;
  rescheduleCutoffHours: number;
  acceptingBookings: boolean;
}
