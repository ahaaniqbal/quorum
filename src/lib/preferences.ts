export type AutonomyMode = "draft_only" | "approve_to_send" | "auto_send";

export type AutonomyPrefs = {
  mode: AutonomyMode;
  minScore: number;
  slackOnlyBooked: boolean;
};

export type SetupPrefs = {
  slackConnected: boolean;
  crmConnected: boolean;
  calendarConnected: boolean;
  emailConnected: boolean;
};

export const DEFAULT_AUTONOMY: AutonomyPrefs = {
  mode: "approve_to_send",
  minScore: 75,
  slackOnlyBooked: true,
};

export const DEFAULT_SETUP: SetupPrefs = {
  slackConnected: false,
  crmConnected: false,
  calendarConnected: false,
  emailConnected: false,
};

export function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("quorum:prefs", { detail: { key, value } }));
}

export function loadAutonomyPrefs(): AutonomyPrefs {
  return loadJson("quorum.autonomy", DEFAULT_AUTONOMY);
}

export function saveAutonomyPrefs(value: AutonomyPrefs) {
  saveJson("quorum.autonomy", value);
}

export function loadSetupPrefs(): SetupPrefs {
  return loadJson("quorum.setup", DEFAULT_SETUP);
}

export function saveSetupPrefs(value: SetupPrefs) {
  saveJson("quorum.setup", value);
}
