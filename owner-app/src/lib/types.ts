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
  cancelled_by: "client" | "owner" | null;
  created_at: string;
}

export interface TimeOff {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
}

export interface Status {
  remindersLastRun: string | null;
  emailReady: boolean;
  alertDevices: number;
}
