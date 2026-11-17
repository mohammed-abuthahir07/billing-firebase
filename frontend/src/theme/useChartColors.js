import { useSyncExternalStore } from "react";

const LIGHT = {
  grid: "#e2e8f0",
  tick: "#64748b",
  tooltip: "#0f172a",
};

const DARK = {
  grid: "#334155",
  tick: "#94a3b8",
  tooltip: "#0f172a",
};

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribe(onChange) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

export function useChartColors() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light");
  return theme === "dark" ? DARK : LIGHT;
}
