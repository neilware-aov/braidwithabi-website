import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
} from "@expo-google-fonts/cormorant-garamond";
import { Jost_300Light, Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import { useFonts } from "expo-font";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Button, Field, T } from "@/components/ui";
import { getSettings, getStatus, isConfigured } from "@/lib/api";
import { canPair, keepKeyInAddress, onKeyChange, ownerKey, parseSetupLink, setOwnerKey } from "@/lib/ownerKey";
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

function AppEffects() {
  const pathname = usePathname();
  useEffect(() => {
    getSettings().then((s) => setTimezone(s.timezone)).catch(() => {});
    refreshPushRegistration();
    return listenForNotifications();
  }, []);
  useEffect(() => keepKeyInAddress(), [pathname]);
  return null;
}

/** First open on a new phone: connect it with the private setup link. */
function Connect() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    const k = parseSetupLink(text);
    if (!k) return setError("That doesn't look like your setup link. Copy the whole link and try again.");
    setBusy(true);
    setError(null);
    setOwnerKey(k);
    try {
      await getStatus(); // checks the key with the website
    } catch (e: any) {
      setError(e?.message ?? "Couldn't connect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, justifyContent: "center", padding: 28 }}>
      <View style={{ width: "100%", maxWidth: 440, alignSelf: "center" }}>
        <Text style={{ fontFamily: fonts.displayItalic, fontSize: 38, color: colors.ink }}>Braid with Abi</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.ink, marginTop: 18 }}>Connect this phone</Text>
        {canPair ? (
          <>
            <T variant="muted" style={{ marginTop: 6, marginBottom: 18 }}>
              Open the private setup link you were sent, or paste it here. You only do this once.
            </T>
            <Field label="Setup link" value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} placeholder="https://…#key=…" />
            {error ? <T style={{ color: colors.red, marginBottom: 12 }}>{error}</T> : null}
            <Button label="Connect" onPress={connect} loading={busy} disabled={!text.trim()} />
          </>
        ) : (
          <T variant="muted" style={{ marginTop: 6 }}>
            This app was built without its private key. Rebuild it with EXPO_PUBLIC_OWNER_KEY set (see README).
          </T>
        )}
      </View>
    </View>
  );
}

/** Shown only if the app was built without the website address / key. */
function NotSetUp() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Text style={{ fontFamily: fonts.displayItalic, fontSize: 32, color: colors.ink, textAlign: "center" }}>
        Almost ready
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 16, color: colors.muted, textAlign: "center", marginTop: 8 }}>
        This app needs EXPO_PUBLIC_SITE_URL (see README).
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
  const [hasKey, setHasKey] = useState(() => !!ownerKey());
  useEffect(() => onKeyChange(() => setHasKey(!!ownerKey())), []);
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
  if (!hasKey) return <Connect />;

  return (
    <>
      <StatusBar style="dark" />
      <AppEffects />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />
    </>
  );
}
