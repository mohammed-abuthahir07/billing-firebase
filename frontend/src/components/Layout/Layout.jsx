import Navbar from "../Navbar/Navbar";
import Sidebar from "../Sidebar/Sidebar";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Layout.css";

const Layout = () => {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useAuth();

  return (
    <>
      <Navbar />
      <div className="layout">
        <Sidebar />
        
        {isMobileMenuOpen && (
          <div 
            className="sidebar-backdrop" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default Layout;