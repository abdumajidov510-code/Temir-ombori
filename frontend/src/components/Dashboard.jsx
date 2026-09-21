import { useEffect, useMemo, useState } from "react";
const API = "http://localhost:5000";
function getAuthHeaders() {
    const token = localStorage.getItem("temir_dokon_token");
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}
function formatMoney(value) {
    return new Intl.NumberFormat("uz-UZ").format(
        Number(value || 0)
    ) + " so'm";
}
function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString("uz-UZ");
}
export default function Dashboard() {
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sales, setSales] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    async function loadDashboard() {
        try {
            setLoading(true);
            setError("");
            const [
                productsResponse,
                customersResponse,
                salesResponse,
                statisticsResponse
            ] = await Promise.all([
                fetch(`${API}/api/tovarlar`, {
                    headers: getAuthHeaders(),
                }),
                fetch(`${API}/api/mijozlar`, {
                    headers: getAuthHeaders(),
                }),
                fetch(`${API}/api/sotuvlar`, {
                    headers: getAuthHeaders(),
                }),
                fetch(`${API}/api/statistika`, {
                    headers: getAuthHeaders(),
                })
            ]);
            if (
                !productsResponse.ok ||
                !customersResponse.ok ||
                !salesResponse.ok ||
                !statisticsResponse.ok
            ) {
                throw new Error("Serverdan ma'lumot olishda xatolik");
            }
            const productsData = await productsResponse.json();
            const customersData = await customersResponse.json();
            const salesData = await salesResponse.json();
            const statisticsData = await statisticsResponse.json();
            setProducts(
                Array.isArray(productsData)
                    ? productsData
                    : productsData.data || []
            );
            setCustomers(
                Array.isArray(customersData)
                    ? customersData
                    : customersData.data || []
            );
            setSales(
                Array.isArray(salesData)
                    ? salesData
                    : salesData.data || []
            );
            setStatistics(statisticsData);
        } catch (err) {
            console.error("Dashboard xatosi:", err);
            setError(
                err.message ||
                "Dashboard ma'lumotlarini yuklashda xatolik"
            );
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        loadDashboard();
    }, []);
    const lowStockProducts = useMemo(() => {
        return products
            .filter((product) => {
                const miqdor = Number(product.miqdor || 0);
                const min = Number(product.min_zaxira || 0);
                return miqdor <= min;
            })
            .sort((a, b) => {
                return Number(a.miqdor || 0) - Number(b.miqdor || 0);
            });
    }, [products]);
    const stats = statistics?.umumiy || {};
    const jamiSavdo = Number(stats.jami_savdo || 0);
    const jamiSotuvlar = Number(stats.jami_sotuvlar || 0);
    const jamiQarz = Number(stats.jami_qarz || 0);
    const nasiyaQarz = Number(
        statistics?.nasiya?.jami_nasiya_qarz || 0
    );
    const topProducts = statistics?.top_tovarlar || [];
    const recentSales = [...sales]
        .sort((a, b) => {
            return (
                new Date(b.sotilgan_vaqt || 0) -
                new Date(a.sotilgan_vaqt || 0)
            );
        })
        .slice(0, 5);
    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <h2>Dashboard yuklanmoqda...</h2>
            </div>
        );
    }
    return (
        <div className="dashboard">
            {/* HEADER */}
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>
                        Temir Do'kon boshqaruv tizimiga xush kelibsiz
                    </p>
                </div>
                <button
                    className="refresh-btn"
                    onClick={loadDashboard}
                >
                    🔄 Yangilash
                </button>
            </div>
            {/* ERROR */}
            {error && (
                <div className="dashboard-error">
                    ⚠️ {error}
                </div>
            )}
            {/* STAT CARDS */}
            <div className="dashboard-cards">
                <div className="dashboard-card">
                    <div className="card-icon">💰</div>
                    <div>
                        <span>Jami savdo</span>
                        <strong>
                            {formatMoney(jamiSavdo)}
                        </strong>
                    </div>
                </div>
                <div className="dashboard-card">
                    <div className="card-icon">🧾</div>
                    <div>
                        <span>Jami sotuvlar</span>
                        <strong>
                            {jamiSotuvlar}
                        </strong>
                    </div>
                </div>
                <div className="dashboard-card">
                    <div className="card-icon">📒</div>
                    <div>
                        <span>Jami qarz</span>
                        <strong>
                            {formatMoney(jamiQarz)}
                        </strong>
                    </div>
                </div>
                <div className="dashboard-card">
                    <div className="card-icon">👥</div>
                    <div>
                        <span>Mijozlar</span>
                        <strong>
                            {customers.length}
                        </strong>
                    </div>
                </div>
            </div>
            {/* SECOND ROW */}
            <div className="dashboard-grid">
                {/* LOW STOCK */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>⚠️ Kam qolgan tovarlar</h2>
                            <p>Zaxirani to'ldirish kerak bo'lgan mahsulotlar</p>
                        </div>
                        <span className="panel-count">
                            {lowStockProducts.length}
                        </span>
                    </div>
                    {lowStockProducts.length === 0 ? (
                        <div className="empty-state">
                            <div>✅</div>
                            <p>
                                Hozircha kam qolgan tovarlar yo'q
                            </p>
                        </div>
                    ) : (
                        <div className="stock-list">
                            {lowStockProducts
                                .slice(0, 6)
                                .map((product) => {
                                    const miqdor = Number(
                                        product.miqdor || 0
                                    );
                                    const min = Number(
                                        product.min_zaxira || 0
                                    );
                                    return (
                                        <div
                                            className="stock-item"
                                            key={product.id}
                                        >
                                            <div>
                                                <strong>
                                                    {product.nom}
                                                </strong>
                                                <span>
                                                    {product.kategoriya ||
                                                        "Kategoriya yo'q"}
                                                </span>
                                            </div>
                                            <div className="stock-number">
                                                <strong>
                                                    {miqdor}
                                                </strong>
                                                <span>
                                                    / min {min}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
                {/* TOP PRODUCTS */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>🏆 Eng ko'p sotilgan</h2>
                            <p>Mahsulotlar bo'yicha sotuvlar</p>
                        </div>
                    </div>
                    {topProducts.length === 0 ? (
                        <div className="empty-state">
                            <div>📦</div>
                            <p>
                                Hozircha sotuv ma'lumotlari yo'q
                            </p>
                        </div>
                    ) : (
                        <div className="top-products">
                            {topProducts
                                .slice(0, 6)
                                .map((product, index) => (
                                    <div
                                        className="top-product"
                                        key={product.id}
                                    >
                                        <div className="rank">
                                            {index + 1}
                                        </div>
                                        <div className="top-product-info">
                                            <strong>
                                                {product.nom}
                                            </strong>
                                            <span>
                                                {product.sotilgan_miqdor} dona
                                            </span>
                                        </div>
                                        <strong className="top-product-money">
                                            {formatMoney(
                                                product.sotuv_summa
                                            )}
                                        </strong>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
            {/* THIRD ROW */}
            <div className="dashboard-grid">
                {/* RECENT SALES */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>🕐 Oxirgi sotuvlar</h2>
                            <p>Eng so'nggi amalga oshirilgan sotuvlar</p>
                        </div>
                    </div>
                    {recentSales.length === 0 ? (
                        <div className="empty-state">
                            <div>🧾</div>
                            <p>
                                Hozircha sotuvlar mavjud emas
                            </p>
                        </div>
                    ) : (
                        <div className="sales-table-wrapper">
                            <table className="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Mijoz</th>
                                        <th>Summa</th>
                                        <th>To'lov</th>
                                        <th>Vaqt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSales.map((sale) => {
                                        const paymentType =
                                            sale.tolov_turi || "naqd";
                                        return (
                                            <tr key={sale.id}>
                                                <td>
                                                    #{sale.id}
                                                </td>
                                                <td>
                                                    {sale.mijoz_ismi ||
                                                        "Noma'lum mijoz"}
                                                </td>
                                                <td>
                                                    <strong>
                                                        {formatMoney(
                                                            sale.jami_summa
                                                        )}
                                                    </strong>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`payment-badge ${paymentType}`}
                                                    >
                                                        {paymentType ===
                                                        "naqd"
                                                            ? "Naqd"
                                                            : paymentType ===
                                                              "nasiya"
                                                            ? "Nasiya"
                                                            : "Qisman"}
                                                    </span>
                                                </td>
                                                <td>
                                                    {formatDate(
                                                        sale.sotilgan_vaqt
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {/* QUICK INFO */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>📊 Qisqa ma'lumot</h2>
                            <p>Do'konning hozirgi holati</p>
                        </div>
                    </div>
                    <div className="quick-info">
                        <div className="quick-info-item">
                            <span>📦 Jami tovarlar</span>
                            <strong>
                                {products.length}
                            </strong>
                        </div>
                        <div className="quick-info-item">
                            <span>⚠️ Kam zaxira</span>
                            <strong>
                                {lowStockProducts.length}
                            </strong>
                        </div>
                        <div className="quick-info-item">
                            <span>📒 Nasiya qarzi</span>
                            <strong>
                                {formatMoney(nasiyaQarz)}
                            </strong>
                        </div>
                        <div className="quick-info-item">
                            <span>💵 To'langan summa</span>
                            <strong>
                                {formatMoney(
                                    stats.jami_tolangan
                                )}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
