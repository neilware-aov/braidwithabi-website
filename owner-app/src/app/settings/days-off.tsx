import { useState } from "react";
import { View } from "react-native";
import MonthGrid from "@/components/MonthGrid";
import { Button, Card, confirm, Empty, ErrorNote, Field, Loading, notify, Row, Screen, Section, T } from "@/components/ui";
import { addTimeOff, deleteTimeOff, listTimeOff } from "@/lib/api";
import { addDays, dateShort, dayKey, startOfDay } from "@/lib/format";
import { colors } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";

export default function DaysOff() {
  const { data, error } = useLoad(listTimeOff);
  const [adding, setAdding] = useState(false);
  const [month, setMonth] = useState(new Date());
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  function pick(d: Date) {
    if (!from || to || d < from) {
      setFrom(d);
      setTo(null);
    } else setTo(d);
  }

  async function save() {
    if (!from) return;
    setSaving(true);
    try {
      await addTimeOff({
        starts_at: startOfDay(from).toISOString(),
        ends_at: addDays(startOfDay(to ?? from), 1).toISOString(),
        reason: reason.trim() || "Day off",
      });
      setAdding(false);
      setFrom(null);
      setTo(null);
      setReason("");
    } catch (e: any) {
      notify("Couldn't save", e?.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen back title="Days off" subtitle="Clients can't book these days">
      <ErrorNote message={error} />
      {!data && !error ? <Loading /> : null}

      {adding ? (
        <Card style={{ marginTop: 6 }}>
          <T style={{ marginBottom: 8 }}>Tap the first day, then the last day (or just one day).</T>
          <MonthGrid month={month} onMonth={setMonth} selected={to ?? from} onSelect={pick} minDate={new Date()} off={new Set(rangeKeys(from, to))} />
          <View style={{ marginTop: 12 }}>
            <Field label="Note (only you see this)" value={reason} onChangeText={setReason} placeholder="Vacation" />
            <T variant="strong" style={{ marginBottom: 12 }}>
              {from ? (to && to > from ? `${dateShort(from)} → ${dateShort(to)}` : dateShort(from)) : "No days picked yet"}
            </T>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button style={{ flex: 1 }} kind="secondary" label="Back" onPress={() => setAdding(false)} />
              <Button style={{ flex: 2 }} label="Block these days" disabled={!from} loading={saving} onPress={save} />
            </View>
          </View>
        </Card>
      ) : (
        <Button icon="add" label="Add days off" onPress={() => setAdding(true)} style={{ marginTop: 6 }} />
      )}

      <Section title="Coming up">
        {data && !data.length ? <Empty icon="sunny-outline" title="No days off planned" /> : null}
        {data?.length ? (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {data.map((t, i) => {
              const s = new Date(t.starts_at);
              const e = addDays(new Date(t.ends_at), -1);
              const label = s.toDateString() === e.toDateString() || e < s ? dateShort(s) : `${dateShort(s)} → ${dateShort(e)}`;
              return (
                <View key={t.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                  <Row
                    icon="airplane-outline"
                    label={label}
                    sub={t.reason}
                    right={
                      <Button
                        small
                        kind="ghost"
                        label="Remove"
                        onPress={async () => {
                          if (await confirm("Remove these days off?", "Clients will be able to book these days again.", "Remove")) {
                            deleteTimeOff(t.id).catch((err) => notify("Couldn't remove", err?.message));
                          }
                        }}
                      />
                    }
                  />
                </View>
              );
            })}
          </Card>
        ) : null}
      </Section>
    </Screen>
  );
}

function rangeKeys(from: Date | null, to: Date | null) {
  if (!from) return [];
  const out: string[] = [];
  const end = to && to > from ? to : from;
  for (let d = startOfDay(from); d <= end; d = addDays(d, 1)) out.push(dayKey(d));
  return out;
}
