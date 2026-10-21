import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import BookingCard from "@/components/BookingCard";
import { Button, Empty, ErrorNote, Loading, notify, Screen, Segmented } from "@/components/ui";
import { cancelBooking, listBookings, markDone } from "@/lib/api";
import {
  addDays,
  dateLong,
  dayKey,
  firstName,
  greeting,
  money,
  relativeDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  time12,
} from "@/lib/format";
import { getPushState } from "@/lib/push";
import { colors, fonts, radius } from "@/lib/theme";
import type { Booking } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

export default function Appointments() {
  const today = startOfDay(new Date());
  const from = new Date(Math.min(startOfMonth(today).getTime(), addDays(today, -60).getTime()));
  const { data, error, refreshing, reload, refresh } = useLoad(() =>
    listBookings(from.toISOString(), addDays(today, 200).toISOString())
  );
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming");
  const [alertsOff, setAlertsOff] = useState(false);

  // Check for new bookings every minute while this screen is open.
  useFocusEffect(
    useCallback(() => {
      const t = setInterval(refresh, 60_000);
      return () => clearInterval(t);
    }, [refresh])
  );
  useEffect(() => {
    getPushState().then((s) => setAlertsOff(s !== "enabled" && s !== "unsupported"));
  }, []);

  const all = data ?? [];
  const now = Date.now();
  const upcoming = all.filter((b) => b.status === "booked" && Date.parse(b.ends_at) >= now);
  const toAnswer = all.filter((b) => b.status === "booked" && Date.parse(b.ends_at) < now).reverse();
  const history = all.filter((b) => b.status !== "booked").reverse();

  const made = (since: Date) =>
    all.filter((b) => b.status === "done" && new Date(b.starts_at) >= since).reduce((sum, b) => sum + b.price_total, 0);

  return (
    <Screen refreshing={refreshing} onRefresh={reload}>
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.date}>{dateLong(new Date()).toUpperCase()}</Text>
          <Text style={st.hello}>{greeting()}, Abi</Text>
        </View>
        <Pressable onPress={() => router.push("/booking/new")} style={st.add} accessibilityLabel="Add an appointment">
          <Ionicons name="add" size={28} color={colors.cream} />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push("/money")} style={st.moneyRow}>
        <MoneyBox label="Made this week" value={money(made(startOfWeek(today)))} />
        <MoneyBox label="Made this month" value={money(made(startOfMonth(today)))} />
      </Pressable>

      {alertsOff ? (
        <Pressable onPress={() => router.push("/settings/alerts")} style={st.banner}>
          <Ionicons name="notifications-outline" size={22} color={colors.roseDark} />
          <Text style={st.bannerText}>Turn on alerts to hear about new bookings and upcoming appointments.</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.roseDark} />
        </Pressable>
      ) : null}

      <ErrorNote message={error} />
      {!data && !error ? <Loading /> : null}

      {toAnswer.length ? (
        <View style={{ marginTop: 22 }}>
          <Text style={st.h2}>Did these happen?</Text>
          <Text style={st.help}>Tap “Yes” and it's added to your money for the week.</Text>
          {toAnswer.map((b) => (
            <Answer key={b.id} b={b} />
          ))}
        </View>
      ) : null}

      {data ? (
        <View style={{ marginTop: 24 }}>
          <Segmented
            options={[
              { value: "upcoming", label: "Coming up", count: upcoming.length },
              { value: "history", label: "Past & cancelled" },
            ]}
            value={tab}
            onChange={setTab}
          />
          <View style={{ marginTop: 6 }}>
            {tab === "upcoming" ? (
              upcoming.length ? (
                <DayGroups list={upcoming} />
              ) : (
                <Empty
                  icon="calendar-clear-outline"
                  title="No appointments yet"
                  text="When someone books on your website, it appears here and your phone gets an alert."
                />
              )
            ) : history.length ? (
              <DayGroups list={history} />
            ) : (
              <Empty icon="time-outline" title="Nothing here yet" text="Finished and cancelled appointments show up here." />
            )}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function MoneyBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.moneyBox}>
      <Text style={st.moneyValue}>{value}</Text>
      <Text style={st.moneyLabel}>{label}</Text>
    </View>
  );
}

/** Appointments grouped under "TODAY", "TOMORROW", "SATURDAY, OCTOBER 25"… */
function DayGroups({ list }: { list: Booking[] }) {
  const groups: Array<{ key: string; day: Date; items: Booking[] }> = [];
  for (const b of list) {
    const d = new Date(b.starts_at);
    const key = dayKey(d);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(b);
    else groups.push({ key, day: d, items: [b] });
  }
  return (
    <>
      {groups.map((g) => {
        const rel = relativeDay(g.day);
        return (
          <View key={g.key} style={{ marginTop: 18 }}>
            <Text style={st.dayLabel}>
              {rel === dateLong(g.day) ? rel.toUpperCase() : `${rel.toUpperCase()} · ${dateLong(g.day)}`}
            </Text>
            {g.items.map((b) => (
              <BookingCard key={b.id} b={b} />
            ))}
          </View>
        );
      })}
    </>
  );
}

/** A past appointment still waiting for a yes / no. */
function Answer({ b }: { b: Booking }) {
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  async function run(kind: "yes" | "no") {
    setBusy(kind);
    try {
      if (kind === "yes") await markDone(b.id);
      else await cancelBooking(b.id, false);
    } catch (e: any) {
      notify("Couldn't save", e?.message);
      setBusy(null);
    }
  }
  const start = new Date(b.starts_at);
  return (
    <View style={st.answer}>
      <Pressable onPress={() => router.push(`/booking/${b.id}`)}>
        <Text style={st.answerName}>
          {firstName(b.client_name)} · {b.style_name}
        </Text>
        <Text style={st.answerMeta}>
          {relativeDay(start)} at {time12(start)} · {money(b.price_total)}
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <Button style={{ flex: 1 }} kind="success" icon="checkmark" label="Yes, done" loading={busy === "yes"} onPress={() => run("yes")} />
        <Button style={{ flex: 1 }} kind="secondary" icon="close" label="No" loading={busy === "no"} onPress={() => run("no")} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", paddingTop: 24 },
  date: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 2, color: colors.rose },
  hello: { fontFamily: fonts.displayItalic, fontSize: 36, color: colors.ink, marginTop: 2 },
  add: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.rose, alignItems: "center", justifyContent: "center" },
  moneyRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  moneyBox: { flex: 1, backgroundColor: colors.ink, borderRadius: radius.lg, paddingVertical: 16, paddingHorizontal: 18 },
  moneyValue: { fontFamily: fonts.display, fontSize: 32, color: colors.cream },
  moneyLabel: { fontFamily: fonts.regular, fontSize: 13, color: "rgba(250,245,239,0.7)" },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.blush, borderRadius: radius.md, padding: 16, marginTop: 14 },
  bannerText: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.roseDark },
  h2: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  help: { fontFamily: fonts.light, fontSize: 14, color: colors.muted, marginBottom: 10 },
  answer: { backgroundColor: colors.amberBg, borderRadius: radius.lg, padding: 16, marginBottom: 10 },
  answerName: { fontFamily: fonts.medium, fontSize: 17, color: colors.ink },
  answerMeta: { fontFamily: fonts.light, fontSize: 14.5, color: colors.muted, marginTop: 2 },
  dayLabel: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 1.5, color: colors.rose, marginBottom: 8 },
});
