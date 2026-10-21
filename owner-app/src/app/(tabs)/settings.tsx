import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Card, ErrorNote, notify, Row, Screen, SwitchRow, T } from "@/components/ui";
import { getSettings, saveSettings, SITE_URL } from "@/lib/api";
import { getPushState } from "@/lib/push";
import { colors } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";

export default function SettingsScreen() {
  const { data: settings, error } = useLoad(getSettings);
  const [open, setOpen] = useState<boolean | null>(null);
  const [alertsOn, setAlertsOn] = useState<boolean | null>(null);

  useEffect(() => {
    getPushState().then((s) => setAlertsOn(s === "enabled"));
  }, []);

  const taking = open ?? settings?.accepting_bookings ?? true;

  async function toggle(v: boolean) {
    setOpen(v);
    try {
      await saveSettings({ accepting_bookings: v });
    } catch (e: any) {
      setOpen(!v);
      notify("Couldn't save", e?.message);
    }
  }

  const items: Array<{ icon: any; label: string; sub: string; to: string }> = [
    { icon: "notifications-outline", label: "Phone alerts", sub: alertsOn ? "On ✓" : "Off — tap to turn on", to: "/settings/alerts" },
    { icon: "sparkles-outline", label: "Styles & prices", sub: "Photos, prices, how long each takes", to: "/settings/styles" },
    { icon: "time-outline", label: "Working hours", sub: "When clients can book", to: "/settings/hours" },
    { icon: "airplane-outline", label: "Days off", sub: "Block days for holidays or breaks", to: "/settings/days-off" },
    { icon: "card-outline", label: "Deposit & address", sub: "e-Transfer email, deposit, your address", to: "/settings/payments" },
  ];

  return (
    <Screen title="Settings">
      <ErrorNote message={error} />
      <SwitchRow
        label="Taking online bookings"
        sub={taking ? "Clients can book on your website" : "Booking is paused — clients are asked to message you"}
        value={taking}
        onChange={toggle}
      />

      <Card style={{ padding: 0, overflow: "hidden", marginTop: 6 }}>
        {items.map((it, i) => (
          <View key={it.to} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : null}>
            <Row icon={it.icon} label={it.label} sub={it.sub} onPress={() => router.push(it.to as any)} />
          </View>
        ))}
      </Card>

      <Card style={{ padding: 0, overflow: "hidden", marginTop: 16 }}>
        <Row icon="globe-outline" label="Open my website" sub={SITE_URL.replace(/^https?:\/\//, "")} onPress={() => Linking.openURL(SITE_URL)} />
      </Card>

      <T variant="small" style={{ marginTop: 20, textAlign: "center" }}>
        Braid with Abi · owner app
      </T>
    </Screen>
  );
}
