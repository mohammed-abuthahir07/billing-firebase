import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import AdminNavbar from "../components/AdminNavbar";
import { useAdminUI } from "../context/AdminUIContext";
import "./AdminLayout.css";

const AdminLayout = () => {
    const { adminTheme } = useAdminUI();

    return (
        <div className={`admin-layout ${adminTheme === "dark" ? "admin-dark-theme" : ""}`}>
            <AdminSidebar />
            <div className="admin-main">
                <AdminNavbar />
                <div className="admin-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
