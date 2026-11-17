export const BUSINESS_THEME_KEY = "billing_business_theme";
export const ADMIN_THEME_KEY = "billing_admin_theme";
const LEGACY_ADMIN_THEME_KEY = "admin_theme";

export function readThemePreference(key, legacyKey) {
  try {
    const stored = localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : null);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* private browsing can block storage */
  }
  return "light";
}

export function writeThemePreference(key, preference) {
  try {
    localStorage.setItem(key, preference);
  } catch {
    /* preference still applies for this session */
  }
}

export function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(preference, systemIsDark = systemPrefersDark()) {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return systemIsDark ? "dark" : "light";
}

export function readBusinessTheme() {
  return readThemePreference(BUSINESS_THEME_KEY);
}

export function readAdminTheme() {
  return readThemePreference(ADMIN_THEME_KEY, LEGACY_ADMIN_THEME_KEY);
}
