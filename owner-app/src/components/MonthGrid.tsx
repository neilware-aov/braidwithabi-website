import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { dayKey, monthName, sameDay } from "@/lib/format";
import { colors, fonts } from "@/lib/theme";

/** Month calendar. `marks` maps "yyyy-mm-dd" → number of appointments; `off` are blocked days. */
export default function MonthGrid({
  month,
  onMonth,
  selected,
  onSelect,
  marks = {},
  off = new Set<string>(),
  minDate,
}: {
  month: Date; // any day in the month
  onMonth: (d: Date) => void;
  selected: Date | null;
  onSelect: (d: Date) => void;
  marks?: Record<string, number>;
  off?: Set<string>;
  minDate?: Date;
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(first.getDay()).fill(null),
    ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  const today = new Date();

  return (
    <View>
      <View style={st.head}>
        <Pressable onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} hitSlop={10} style={st.nav}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Text style={st.title}>
          {monthName(month.getMonth())} {month.getFullYear()}
        </Text>
        <Pressable onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} hitSlop={10} style={st.nav}>
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
      </View>
      <View style={st.week}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <Text key={i} style={st.weekday}>
            {d}
          </Text>
        ))}
      </View>
      <View style={st.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={st.cell} />;
          const k = dayKey(d);
          const isSel = !!selected && sameDay(d, selected);
          const isToday = sameDay(d, today);
          const count = marks[k] ?? 0;
          const blocked = off.has(k);
          const disabled = !!minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
          return (
            <Pressable key={i} style={st.cell} onPress={() => !disabled && onSelect(d)} disabled={disabled}>
              <View
                style={[
                  st.day,
                  isToday && !isSel && { borderWidth: 1, borderColor: colors.rose },
                  blocked && !isSel && { backgroundColor: colors.line },
                  isSel && { backgroundColor: colors.ink },
                ]}
              >
                <Text
                  style={[
                    st.dayText,
                    disabled && { color: colors.faint },
                    blocked && !isSel && { color: colors.muted, textDecorationLine: "line-through" },
                    isSel && { color: colors.cream },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </View>
              <View style={st.dots}>
                {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                  <View key={j} style={[st.dot, { backgroundColor: isSel ? colors.ink : colors.rose }]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  nav: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", fontFamily: fonts.regular, fontSize: 12, color: colors.muted, paddingVertical: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 3 },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  dayText: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  dots: { flexDirection: "row", gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
