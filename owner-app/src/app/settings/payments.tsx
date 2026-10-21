import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, ErrorNote, Field, Loading, NumberField, Screen, Section, T } from "@/components/ui";
import { getSettings, saveSettings } from "@/lib/api";
import type { Settings } from "@/lib/types";

export default function Payments() {
  const [form, setForm] = useState<Settings | null>(null);
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(setForm).catch((e) => setError(e.message));
  }, []);

  if (!form) return <Screen back title="Deposit & address">{error ? <ErrorNote message={error} /> : <Loading />}</Screen>;
  const set = (patch: Partial<Settings>) => setForm((f) => (f ? { ...f, ...patch } : f));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const { timezone: _tz, working_hours: _wh, accepting_bookings: _ab, ...rest } = form!;
      await saveSettings(rest);
      router.back();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen back title="Deposit & address" footer={<Button label="Save" onPress={save} loading={saving} />}>
      <Section title="Deposit">
        <Field
          label="e-Transfer email"
          value={form.etransfer_email}
          onChangeText={(etransfer_email) => set({ etransfer_email })}
          autoCapitalize="none"
          keyboardType="email-address"
          hint="Where clients send their deposit."
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <NumberField label="Deposit" prefix="$" value={form.default_deposit} onChange={(n) => set({ default_deposit: n ?? 0 })} />
          <NumberField label="Send within" suffix="hours" value={form.deposit_hold_hours} onChange={(n) => set({ deposit_hold_hours: n ?? 24 })} />
        </View>
      </Section>

      <Section title="Your address">
        <Field
          label="Address & directions"
          value={form.address_details}
          onChangeText={(address_details) => set({ address_details })}
          multiline
          placeholder={"123 Example St, Unit 4\nBuzz 104 · free parking out front"}
          hint="Never shown on the website. Clients get it by email before their appointment."
        />
      </Section>

      <Section title="Blow-dry">
        <View style={{ flexDirection: "row", gap: 10 }}>
          <NumberField label="Price" prefix="$" value={form.blow_dry_price} onChange={(n) => set({ blow_dry_price: n ?? 0 })} />
          <NumberField label="Extra time" suffix="min" value={form.blow_dry_minutes} onChange={(n) => set({ blow_dry_minutes: n ?? 0 })} />
        </View>
      </Section>

      {more ? (
        <Section title="More options">
          <View style={{ flexDirection: "row", gap: 10 }}>
            <NumberField label="Book at least" suffix="hrs" value={form.min_notice_hours} onChange={(n) => set({ min_notice_hours: n ?? 0 })} hint="ahead of time" />
            <NumberField label="Book up to" suffix="days" value={form.max_days_ahead} onChange={(n) => set({ max_days_ahead: n ?? 60 })} hint="ahead of time" />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <NumberField label="Break between" suffix="min" value={form.buffer_minutes} onChange={(n) => set({ buffer_minutes: n ?? 0 })} hint="clients" />
            <NumberField label="Free changes until" suffix="hrs" value={form.reschedule_cutoff_hours} onChange={(n) => set({ reschedule_cutoff_hours: n ?? 48 })} hint="before the appointment" />
          </View>
        </Section>
      ) : (
        <Button kind="ghost" label="More options" icon="chevron-down" style={{ marginTop: 16 }} onPress={() => setMore(true)} />
      )}
      <ErrorNote message={error} />
      <T variant="small" style={{ marginTop: 12 }}>
        Changes show on your website straight away.
      </T>
    </Screen>
  );
}
