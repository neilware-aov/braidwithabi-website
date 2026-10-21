import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useInsets } from "@/components/ui";
import { colors, fonts } from "@/lib/theme";

export default function TabsLayout() {
  const insets = useInsets();

  const icon =
    (name: keyof typeof Ionicons.glyphMap, active: keyof typeof Ionicons.glyphMap) =>
    ({ color, focused }: { color: unknown; focused: boolean }) => <Ionicons name={focused ? active : name} size={25} color={String(color)} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.rose,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.ivory,
          borderTopColor: colors.line,
          height: Platform.OS === "web" ? 74 : 68 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Platform.OS === "web" ? 12 : insets.bottom + 6,
        },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
        sceneStyle: { backgroundColor: colors.cream },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Appointments", tabBarIcon: icon("calendar-outline", "calendar") }} />
      <Tabs.Screen name="money" options={{ title: "Money", tabBarIcon: icon("wallet-outline", "wallet") }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: icon("settings-outline", "settings") }} />
    </Tabs>
  );
}
