import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, Empty, ErrorNote, Loading, Screen, Segmented } from "@/components/ui";
import { listBookings } from "@/lib/api";
import { addDays, addMonths, dateShort, firstName, money, monthName, startOfMonth, startOfWeek, weekLabel } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import type { Booking } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { fromWall, nowWall, wall } from "@/lib/tz";

type Mode = "week" | "month";
const BARS = 6;

/** Start of the period `offset` steps away from now (0 = this week / month). */
function periodStart(mode: Mode, offset: number) {
  const now = nowWall();
  return mode === "week" ? addDays(startOfWeek(now), offset * 7) : addMonths(startOfMonth(now), offset);
}
const periodEnd = (mode: Mode, start: Date) => (mode === "week" ? addDays(start, 7) : addMonths(start, 1));

function periodName(mode: Mode, offset: number) {
  const s = periodStart(mode, offset);
  if (mode === "week") return offset === 0 ? "This week" : offset === -1 ? "Last week" : weekLabel(s);
  if (offset === 0) return "This month";
  if (offset === -1) return "Last month";
  return `${monthName(s.getMonth())} ${s.getFullYear()}`;
}

export default function MoneyScreen() {
  const [mode, setMode] = useState<Mode>("week");
  const [offset, setOffset] = useState(0);

  const first = periodStart(mode, offset - (BARS - 1));
  const selStart = periodStart(mode, offset);
  const selEnd = periodEnd(mode, selStart);
  const { data, error, refreshing, reload } = useLoad(
    () => listBookings(fromWall(first).toISOString(), fromWall(selEnd).toISOString()),
    [mode, offset]
  );

  const inPeriod = (b: Booking, start: Date) => {
    const t = wall(b.starts_at).getTime();
    return t >= start.getTime() && t < periodEnd(mode, start).getTime();
  };
  const all = data ?? [];
  const bars = Array.from({ length: BARS }, (_, i) => {
    const o = offset - (BARS - 1) + i;
    const start = periodStart(mode, o);
    const total = all.filter((b) => b.status === "done" && inPeriod(b, start)).reduce((s, b) => s + b.price_total, 0);
    return { o, start, total };
  });
  const done = all.filter((b) => b.status === "done" && inPeriod(b, selStart));
  const madeNow = done.reduce((s, b) => s + b.price_total, 0);
  const stillBooked = all.filter((b) => b.status === "booked" && inPeriod(b, selStart));
  const bookedValue = stillBooked.reduce((s, b) => s + b.price_total, 0);
  const max = Math.max(1, ...bars.map((b) => b.total));

  return (
    <Screen title="Money" subtitle="From appointments marked as done" refreshing={refreshing} onRefresh={reload}>
      <Segmented
        options={[
          { value: "week", label: "By week" },
          { value: "month", label: "By month" },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setOffset(0);
        }}
      />

      <Card style={{ marginTop: 16, paddingVertical: 20 }}>
        <View style={st.nav}>
          <Pressable onPress={() => setOffset(offset - 1)} style={st.arrow} accessibilityLabel="Earlier">
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={st.period}>{periodName(mode, offset)}</Text>
            {mode === "week" ? <Text style={st.periodSub}>{weekLabel(selStart)}</Text> : null}
          </View>
          <Pressable
            onPress={() => setOffset(Math.min(0, offset + 1))}
            style={[st.arrow, offset === 0 && { opacity: 0.25 }]}
            disabled={offset === 0}
            accessibilityLabel="Later"
          >
            <Ionicons name="chevron-forward" size={22} color={colors.ink} />
          </Pressable>
        </View>

        <Text style={st.big}>{data ? money(madeNow) : "—"}</Text>
        <Text style={st.bigSub}>
          {done.length === 1 ? "from 1 appointment" : `from ${done.length} appointments`}
        </Text>
        {bookedValue > 0 ? (
          <Text style={st.extra}>
            + {money(bookedValue)} still booked ({stillBooked.length})
          </Text>
        ) : null}

        {/* Simple bar chart of the last few weeks / months. Tap a bar to see it. */}
        <View style={st.chart}>
          {bars.every((b) => !b.total) ? (
            <Text style={st.chartEmpty}>Mark appointments as done and your earnings show up here.</Text>
          ) : null}
          {bars.map((b) => {
            const sel = b.o === offset;
            return (
              <Pressable key={b.o} onPress={() => setOffset(b.o)} style={st.barCol}>
                <Text style={[st.barValue, sel && { color: colors.ink }]} numberOfLines={1}>
                  {b.total ? money(b.total) : ""}
                </Text>
                <View style={st.barTrack}>
                  <View
                    style={[
                      st.bar,
                      { height: `${Math.max(3, (b.total / max) * 100)}%`, backgroundColor: sel ? colors.rose : colors.blush },
                    ]}
                  />
                </View>
                <Text style={[st.barLabel, sel && { color: colors.ink, fontFamily: fonts.medium }]} numberOfLines={1}>
                  {mode === "week" ? `${monthName(b.start.getMonth(), true)} ${b.start.getDate()}` : monthName(b.start.getMonth(), true)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <ErrorNote message={error} />
      {!data && !error ? <Loading /> : null}

      {data ? (
        <View style={{ marginTop: 22 }}>
          <Text style={st.h2}>Appointments done</Text>
          {done.length ? (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {done.map((b, i) => (
                <Pressable
                  key={b.id}
                  onPress={() => router.push(`/booking/${b.id}`)}
                  style={[st.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={st.rowName}>
                      {firstName(b.client_name)} · {b.style_name}
                    </Text>
                    <Text style={st.rowMeta}>{dateShort(wall(b.starts_at))}</Text>
                  </View>
                  <Text style={st.rowPrice}>{money(b.price_total)}</Text>
                </Pressable>
              ))}
            </Card>
          ) : (
            <Empty icon="wallet-outline" title="Nothing yet" text="Appointments you mark as done are added up here." />
          )}
        </View>
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center" },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  period: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  periodSub: { fontFamily: fonts.light, fontSize: 13, color: colors.muted },
  big: { fontFamily: fonts.display, fontSize: 60, color: colors.ink, textAlign: "center", marginTop: 14, lineHeight: 66 },
  bigSub: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted, textAlign: "center" },
  extra: { fontFamily: fonts.regular, fontSize: 14, color: colors.amber, textAlign: "center", marginTop: 6 },
  chart: { flexDirection: "row", gap: 6, height: 160, marginTop: 22, alignItems: "flex-end" },
  chartEmpty: {
    position: "absolute",
    top: 40,
    left: 24,
    right: 24,
    textAlign: "center",
    fontFamily: fonts.light,
    fontSize: 14,
    color: colors.muted,
  },
  barCol: { flex: 1, height: "100%", alignItems: "center" },
  barValue: { fontFamily: fonts.light, fontSize: 10.5, color: colors.muted, height: 16 },
  barTrack: { flex: 1, width: "70%", justifyContent: "flex-end" },
  bar: { width: "100%", borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  barLabel: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.muted, marginTop: 6 },
  h2: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  rowName: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  rowMeta: { fontFamily: fonts.light, fontSize: 13, color: colors.muted },
  rowPrice: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
});
