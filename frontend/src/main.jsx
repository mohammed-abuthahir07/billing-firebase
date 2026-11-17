import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme-variables.css'
import './styles/themes.css'
import './App.css'
import App from './App.jsx'
import { AdminAuthProvider } from './admin/context/AdminAuthContext.jsx'
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AdminUIProvider } from "./admin/context/AdminUIContext.jsx";
import { readBusinessTheme, resolveTheme } from "./theme/themePreference";

document.documentElement.dataset.theme = resolveTheme(readBusinessTheme());
document.documentElement.dataset.portal = "business";

createRoot(document.getElementById('root')).render(
    <AuthProvider>
        <ThemeProvider>
            <AdminAuthProvider>
                <AdminUIProvider>
                      <App />
                </AdminUIProvider>
            </AdminAuthProvider>
        </ThemeProvider>
    </AuthProvider>
)
