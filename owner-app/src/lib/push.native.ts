// Android / iOS build: Expo push notifications.
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";
import { emitChange, savePushSubscription } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushState = "enabled" | "available" | "blocked" | "needs-install" | "unsupported";

export async function getPushState(): Promise<PushState> {
  if (!Device.isDevice) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "enabled";
  if (status === "denied") return "blocked";
  return "available";
}

export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!Device.isDevice) return { ok: false, error: "Notifications need a real phone or tablet." };
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Bookings",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#a65e4e",
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return { ok: false, error: "Notifications are turned off for this app in Settings." };
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return { ok: false, error: "Missing EAS project id (run `eas init`)." };
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await savePushSubscription({ kind: "expo", token });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

/** Re-register silently on every launch (tokens can change). */
export async function refreshPushRegistration() {
  if ((await getPushState()) === "enabled") await enablePush();
}

/** An alert arriving reloads the lists; tapping it opens the appointment. */
export function listenForNotifications(): () => void {
  const received = Notifications.addNotificationReceivedListener(() => emitChange());
  const tapped = Notifications.addNotificationResponseReceivedListener((res) => {
    const data = res.notification.request.content.data as Record<string, unknown> | undefined;
    if (data?.bookingId) router.push(`/booking/${data.bookingId}`);
    else router.push("/");
  });
  return () => {
    received.remove();
    tapped.remove();
  };
}

export const isStandalone = () => true;
export const isIos = () => Platform.OS === "ios";
export const canPromptInstall = () => false;
export const promptInstall = async () => "unavailable" as const;
export const onInstallableChange = (_fn: () => void) => () => {};
export function registerServiceWorker() {}
