import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Menu, Shield, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./AdminNavbar.css";
import { useAdminUI } from "../context/AdminUIContext";

const AdminNavbar = () => {
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useAdminUI();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const admin = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem("admin_user"));
        } catch {
            return null;
        }
    }, []);

    const initial = admin?.email?.charAt(0).toUpperCase() || "A";

    useEffect(() => {
        if (!menuOpen) return;
        const handleClick = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpen]);

    const logout = () => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        navigate("/admin/login");
    };

    return (
        <header className="admin-navbar">
            <div className="navbar-left">
                <button
                    className="sidebar-toggle-btn"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label="Toggle Sidebar"
                    type="button"
                >
                    {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>

                <Link to="/admin/dashboard" className="admin-brand">
                    <span className="admin-brand-mark">BS</span>
                    <span className="admin-brand-copy">
                        <strong>Billing SaaS</strong>
                    </span>
                </Link>
            </div>

            <div className="navbar-right" ref={menuRef}>
                <span className="admin-live-pill">
                    <span className="live-dot" />
                    Live
                </span>

                <button
                    type="button"
                    className={`admin-profile ${menuOpen ? "open" : ""}`}
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                >
                    <div className="profile-circle">{initial}</div>
                    <div className="profile-meta">
                        <h4>Administrator</h4>
                        <p>{admin?.email || "admin@gmail.com"}</p>
                    </div>
                    <ChevronDown size={16} className={`profile-chevron ${menuOpen ? "rotate" : ""}`} />
                </button>

                {menuOpen && (
                    <div className="admin-profile-menu" role="menu">
                        <div className="menu-head">
                            <Shield size={14} />
                            Signed in as admin
                        </div>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                setMenuOpen(false);
                                navigate("/admin/dashboard");
                            }}
                        >
                            <LayoutDashboard size={16} />
                            Dashboard
                        </button>
                        <button
                            type="button"
                            className="danger"
                            role="menuitem"
                            onClick={logout}
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default AdminNavbar;
