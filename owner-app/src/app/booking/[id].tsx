import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Button, Card, confirm, ErrorNote, Field, IconButton, Loading, notify, Screen, Section, T } from "@/components/ui";
import { cancelBooking, deleteBooking, getBooking, markBooked, markDone, saveNotes, setDepositPaid } from "@/lib/api";
import { dateLong, duration, firstName, minutesBetween, money, relativeDay, time12 } from "@/lib/format";
import { colors, fonts } from "@/lib/theme";
import { useLoad } from "@/lib/useLoad";
import { wall } from "@/lib/tz";

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: b, error } = useLoad(() => getBooking(id), [id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);

  if (error) return <Screen back title="Appointment"><ErrorNote message={error} /></Screen>;
  if (!b) return <Screen back title="Appointment"><Loading /></Screen>;

  const start = wall(b.starts_at);
  const end = wall(b.ends_at);
  const now = Date.now();
  const booked = b.status === "booked";
  const isPast = Date.parse(b.ends_at) < now;
  const startedOrToday = Date.parse(b.starts_at) < now || relativeDay(start) === "Today";
  const digits = b.client_phone.replace(/\D/g, "");
  const name = firstName(b.client_name);

  async function run(key: string, fn: () => Promise<unknown>, after?: () => void) {
    setBusy(key);
    try {
      await fn();
      after?.();
    } catch (e: any) {
      notify("Couldn't save", e?.message);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    const tell = !!b!.client_email && !isPast;
    const ok = await confirm(
      `Cancel ${name}'s appointment?`,
      tell ? `${name} will get an email saying it's cancelled. The time becomes free on your website.` : "The time becomes free on your website.",
      "Yes, cancel it",
      true
    );
    if (ok) run("cancel", () => cancelBooking(b!.id, tell));
  }

  async function remove() {
    const ok = await confirm(
      "Delete this appointment?",
      "It will be removed completely and won't count in your money. This can't be undone.",
      "Delete",
      true
    );
    if (ok) run("delete", () => deleteBooking(b!.id), () => router.back());
  }

  return (
    <Screen back title={b.client_name} subtitle={b.source === "owner" ? "Added by you" : `Booked online · ${b.code}`}>
      <Card style={{ marginTop: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={st.style}>{b.style_name}</Text>
            <T variant="muted">
              {[b.variant_label, b.blow_dry ? "with blow-dry" : null].filter(Boolean).join(" · ") || "Standard"}
            </T>
          </View>
          <Badge b={b} />
        </View>
        <View style={st.block}>
          <Text style={st.day}>{relativeDay(start) === dateLong(start) ? dateLong(start) : `${relativeDay(start)} · ${dateLong(start)}`}</Text>
          <Text style={st.time}>
            {time12(start)} – {time12(end)}
          </Text>
          <T variant="small">about {duration(minutesBetween(b.starts_at, b.ends_at))}</T>
        </View>
        <View style={[st.block, { flexDirection: "row" }]}>
          <Money label="Price" value={money(b.price_total)} />
          <Money label="Deposit" value={money(b.deposit_amount)} sub={b.deposit_paid ? "received ✓" : "not received yet"} good={b.deposit_paid} />
        </View>
      </Card>

      <View style={st.contact}>
        <IconButton icon="call-outline" label="Call" onPress={() => Linking.openURL(`tel:${digits}`)} />
        <IconButton icon="chatbubble-outline" label="Text" onPress={() => Linking.openURL(`sms:${digits}`)} />
        <IconButton
          icon="logo-whatsapp"
          label="WhatsApp"
          onPress={() => Linking.openURL(`https://wa.me/${digits.length === 10 ? "1" + digits : digits}`)}
        />
        {b.client_email ? <IconButton icon="mail-outline" label="Email" onPress={() => Linking.openURL(`mailto:${b.client_email}`)} /> : null}
      </View>
      <T variant="small" style={{ marginTop: 8 }}>
        {b.client_phone}
        {b.client_email ? ` · ${b.client_email}` : ""}
      </T>

      {b.client_notes ? (
        <Section title={`${name}'s note`}>
          <Card style={{ backgroundColor: colors.blush, borderColor: colors.blush }}>
            <T>{b.client_notes}</T>
          </Card>
        </Section>
      ) : null}

      <Section title="What would you like to do?">
        <View style={{ gap: 10 }}>
          {booked && isPast ? (
            <>
              <T style={{ marginBottom: 2 }}>Did this appointment happen?</T>
              <Button kind="success" icon="checkmark" label="Yes — mark as done" loading={busy === "done"} onPress={() => run("done", () => markDone(b.id))} />
              <Button kind="secondary" icon="close" label="No, it didn't happen" loading={busy === "cancel"} onPress={cancel} />
            </>
          ) : null}

          {booked && !isPast ? (
            <>
              {!b.deposit_paid ? (
                <Button
                  kind="success"
                  icon="checkmark-circle-outline"
                  label={`Deposit received (${money(b.deposit_amount)})`}
                  loading={busy === "deposit"}
                  onPress={() =>
                    run("deposit", () => setDepositPaid(b.id, true), () =>
                      notify("Saved ✓", b.client_email ? `${name} gets an email with the address.` : undefined)
                    )
                  }
                />
              ) : null}
              {startedOrToday ? (
                <Button icon="checkmark-done" label="Mark as done" loading={busy === "done"} onPress={() => run("done", () => markDone(b.id))} />
              ) : null}
              <Button kind="danger" icon="close-circle-outline" label="Cancel appointment" loading={busy === "cancel"} onPress={cancel} />
            </>
          ) : null}

          {b.status === "done" ? (
            <>
              <T>Done ✓ — counted in your money.</T>
              <Button kind="secondary" icon="arrow-undo-outline" label="Undo (not done)" loading={busy === "undo"} onPress={() => run("undo", () => markBooked(b.id))} />
            </>
          ) : null}

          {b.status === "cancelled" ? (
            <>
              <T>Cancelled{b.cancelled_by === "client" ? ` by ${name}` : ""}.</T>
              {!isPast ? (
                <Button kind="secondary" icon="refresh" label="Put it back on the calendar" loading={busy === "undo"} onPress={() => run("undo", () => markBooked(b.id))} />
              ) : null}
            </>
          ) : null}

          {booked && b.deposit_paid && !isPast ? (
            <Button
              kind="ghost"
              label="Deposit not received after all? Undo"
              loading={busy === "deposit"}
              onPress={() => run("deposit", () => setDepositPaid(b.id, false))}
            />
          ) : null}
        </View>
      </Section>

      <Section title="My notes">
        <Field
          label="Only you can see these"
          value={notes ?? b.owner_notes}
          onChangeText={setNotes}
          multiline
          placeholder="Hair colour, packs used, anything to remember…"
        />
        {notes !== null && notes !== b.owner_notes ? (
          <Button small label="Save notes" loading={busy === "notes"} onPress={() => run("notes", () => saveNotes(b.id, notes), () => setNotes(null))} />
        ) : null}
      </Section>

      <Button kind="ghost" icon="trash-outline" label="Delete appointment" style={{ marginTop: 28 }} loading={busy === "delete"} onPress={remove} />
    </Screen>
  );
}

function Money({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={st.moneyLabel}>{label}</Text>
      <Text style={st.moneyValue}>{value}</Text>
      {sub ? <Text style={[st.moneySub, { color: good ? colors.green : colors.amber }]}>{sub}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  style: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  block: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
  day: { fontFamily: fonts.medium, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: colors.rose },
  time: { fontFamily: fonts.display, fontSize: 34, color: colors.ink },
  moneyLabel: { fontFamily: fonts.light, fontSize: 13, color: colors.muted },
  moneyValue: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  moneySub: { fontFamily: fonts.regular, fontSize: 13 },
  contact: { flexDirection: "row", gap: 8, marginTop: 14 },
});
