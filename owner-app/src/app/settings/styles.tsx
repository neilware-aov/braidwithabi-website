import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, ErrorNote, Loading, Screen } from "@/components/ui";
import { imageUrl, listStyles } from "@/lib/api";
import { duration, money } from "@/lib/format";
import { colors, fonts, radius } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";

export default function Styles() {
  const { data, error, refreshing, reload } = useLoad(listStyles);

  return (
    <Screen back title="Styles & prices" subtitle="What clients see on your website" refreshing={refreshing} onRefresh={reload}>
      <ErrorNote message={error} />
      {!data && !error ? <Loading /> : null}
      {data?.map((s) => {
        const prices = [s.price, ...s.variants.map((v) => v.price)];
        const from = Math.min(...prices);
        return (
          <Pressable
            key={s.id}
            onPress={() => router.push({ pathname: "/settings/style", params: { id: s.id } })}
            style={({ pressed }) => [st.item, pressed && { opacity: 0.85 }, !s.is_active && { opacity: 0.55 }]}
          >
            {s.image_url ? <Image source={{ uri: imageUrl(s.image_url) }} style={st.thumb} /> : <View style={st.thumb} />}
            <View style={{ flex: 1 }}>
              <Text style={st.name}>{s.name}</Text>
              <Text style={st.meta}>
                {s.variants.length ? "from " : ""}
                {money(from)} · {duration(s.duration_minutes)}
              </Text>
              {!s.is_active ? <Text style={st.hidden}>Hidden from website</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.faint} />
          </Pressable>
        );
      })}
      {data ? (
        <Button
          kind="secondary"
          icon="add"
          label="Add a style"
          style={{ marginTop: 8 }}
          onPress={() => router.push("/settings/style")}
        />
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 10,
    paddingRight: 16,
    backgroundColor: colors.ivory,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  thumb: { width: 64, height: 80, borderRadius: radius.md, backgroundColor: colors.blush },
  name: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  meta: { fontFamily: fonts.light, fontSize: 14.5, color: colors.muted },
  hidden: { fontFamily: fonts.regular, fontSize: 12, color: colors.amber, marginTop: 2 },
});
