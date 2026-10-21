import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, confirm, ErrorNote, Field, Loading, notify, NumberField, Screen, Section, SwitchRow, T } from "@/components/ui";
import { deleteStyle, imageUrl, listStyles, saveStyle, uploadStylePhoto } from "@/lib/api";
import { colors, fonts, radius } from "@/lib/theme";
import type { Style, StyleVariant } from "@/lib/types";

type Form = Omit<Style, "id"> & { id?: string };

const blank: Form = {
  name: "",
  description: "",
  image_url: "",
  duration_minutes: 240,
  price: 150,
  deposit: null,
  variants: [],
  hair_included: false,
  is_active: true,
  sort_order: 100,
};

export default function EditStyle() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [form, setForm] = useState<Form | null>(id ? null : blank);
  const [photo, setPhoto] = useState<string | null>(null); // picked but not uploaded yet
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) listStyles().then((all) => setForm(all.find((s) => s.id === id) ?? blank)).catch((e) => setError(e.message));
  }, [id]);

  if (!form) return <Screen back title="Style">{error ? <ErrorNote message={error} /> : <Loading />}</Screen>;
  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 5], quality: 1 });
    if (!res.canceled && res.assets?.[0]) setPhoto(res.assets[0].uri);
  }

  function setVariant(i: number, patch: Partial<StyleVariant>) {
    set({ variants: form!.variants.map((v, n) => (n === i ? { ...v, ...patch } : v)) });
  }

  async function save() {
    if (!form!.name.trim()) return setError("Give the style a name.");
    if (form!.variants.some((v) => !v.label.trim())) return setError("Every size / length needs a name.");
    setSaving(true);
    setError(null);
    try {
      const saved = await saveStyle({ ...form!, name: form!.name.trim() });
      if (photo) await uploadStylePhoto(saved.id, photo);
      router.back();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  const hours = Math.floor(form.duration_minutes / 60);
  const mins = form.duration_minutes % 60;
  const shown = photo ?? (form.image_url ? imageUrl(form.image_url) : null);

  return (
    <Screen back title={id ? form.name || "Style" : "New style"} footer={<Button label="Save" onPress={save} loading={saving} />}>
      <Pressable onPress={pickPhoto} style={st.photo}>
        {shown ? <Image source={{ uri: shown }} style={StyleSheet.absoluteFill} /> : null}
        <View style={st.photoBtn}>
          <Ionicons name="camera-outline" size={18} color={colors.ink} />
          <Text style={st.photoText}>{shown ? "Change photo" : "Add a photo"}</Text>
        </View>
      </Pressable>

      <Section title="Details">
        <Field label="Name" value={form.name} onChangeText={(name) => set({ name })} placeholder="e.g. Knotless Braids" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <NumberField label="Price" prefix="$" value={form.price} onChange={(n) => set({ price: n ?? 0 })} />
          <NumberField label="Hours" value={hours} onChange={(n) => set({ duration_minutes: (n ?? 0) * 60 + mins })} />
          <NumberField label="Minutes" value={mins} onChange={(n) => set({ duration_minutes: hours * 60 + Math.min(59, n ?? 0) })} />
        </View>
        <Field label="Description" value={form.description} onChangeText={(description) => set({ description })} multiline />
        <SwitchRow label="Braiding hair included" value={form.hair_included} onChange={(hair_included) => set({ hair_included })} />
        <SwitchRow
          label="Show on my website"
          sub={form.is_active ? undefined : "Hidden — clients can't book it"}
          value={form.is_active}
          onChange={(is_active) => set({ is_active })}
        />
      </Section>

      <Section
        title="Sizes / lengths"
        action={
          <Button
            small
            kind="ghost"
            icon="add"
            label="Add"
            onPress={() => set({ variants: [...form.variants, { label: "", price: form.price, duration_minutes: form.duration_minutes }] })}
          />
        }
      >
        {!form.variants.length ? (
          <T variant="small">Optional — add options like “Medium · Mid-back” if the price and time change with size.</T>
        ) : null}
        {form.variants.map((v, i) => (
          <View key={i} style={st.variant}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Field label="Option" value={v.label} onChangeText={(label) => setVariant(i, { label })} placeholder="Medium · Mid-back" />
              </View>
              <Pressable onPress={() => set({ variants: form.variants.filter((_, n) => n !== i) })} style={st.remove} accessibilityLabel="Remove option">
                <Ionicons name="trash-outline" size={20} color={colors.red} />
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <NumberField label="Price" prefix="$" value={v.price} onChange={(n) => setVariant(i, { price: n ?? 0 })} />
              <NumberField label="Minutes" value={v.duration_minutes} onChange={(n) => setVariant(i, { duration_minutes: n ?? 0 })} />
            </View>
          </View>
        ))}
      </Section>

      <ErrorNote message={error} />

      {id ? (
        <Button
          kind="ghost"
          icon="trash-outline"
          label="Delete this style"
          style={{ marginTop: 24 }}
          onPress={async () => {
            if (await confirm("Delete this style?", "Past appointments keep their details. Tip: you can just hide it instead.", "Delete", true)) {
              try {
                await deleteStyle(id);
                router.back();
              } catch (e: any) {
                notify("Couldn't delete", e?.message);
              }
            }
          }}
        />
      ) : null}
    </Screen>
  );
}

const st = StyleSheet.create({
  photo: {
    marginTop: 6,
    width: "100%",
    aspectRatio: 4 / 5,
    maxHeight: 420,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.blush,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 16,
  },
  photoBtn: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: "rgba(255,253,249,0.92)",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: radius.pill,
  },
  photoText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  variant: { backgroundColor: colors.ivory, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 10 },
  remove: { marginTop: 24, width: 44, height: 50, alignItems: "center", justifyContent: "center" },
});
