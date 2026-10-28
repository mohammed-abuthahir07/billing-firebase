import { useEffect, useState, useMemo } from "react";
import {
    Search,
    Users,
    Eye,
    Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCompanies } from "../../services/adminCompanyService";
import "./Companies.css";

const formatMoney = (value) =>
    `₹ ${Number(value || 0).toLocaleString("en-IN")}`;

const Companies = () => {
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const loadCompanies = async () => {
        try {
            setLoading(true);
            const data = await getCompanies();
            setCompanies(data.companies || []);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCompanies();
    }, []);

    const filteredCompanies = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return companies;
        return companies.filter((company) =>
            (company.name || "").toLowerCase().includes(q) ||
            (company.email || "").toLowerCase().includes(q)
        );
    }, [search, companies]);

    return (
        <div className="companies">
            <div className="companies-header">
                <div>
                    <p className="companies-kicker">
                        <Users size={14} />
                        User directory
                    </p>
                    <h1>User Details</h1>
                    <p className="companies-subtitle">
                        Search registered users and open their billing profiles.
                    </p>
                </div>
                <div className="companies-toolbar">
                    <span className="companies-count">
                        {filteredCompanies.length} {filteredCompanies.length === 1 ? "user" : "users"}
                    </span>
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="companies-table-container">
                {loading ? (
                    <div className="companies-loading">
                        <Loader2 size={22} className="spin-icon" />
                        Loading users...
                    </div>
                ) : (
                    <table className="companies-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Products</th>
                                <th>Invoices</th>
                                <th>Monthly Revenue</th>
                                <th>Yearly Revenue</th>
                                <th>Total Revenue</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCompanies.length > 0 ? (
                                filteredCompanies.map((company, index) => (
                                    <tr key={company.id} style={{ animationDelay: `${index * 40}ms` }}>
                                        <td>
                                            <div className="user-cell">
                                                <span className="user-avatar">
                                                    {(company.name || "U").charAt(0).toUpperCase()}
                                                </span>
                                                <strong>{company.name}</strong>
                                            </div>
                                        </td>
                                        <td>{company.email}</td>
                                        <td>{company.totalProducts}</td>
                                        <td>{company.totalInvoices}</td>
                                        <td>{formatMoney(company.monthlyRevenue)}</td>
                                        <td>{formatMoney(company.yearlyRevenue)}</td>
                                        <td>{formatMoney(company.totalRevenue)}</td>
                                        <td>
                                            <button
                                                className="view-btn"
                                                onClick={() => navigate(`/admin/companies/${company.id}`)}
                                            >
                                                <Eye size={16} />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="empty-row">
                                        No users match your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Companies;
