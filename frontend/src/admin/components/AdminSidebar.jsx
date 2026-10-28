import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  IndianRupee,
  LogOut
} from "lucide-react";
import "./AdminSidebar.css";
import { useAdminUI } from "../context/AdminUIContext";

const AdminSidebar = () => {
  const {isMobileMenuOpen, setIsMobileMenuOpen} = useAdminUI();
  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };
  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    window.location.href = "/admin/login";
  };
  return (
    <aside className={`admin-sidebar ${
        isMobileMenuOpen ? "open" : ""
    }`}>
      <nav>
        <NavLink
          to="/admin/dashboard"
          className="sidebar-link"
          onClick={handleLinkClick}
        >
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>
        <NavLink
          to="/admin/companies"
          className="sidebar-link"
          onClick={handleLinkClick}
        >
          <Building2 size={20} />
          User Details
        </NavLink>
        <NavLink
          to="/admin/analytics"
          className="sidebar-link"
          onClick={handleLinkClick}
        >
          <IndianRupee size={20} />
          Analytics
        </NavLink>
      </nav>
      <button
        className="logout-btn"
        onClick={() => {
           setIsMobileMenuOpen(false);
           logout();
        }}
      >
        <LogOut size={18} />
        Logout
      </button>

    </aside>

  );

};

export default AdminSidebar;