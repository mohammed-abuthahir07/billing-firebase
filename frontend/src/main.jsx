import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { AdminAuthProvider } from './admin/context/AdminAuthContext.jsx'
import { AuthProvider } from "./context/AuthContext";
import { AdminUIProvider } from "./admin/context/AdminUIContext.jsx";

createRoot(document.getElementById('root')).render(
    <AuthProvider>
        <AdminAuthProvider>
            <AdminUIProvider>
                  <App />
            </AdminUIProvider>
        </AdminAuthProvider>
    </AuthProvider>
)
