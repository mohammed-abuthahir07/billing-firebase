import { useEffect, useState } from "react";
import {
    Users,
    Package,
    Receipt,
    IndianRupee,
    Wallet,
    LayoutDashboard,
    Loader2,
    RefreshCw,
    TrendingUp,
} from "lucide-react";
import { getAdminDashboard } from "../../services/adminDashboardService";
import "./AdminDashboard.css";

const formatCount = (value) =>
    Number(value || 0).toLocaleString("en-IN");

const formatMoney = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [dashboard, setDashboard] = useState({
        totalUsers: 0,
        totalProducts: 0,
        totalInvoices: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
    });

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const data = await getAdminDashboard();
            setDashboard({
                totalUsers: data.totalUsers || 0,
                totalProducts: data.totalProducts || 0,
                totalInvoices: data.totalInvoices || 0,
                totalRevenue: data.totalRevenue || 0,
                monthlyRevenue: data.monthlyRevenue || 0,
            });
        } catch (error) {
            console.error("Admin dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const cards = [
        {
            title: "Total Companies",
            value: formatCount(dashboard.totalUsers),
            icon: Users,
            color: "blue",
            change: "Registered business accounts",
        },
        {
            title: "Total Products",
            value: formatCount(dashboard.totalProducts),
            icon: Package,
            color: "purple",
            change: "Packed variants listed",
        },
        {
            title: "Total Invoices",
            value: formatCount(dashboard.totalInvoices),
            icon: Receipt,
            color: "green",
            change: "Lifetime issued bills",
        },
        {
            title: "Total Sales",
            value: formatMoney(dashboard.totalRevenue),
            icon: IndianRupee,
            color: "amber",
            change: "All-time recorded revenue",
        },
        {
            title: "Monthly Sales",
            value: formatMoney(dashboard.monthlyRevenue),
            icon: Wallet,
            color: "emerald",
            change: "Current calendar month",
        },
    ];

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <p className="dashboard-kicker">
                        <TrendingUp size={14} />
                        PLATFORM OVERVIEW
                    </p>
                    <h1 className="dashboard-title">Dashboard</h1>
                    <p className="dashboard-subtitle">
                        Real-time system health, customer accounts, and cumulative revenue.
                    </p>
                </div>
                <button
                    className="dashboard-refresh"
                    onClick={loadDashboard}
                    disabled={loading}
                    aria-label="Refresh dashboard data"
                >
                    <RefreshCw size={15} className={loading ? "spin" : ""} />
                    <span>Refresh</span>
                </button>
            </div>

            {loading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px", color: "#64748b", gap: "10px" }}>
                    <Loader2 size={32} className="spin" />
                    <span>Loading platform data...</span>
                </div>
            ) : (
                <div className="dashboard-cards">
                    {cards.map((card, idx) => {
                        const Icon = card.icon;
                        return (
                            <div key={idx} className={`card ${card.color}`}>
                                <div className="card-top">
                                    <span className="card-title">{card.title}</span>
                                    <div className="card-icon">
                                        <Icon size={20} />
                                    </div>
                                </div>
                                <div className="card-value">{card.value}</div>
                                <div className="card-change positive">
                                    <span>{card.change}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
