import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { DayStrip, TimeGrid } from "@/components/TimePicker";
import { Button, Chip, ErrorNote, Field, Loading, NumberField, Screen, Section, SwitchRow, T } from "@/components/ui";
import { createBooking, getSettings, listBookings, listStyles, OverlapError } from "@/lib/api";
import { addDays, duration, money, startOfDay } from "@/lib/format";
import { at, busyStarts } from "@/lib/slots";
import { useLoad } from "@/lib/useLoad";

/** For bookings that come in by DM, text or phone. */
export default function NewBooking() {
  const { data } = useLoad(async () => {
    const [styles, settings] = await Promise.all([listStyles(), getSettings()]);
    return { styles: styles.filter((s) => s.is_active), settings };
  });

  const [styleId, setStyleId] = useState<string | null>(null);
  const [variant, setVariant] = useState<string | null>(null);
  const [blowDry, setBlowDry] = useState(false);
  const [day, setDay] = useState<Date>(startOfDay(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const style = data?.styles.find((s) => s.id === styleId) ?? null;
  const v = style?.variants.find((x) => x.label === variant) ?? null;
  const settings = data?.settings;
  const minutes = style ? (v?.duration_minutes ?? style.duration_minutes) + (blowDry && settings ? settings.blow_dry_minutes : 0) : 0;
  const autoPrice = style ? (v?.price ?? style.price) + (blowDry && settings ? settings.blow_dry_price : 0) : 0;
  const deposit = style?.deposit ?? settings?.default_deposit ?? 0;

  useEffect(() => setPrice(null), [styleId, variant, blowDry]);

  const { data: dayBookings } = useLoad(() => listBookings(day.toISOString(), addDays(day, 1).toISOString()), [day.getTime()]);
  const busy = minutes ? busyStarts(dayBookings ?? [], day, minutes) : new Set<string>();

  if (!data || !settings) return <Screen back title="New appointment"><Loading /></Screen>;

  const needs = !style
    ? "Choose a style"
    : style.variants.length && !v
      ? "Choose a size / length"
      : !time
        ? "Choose a time"
        : name.trim().length < 2
          ? "Add the client's name"
          : null;

  async function save() {
    if (!style || !time) return;
    setSaving(true);
    setError(null);
    try {
      const b = await createBooking({
        style_id: style.id,
        variant_label: v?.label ?? null,
        blow_dry: blowDry,
        starts_at: at(day, time).toISOString(),
        price_total: price ?? autoPrice,
        client_name: name.trim(),
        client_phone: phone.trim(),
        client_email: email.trim(),
        client_notes: notes.trim(),
        deposit_paid: paid,
      });
      router.replace(`/booking/${b.id}`);
    } catch (e: any) {
      setError(e instanceof OverlapError ? "That time overlaps another appointment — pick another time." : e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      back
      title="New appointment"
      subtitle="For bookings by DM, text or phone"
      footer={<Button label={needs ?? "Save appointment"} disabled={!!needs} loading={saving} onPress={save} />}
    >
      <Section title="1. Style">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {data.styles.map((s) => (
            <Chip
              key={s.id}
              label={s.name}
              active={s.id === styleId}
              onPress={() => {
                setStyleId(s.id);
                setVariant(s.variants.length === 1 ? s.variants[0].label : null);
              }}
            />
          ))}
        </ScrollView>
        {style?.variants.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {style.variants.map((x) => (
              <Chip
                key={x.label}
                label={x.label}
                sub={`${money(x.price)} · ${duration(x.duration_minutes)}`}
                active={x.label === variant}
                onPress={() => setVariant(x.label)}
              />
            ))}
          </View>
        ) : null}
        {style ? (
          <View style={{ marginTop: 10 }}>
            <SwitchRow
              label="Blow-dry"
              sub={`+${money(settings.blow_dry_price)} · +${duration(settings.blow_dry_minutes)}`}
              value={blowDry}
              onChange={setBlowDry}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <NumberField label="Price" prefix="$" value={price ?? autoPrice} onChange={setPrice} />
              <View style={{ flex: 1, justifyContent: "center" }}>
                <T variant="small">Takes about</T>
                <T variant="display">{minutes ? duration(minutes) : "—"}</T>
              </View>
            </View>
          </View>
        ) : null}
      </Section>

      <Section title="2. Day & time">
        <DayStrip value={day} onChange={(d) => { setDay(d); setTime(null); }} />
        <View style={{ height: 12 }} />
        <TimeGrid value={time} onChange={setTime} busy={busy} />
        {minutes ? <T variant="small" style={{ marginTop: 8 }}>Crossed-out times overlap another appointment.</T> : null}
      </Section>

      <Section title="3. Client">
        <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field
          label="Email (optional)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          hint="If you add it, she gets the booking details and reminders by email."
        />
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
        <SwitchRow label={`Deposit already received (${money(deposit)})`} value={paid} onChange={setPaid} />
        <ErrorNote message={error} />
      </Section>
    </Screen>
  );
}
