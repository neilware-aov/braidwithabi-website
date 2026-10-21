import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { duration, minutesBetween, money, time12 } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import type { Booking } from "@/lib/types";
import { Badge } from "./ui";

/** One appointment in a list. Tap to open it. */
export default function BookingCard({ b }: { b: Booking }) {
  const start = new Date(b.starts_at);
  const faded = b.status === "cancelled";
  return (
    <Pressable
      onPress={() => router.push(`/booking/${b.id}`)}
      style={({ pressed }) => [st.card, pressed && { opacity: 0.85 }, faded && { opacity: 0.6 }]}
    >
      <View style={st.timeCol}>
        <Text style={st.time}>{time12(start).replace(" ", "\n")}</Text>
        <Text style={st.len}>{duration(minutesBetween(b.starts_at, b.ends_at))}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={st.top}>
          <Text style={[st.name, faded && { textDecorationLine: "line-through" }]} numberOfLines={1}>
            {b.client_name}
          </Text>
          <Text style={st.price}>{money(b.price_total)}</Text>
        </View>
        <Text style={st.meta} numberOfLines={1}>
          {b.style_name}
          {b.variant_label ? ` · ${b.variant_label}` : ""}
          {b.blow_dry ? " · blow-dry" : ""}
        </Text>
        <View style={{ marginTop: 6 }}>
          <Badge b={b} />
        </View>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    backgroundColor: colors.ivory,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  timeCol: { width: 58, borderRightWidth: 1, borderRightColor: colors.line, paddingRight: 8 },
  time: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink, lineHeight: 20 },
  len: { fontFamily: fonts.light, fontSize: 12, color: colors.muted, marginTop: 4 },
  top: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  name: { flex: 1, fontFamily: fonts.medium, fontSize: 18, color: colors.ink },
  price: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  meta: { fontFamily: fonts.light, fontSize: 14.5, color: colors.muted },
});
