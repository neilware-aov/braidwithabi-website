import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
} from "@expo-google-fonts/cormorant-garamond";
import { Jost_300Light, Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { getSettings, isConfigured } from "@/lib/api";
import { listenForNotifications, refreshPushRegistration, registerServiceWorker } from "@/lib/push";
import { colors, fonts } from "@/lib/theme";
import { setTimezone } from "@/lib/tz";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Web: keep content clear of the iPhone notch / home bar when installed to the
// Home Screen, and stop iOS zooming into inputs.
if (Platform.OS === "web" && typeof document !== "undefined" && !document.getElementById("bwa-web")) {
  const style = document.createElement("style");
  style.id = "bwa-web";
  style.textContent = `
    html, body { background: ${colors.cream}; }
    @supports (height: 100dvh) { html, body, #root { height: 100dvh; } }
    #root { box-sizing: border-box; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
    @media (max-width: 767px) { input, textarea, select { font-size: 16px !important; } }
  `;
  document.head.appendChild(style);
  registerServiceWorker();
}

function AlertEffects() {
  useEffect(() => {
    getSettings().then((s) => setTimezone(s.timezone)).catch(() => {});
    refreshPushRegistration();
    return listenForNotifications();
  }, []);
  return null;
}

/** Shown only if the app was built without the website address / key. */
function NotSetUp() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontFamily: fonts.displayItalic, fontSize: 32, color: colors.ink, textAlign: "center" }}>
        Almost ready
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 16, color: colors.muted, textAlign: "center", marginTop: 8 }}>
        This app needs EXPO_PUBLIC_SITE_URL and EXPO_PUBLIC_OWNER_KEY (see README).
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    Jost_300Light,
    Jost_400Regular,
    Jost_500Medium,
  });
  // Never get stuck on a blank screen: if fonts are slow or fail (some mobile
  // browsers), show the app anyway with fallback fonts after a few seconds.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), 3000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (fontError) console.warn("[fonts] failed to load:", fontError.message);
  }, [fontError]);
  const ready = fontsLoaded || !!fontError || gaveUp;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  if (!isConfigured) return <NotSetUp />;

  return (
    <>
      <StatusBar style="dark" />
      <AlertEffects />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />
    </>
  );
}
