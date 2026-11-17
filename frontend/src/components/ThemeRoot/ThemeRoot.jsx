import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAdminUI } from "../../admin/context/AdminUIContext";

const ThemeRoot = () => {
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const { resolvedAdminTheme } = useAdminUI();
  const isAdmin = location.pathname.startsWith("/admin");
  const activeTheme = isAdmin ? resolvedAdminTheme : resolvedTheme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = activeTheme;
    root.dataset.portal = isAdmin ? "admin" : "business";
    root.style.colorScheme = activeTheme;
  }, [activeTheme, isAdmin]);

  return null;
};

export default ThemeRoot;
