import "./Sidebar.css";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Package, Receipt, BarChart3, TrendingUp, LogOut, User } from "lucide-react";

const Sidebar = () => {
  const { user, logout, isMobileMenuOpen, setIsMobileMenuOpen } = useAuth();

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? "open" : ""}`}>
      <ul className="sidebar-menu">
        <NavLink
          to="/dashboard"
          className="nav-link"
          onClick={handleLinkClick}
        >
          <li className="sidebar-item">
            <LayoutDashboard size={20} className="sidebar-icon" />
            <span>Dashboard</span>
          </li>
        </NavLink>

        <NavLink
          to="/products"
          className="nav-link"
          onClick={handleLinkClick}
        >
          <li className="sidebar-item">
            <Package size={20} className="sidebar-icon" />
            <span>Products</span>
          </li>
        </NavLink>

        <NavLink
          to="/bills"
          className="nav-link"
          onClick={handleLinkClick}
        >
          <li className="sidebar-item">
            <Receipt size={20} className="sidebar-icon" />
            <span>Bills</span>
          </li>
        </NavLink>

        <NavLink
          to="/analytics"
          className="nav-link"
          onClick={handleLinkClick}
        >
          <li className="sidebar-item">
            <TrendingUp size={20} className="sidebar-icon" />
            <span>Analytics</span>
          </li>
        </NavLink>

        <NavLink
          to="/reports"
          className="nav-link"
          onClick={handleLinkClick}
        >
          <li className="sidebar-item">
            <BarChart3 size={20} className="sidebar-icon" />
            <span>Reports</span>
          </li>
        </NavLink>

        <NavLink
          to="/profile"
          className="nav-link"
          onClick={handleLinkClick}
        >
          <li className="sidebar-item">
            <User size={20} className="sidebar-icon" />
            <span>Profile</span>
          </li>
        </NavLink>
      </ul>

      {user && (
        <button 
          className="logout-btn" 
          onClick={() => {
            logout();
            setIsMobileMenuOpen(false);
          }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      )}
    </aside>
  );
};

export default Sidebar;