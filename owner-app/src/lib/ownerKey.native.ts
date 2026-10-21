// Android app (APK). The key is built in when the APK is made, from an EAS
// environment variable — it is never written in this code or repository.
// Only Abi's tablet has the APK.

const key = process.env.EXPO_PUBLIC_OWNER_KEY ?? "";

export const ownerKey = () => key;
export const onKeyChange = (_fn: () => void) => () => {};
export const setOwnerKey = (_k: string) => {};
export const forgetOwnerKey = () => {};
export const parseSetupLink = (_text: string): string | null => null;
export const keepKeyInAddress = () => {};
export const canPair = false;
