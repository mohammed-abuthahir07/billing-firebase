import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  BUSINESS_THEME_KEY,
  readBusinessTheme,
  resolveTheme,
  systemPrefersDark,
  writeThemePreference,
} from "../theme/themePreference";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readBusinessTheme);
  const [systemIsDark, setSystemIsDark] = useState(systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemIsDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const setTheme = useCallback((next) => {
    const preference = next === "dark" || next === "system" ? next : "light";
    setPreference(preference);
    writeThemePreference(BUSINESS_THEME_KEY, preference);
  }, []);

  const resolvedTheme = resolveTheme(preference, systemIsDark);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setTheme }),
    [preference, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
