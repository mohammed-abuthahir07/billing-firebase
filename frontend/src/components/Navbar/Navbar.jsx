import { useAuth } from "../../context/AuthContext";
import { Menu, X, LogOut, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout, openLoginModal, isMobileMenuOpen, setIsMobileMenuOpen } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setShowDropdown((prev) => !prev);

  useEffect(() => {
    if (!showDropdown) return;

    const handlePointerDown = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showDropdown]);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="navbar-logo">
          <h2>Billing SaaS</h2>
        </div>
      </div>

      <div className="navbar-right">
        {user ? (
          <div className="user-profile-container" ref={dropdownRef}>
            <button
              className="user-profile-trigger"
              onClick={toggleDropdown}
              aria-haspopup="menu"
              aria-expanded={showDropdown}
            >
              <img src={user.avatar} alt="" className="user-avatar" width={30} height={30} decoding="async" key={user.avatar} />
              <span className="user-name">{user.name}</span>
              <ChevronDown size={16} className={`chevron-icon ${showDropdown ? "rotate" : ""}`} />
            </button>

            {showDropdown && (
              <div className="user-dropdown" role="menu">
                <div className="dropdown-header">
                  <p className="dropdown-username">{user.name}</p>
                  <p className="dropdown-email">{user.email}</p>
                </div>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item logout"
                  role="menuitem"
                  onClick={() => {
                    logout();
                    setShowDropdown(false);
                  }}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="login-btn animate-fade-in" onClick={openLoginModal}>
            Login
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
