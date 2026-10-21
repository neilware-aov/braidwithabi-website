import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, tagFor } from "@/lib/theme";

export type IconName = keyof typeof Ionicons.glyphMap;

/** Safe-area spacing: native insets on phones; CSS env() handles it on web. */
export function useInsets() {
  const i = useSafeAreaInsets();
  return Platform.OS === "web" ? { top: 0, bottom: 0, left: 0, right: 0 } : i;
}

// ── Layout ────────────────────────────────────────────────────

export function Screen({
  children,
  title,
  subtitle,
  back,
  right,
  refreshing,
  onRefresh,
  scroll = true,
  footer,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  const insets = useInsets();
  const header = (title || back) && (
    <View style={[s.header, { paddingTop: insets.top + 14 }]}>
      <View style={s.headerRow}>
        {back ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            hitSlop={12}
            style={s.backBtn}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          {title ? <Text style={s.title}>{title}</Text> : null}
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
  const content = (
    <View style={s.contentInner}>{children}</View>
  );
  return (
    <View style={s.screen}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: (footer ? 24 : 40) + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.rose} />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{content}</View>
      )}
      {footer ? <View style={[s.footer, { paddingBottom: 12 + insets.bottom }]}>{footer}</View> : null}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ marginTop: 26 }}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

// ── Text ──────────────────────────────────────────────────────

export function T({
  children,
  style,
  variant = "body",
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  variant?: "body" | "muted" | "small" | "label" | "display" | "displayItalic" | "strong";
  numberOfLines?: number;
}) {
  return (
    <Text style={[s[variant], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ── Controls ──────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  kind = "primary",
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "ghost" | "danger" | "success";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const palette = {
    primary: { bg: colors.ink, fg: colors.cream, border: colors.ink },
    secondary: { bg: colors.ivory, fg: colors.ink, border: colors.line },
    ghost: { bg: "transparent", fg: colors.ink, border: "transparent" },
    danger: { bg: colors.ivory, fg: colors.red, border: colors.redBg },
    success: { bg: colors.green, fg: "#fff", border: colors.green },
  }[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: palette.bg, borderColor: palette.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={palette.fg} /> : null}
          <Text style={[s.btnText, small && { fontSize: 14 }, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, tint = colors.ink }: { icon: IconName; onPress: () => void; label: string; tint?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.7 }]} accessibilityLabel={label}>
      <Ionicons name={icon} size={20} color={tint} />
      <Text style={s.iconBtnLabel}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, sub }: { label: string; active?: boolean; onPress: () => void; sub?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && { color: colors.cream }]}>{label}</Text>
      {sub ? <Text style={[s.chipSub, active && { color: "rgba(250,245,239,0.75)" }]}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.seg, o.value === value && s.segActive]}>
          <Text style={[s.segText, o.value === value && { color: colors.cream }]}>
            {o.label}
            {o.count ? ` · ${o.count}` : ""}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Field({ label, hint, style, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.faint}
        {...props}
        style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: "top", paddingTop: 12 }, style]}
      />
      {hint ? <Text style={[s.small, { marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  prefix?: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <View style={{ marginBottom: 14, flex: 1 }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.input, { flexDirection: "row", alignItems: "center", paddingVertical: 0 }]}>
        {prefix ? <Text style={s.affix}>{prefix}</Text> : null}
        <TextInput
          value={value === null || Number.isNaN(value) ? "" : String(value)}
          onChangeText={(t) => {
            const clean = t.replace(/[^0-9.]/g, "");
            onChange(clean === "" ? null : Number(clean));
          }}
          keyboardType="decimal-pad"
          style={s.inputBare}
          placeholderTextColor={colors.faint}
        />
        {suffix ? <Text style={s.affix}>{suffix}</Text> : null}
      </View>
      {hint ? <Text style={[s.small, { marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

export function SwitchRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={s.switchRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={s.body}>{label}</Text>
        {sub ? <Text style={s.small}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.rose }}
        thumbColor="#fff"
        {...(Platform.OS === "web" ? ({ activeThumbColor: "#fff" } as object) : {})}
      />
    </Pressable>
  );
}

export function Row({
  icon,
  label,
  sub,
  onPress,
  right,
  danger,
}: {
  icon?: IconName;
  label: string;
  sub?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.row, pressed && onPress && { backgroundColor: colors.cream }]}>
      {icon ? (
        <View style={[s.rowIcon, danger && { backgroundColor: colors.redBg }]}>
          <Ionicons name={icon} size={18} color={danger ? colors.red : colors.rose} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[s.body, danger && { color: colors.red }]}>{label}</Text>
        {sub ? <Text style={s.small}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.faint} /> : null)}
    </Pressable>
  );
}

export function Badge({ b }: { b: Parameters<typeof tagFor>[0] }) {
  const st = tagFor(b);
  return (
    <View style={[s.badge, { backgroundColor: st.bg }]}>
      <Text style={[s.badgeText, { color: st.fg }]}>{st.label}</Text>
    </View>
  );
}

export function Empty({ icon, title, text }: { icon: IconName; title: string; text?: string }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={24} color={colors.rose} />
      </View>
      <Text style={[s.display, { fontSize: 22, textAlign: "center" }]}>{title}</Text>
      {text ? <Text style={[s.muted, { textAlign: "center", marginTop: 4 }]}>{text}</Text> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ padding: 40, alignItems: "center" }}>
      <ActivityIndicator color={colors.rose} />
    </View>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={s.error}>
      <Text style={{ color: colors.red, fontFamily: fonts.regular }}>{message}</Text>
    </View>
  );
}

// ── Dialogs that work on phone and web ────────────────────────

export function confirm(title: string, message: string, okLabel = "OK", destructive = false): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}

export function notify(title: string, message?: string) {
  if (Platform.OS === "web") window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

// ── Styles ────────────────────────────────────────────────────

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 20, paddingBottom: 10, backgroundColor: colors.cream },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: 760, width: "100%", alignSelf: "center" },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 4,
  },
  title: { fontFamily: fonts.displayItalic, fontSize: 34, color: colors.ink, lineHeight: 40 },
  subtitle: { fontFamily: fonts.light, fontSize: 15, color: colors.muted, marginTop: 2 },
  contentInner: { paddingHorizontal: 20, maxWidth: 760, width: "100%", alignSelf: "center" },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.cream,
  },
  card: {
    backgroundColor: colors.ivory,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 16, color: colors.ink },
  strong: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  muted: { fontFamily: fonts.light, fontSize: 15, color: colors.muted },
  small: { fontFamily: fonts.light, fontSize: 13, color: colors.muted },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  display: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  displayItalic: { fontFamily: fonts.displayItalic, fontSize: 28, color: colors.ink },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    minHeight: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  btnSmall: { minHeight: 38, paddingHorizontal: 14 },
  btnText: { fontFamily: fonts.medium, fontSize: 16 },
  iconBtn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconBtnLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.ink },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ivory,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  chipSub: { fontFamily: fonts.light, fontSize: 12, color: colors.muted, marginTop: 2 },
  seg: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.line,
  },
  segActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  segText: { fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  input: {
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    minHeight: 50,
  },
  inputBare: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, paddingVertical: 12, minHeight: 48 },
  affix: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted, marginHorizontal: 2 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.ivory,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  badgeText: { fontFamily: fonts.medium, fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 36, paddingHorizontal: 20 },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.blush,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  error: { backgroundColor: colors.redBg, padding: 12, borderRadius: radius.md, marginVertical: 8 },
});
