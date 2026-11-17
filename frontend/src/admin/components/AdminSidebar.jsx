import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  IndianRupee,
  Receipt,
  Package,
  Trash2,
  Settings,
  LogOut
} from "lucide-react";
import "./AdminSidebar.css";
import { useAdminUI } from "../context/AdminUIContext";
import { useAdminAuth } from "../context/AdminAuthContext";

const AdminSidebar = () => {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useAdminUI();
  const { logout: signOutAdmin } = useAdminAuth();

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  const logout = async () => {
    await signOutAdmin();
    window.location.href = "/admin/login";
  };

  return (
    <aside className={`admin-sidebar ${isMobileMenuOpen ? "open" : ""}`}>
      <nav>
        {/* SECTION: OVERVIEW */}
        <div className="sidebar-section-header">OVERVIEW</div>

        <NavLink
          to="/admin/dashboard"
          className="sidebar-link"
          onClick={handleLinkClick}
        >
          <LayoutDashboard size={19} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/admin/companies"
          className="sidebar-link"
          onClick={handleLinkClick}
        >
          <Building2 size={19} />
          <span>User Details</span>
        </NavLink>

        <NavLink
          to="/admin/analytics"
          className="sidebar-link"
          onClick={handleLinkClick}
        >
          <IndianRupee size={19} />
          <span>Analytics</span>
        </NavLink>

        {/* SECTION: MANAGEMENT */}
        <div className="sidebar-section-header">MANAGEMENT</div>

        <NavLink
          to="/admin/invoices"
          className="sidebar-link"
          onClick={handleLinkClick}
        >
          <Receipt size={19} />
          <span>Invoice Management</span>
        </NavLink>

        <NavLink
          to="/admin/products"
          className="sidebar-link"
          onClick={handleLinkClick}
        >
          <Package size={19} />
          <span>Product Overview</span>
        </NavLink>

        {/* SECTION: SYSTEM */}
        <div className="sidebar-section-header">SYSTEM</div>

        <NavLink
          to="/admin/deleted-invoices"
          className="sidebar-link"
          onClick={handleLinkClick}
        >
          <Trash2 size={19} />
          <span>Deleted Invoices</span>
        </NavLink>

        <NavLink
          to="/admin/settings"
          className="sidebar-link"
          onClick={handleLinkClick}
        >
          <Settings size={19} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="logout-container">
        <button
          className="logout-btn"
          onClick={() => {
            setIsMobileMenuOpen(false);
            logout();
          }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
