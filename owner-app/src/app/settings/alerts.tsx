import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Button, Card, ErrorNote, notify, Screen, Section, T } from "@/components/ui";
import { getStatus, sendTestAlert } from "@/lib/api";
import { ago } from "@/lib/format";
import { canPromptInstall, enablePush, getPushState, isIos, isStandalone, onInstallableChange, promptInstall, type PushState } from "@/lib/push";
import { colors, fonts } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";

export default function Alerts() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState<"on" | "test" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installable, setInstallable] = useState(canPromptInstall());
  const { data: status } = useLoad(getStatus);

  useEffect(() => {
    getPushState().then(setState);
    return onInstallableChange(() => setInstallable(canPromptInstall()));
  }, []);

  async function turnOn() {
    setBusy("on");
    setError(null);
    const r = await enablePush();
    if (!r.ok) setError(r.error ?? "Couldn't turn on alerts.");
    setState(await getPushState());
    setBusy(null);
  }

  async function test() {
    setBusy("test");
    try {
      await sendTestAlert();
      notify("Sent!", "You should see an alert in a few seconds.");
    } catch (e: any) {
      notify("Couldn't send", e?.message);
    } finally {
      setBusy(null);
    }
  }

  const web = Platform.OS === "web";

  return (
    <Screen back title="Phone alerts">
      <Card style={{ marginTop: 6 }}>
        <Text style={st.status}>
          {state === "enabled"
            ? "Alerts are on ✓"
            : state === "needs-install"
              ? "One step first"
              : state === "blocked"
                ? "Alerts are blocked"
                : state === "unsupported"
                  ? "Alerts need the real app"
                  : "Alerts are off"}
        </Text>
        <T variant="muted" style={{ marginTop: 4 }}>You'll get an alert:</T>
        <Bullet text="when someone books, cancels or changes their time" />
        <Bullet text="the day before each appointment" />
        <Bullet text="2 hours before each appointment" />

        {state === "available" ? <Button label="Turn on alerts" icon="notifications" onPress={turnOn} loading={busy === "on"} style={{ marginTop: 16 }} /> : null}
        {state === "enabled" ? (
          <Button kind="secondary" label="Send me a test alert" icon="paper-plane-outline" onPress={test} loading={busy === "test"} style={{ marginTop: 16 }} />
        ) : null}
        {state === "unsupported" ? (
          <T style={{ marginTop: 12 }}>
            {web
              ? "Alerts work in the app on your Home Screen (opened from your live website address, starting with https). They can't work on this test link."
              : "Alerts need a real phone or tablet."}
          </T>
        ) : null}
        {state === "blocked" ? (
          <T style={{ marginTop: 12 }}>
            {web
              ? "Alerts were blocked. On iPhone: Settings → Notifications → Braid with Abi → Allow. Then come back here."
              : "Open your phone's Settings → Apps → Braid with Abi → Notifications and turn them on."}
          </T>
        ) : null}
        <ErrorNote message={error} />
      </Card>

      {web && isIos() && !isStandalone() ? (
        <Section title="Add the app to your Home Screen">
          <Card>
            <T style={{ marginBottom: 12 }}>On iPhone, alerts only work once the app is on your Home Screen:</T>
            <Step n={1} text="Open this page in Safari." />
            <Step n={2} text="Tap the Share button (the square with an arrow)." />
            <Step n={3} text="Tap “Add to Home Screen”, then “Add”." />
            <Step n={4} text="Open Braid with Abi from your Home Screen and come back here to turn alerts on." />
          </Card>
        </Section>
      ) : null}

      {web && !isIos() && !isStandalone() && installable ? (
        <Section title="Install the app">
          <Button kind="secondary" icon="download-outline" label="Install on this device" onPress={() => promptInstall()} />
        </Section>
      ) : null}

      <Section title="Your clients">
        <T variant="muted">
          Clients get emails automatically: when they book, when you mark their deposit received, the day before, and 2 hours
          before their appointment.
        </T>
        {status ? (
          <View style={{ marginTop: 12, gap: 6 }}>
            <Check ok={status.emailReady} text={status.emailReady ? "Emails are being sent" : "Emails are not set up yet (RESEND_API_KEY)"} />
            <Check
              ok={!!status.remindersLastRun && Date.now() - Date.parse(status.remindersLastRun) < 2 * 3_600_000}
              text={status.remindersLastRun ? `Reminders last checked ${ago(status.remindersLastRun)}` : "Reminders haven't run yet"}
            />
          </View>
        ) : null}
      </Section>
    </Screen>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
      <Text style={{ color: colors.rose, fontSize: 16 }}>•</Text>
      <T style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <Text style={{ color: ok ? colors.green : colors.amber, fontFamily: fonts.medium }}>{ok ? "✓" : "!"}</Text>
      <T variant="small" style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
      <View style={st.num}>
        <Text style={st.numText}>{n}</Text>
      </View>
      <T style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

const st = StyleSheet.create({
  status: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  num: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.blush, alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: fonts.medium, fontSize: 13, color: colors.roseDark },
});
