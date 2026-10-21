import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";
import { TimeStepper } from "@/components/TimePicker";
import { Button, Card, ErrorNote, Loading, Screen, T } from "@/components/ui";
import { getSettings, saveSettings } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import type { DayKey, WorkingHours } from "@/lib/types";

const DAYS: Array<[DayKey, string]> = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
];

export default function Hours() {
  const [hours, setHours] = useState<WorkingHours | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => setHours(s.working_hours)).catch((e) => setError(e.message));
  }, []);

  if (!hours) return <Screen back title="Working hours">{error ? <ErrorNote message={error} /> : <Loading />}</Screen>;
  const setDay = (k: DayKey, v: WorkingHours[DayKey]) => setHours({ ...hours, [k]: v });

  async function save() {
    setError(null);
    for (const [k, label] of DAYS) {
      const h = hours![k];
      if (h && h.open >= h.close) return setError(`${label}: the end time must be after the start time.`);
    }
    setSaving(true);
    try {
      await saveSettings({ working_hours: hours! });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen back title="Working hours" footer={<Button label="Save" onPress={save} loading={saving} />}>
      <T variant="muted" style={{ marginBottom: 12 }}>
        Clients can only book appointments that fit inside these hours. Turn a day off to close it.
      </T>
      <Card style={{ paddingVertical: 4 }}>
        {DAYS.map(([k, label], i) => {
          const h = hours[k];
          return (
            <View
              key={k}
              style={{
                paddingVertical: 12,
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.line,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Switch
                  value={!!h}
                  onValueChange={(on) => setDay(k, on ? { open: "09:00", close: "18:00" } : null)}
                  trackColor={{ false: colors.line, true: colors.rose }}
                  thumbColor="#fff"
                />
                <Text style={{ fontFamily: fonts.medium, fontSize: 16, color: colors.ink, flex: 1 }}>{label}</Text>
                {!h ? <T variant="muted">Closed</T> : null}
              </View>
              {h ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <TimeStepper value={h.open} onChange={(open) => setDay(k, { ...h, open })} />
                  <T variant="muted">to</T>
                  <TimeStepper value={h.close} onChange={(close) => setDay(k, { ...h, close })} />
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>
      <ErrorNote message={error} />
    </Screen>
  );
}
