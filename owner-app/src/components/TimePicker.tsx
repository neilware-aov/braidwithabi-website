import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { hhmm12 } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import { nowWall } from "@/lib/tz";

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

/** "09:00" with − / + buttons in 30-minute steps. Works the same on phone and web. */
export function TimeStepper({ value, onChange, min = "05:00", max = "23:00" }: { value: string; onChange: (v: string) => void; min?: string; max?: string }) {
  const v = toMin(value);
  return (
    <View style={st.stepper}>
      <Pressable onPress={() => onChange(fromMin(Math.max(toMin(min), v - 30)))} hitSlop={8} style={st.stepBtn}>
        <Ionicons name="remove" size={18} color={colors.ink} />
      </Pressable>
      <Text style={st.stepText}>{hhmm12(value)}</Text>
      <Pressable onPress={() => onChange(fromMin(Math.min(toMin(max), v + 30)))} hitSlop={8} style={st.stepBtn}>
        <Ionicons name="add" size={18} color={colors.ink} />
      </Pressable>
    </View>
  );
}

/** Grid of start times; times in `busy` are shown struck through (still pickable). */
export function TimeGrid({
  value,
  onChange,
  from = "07:00",
  to = "20:00",
  busy = new Set<string>(),
}: {
  value: string | null;
  onChange: (v: string) => void;
  from?: string;
  to?: string;
  busy?: Set<string>;
}) {
  const times: string[] = [];
  for (let n = toMin(from); n <= toMin(to); n += 30) times.push(fromMin(n));
  return (
    <View style={st.grid}>
      {times.map((t) => {
        const sel = t === value;
        const clash = busy.has(t);
        return (
          <Pressable key={t} onPress={() => onChange(t)} style={[st.slot, sel && st.slotSel, clash && !sel && st.slotBusy]}>
            <Text style={[st.slotText, sel && { color: colors.cream }, clash && !sel && { color: colors.faint, textDecorationLine: "line-through" }]}>
              {hhmm12(t)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontal strip of upcoming days. */
export function DayStrip({ value, onChange, days = 90, start = nowWall() }: { value: Date | null; onChange: (d: Date) => void; days?: number; start?: Date }) {
  const first = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const list = Array.from({ length: days }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  const W = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {list.map((d) => {
        const sel = !!value && d.toDateString() === value.toDateString();
        return (
          <Pressable key={d.toISOString()} onPress={() => onChange(d)} style={[st.day, sel && st.slotSel]}>
            <Text style={[st.dayW, sel && { color: colors.blush }]}>{W[d.getDay()]}</Text>
            <Text style={[st.dayN, sel && { color: colors.cream }]}>{d.getDate()}</Text>
            <Text style={[st.dayW, sel && { color: colors.blush }]}>{M[d.getMonth()]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
  },
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  stepText: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, minWidth: 78, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: {
    width: "23%",
    flexGrow: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ivory,
  },
  slotSel: { backgroundColor: colors.ink, borderColor: colors.ink },
  slotBusy: { backgroundColor: colors.cream },
  slotText: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  day: {
    width: 62,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ivory,
  },
  dayW: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textTransform: "uppercase" },
  dayN: { fontFamily: fonts.display, fontSize: 24, color: colors.ink, lineHeight: 28 },
});
