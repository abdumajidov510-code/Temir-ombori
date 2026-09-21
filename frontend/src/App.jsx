import { useEffect, useMemo, useState } from "react";

import Tovarlar from "./components/Tovarlar";
import Sotuvlar from "./components/Sotuvlar";
import Nasiya from "./components/Nasiya";
import Statistika from "./components/Statistika";
import Login from "./components/Login";
import Foydalanuvchilar from "./components/Foydalanuvchilar";

import "./App.css";

const API = "http://localhost:5000";

const API_TOVARLAR = `${API}/api/tovarlar`;
const API_MIJOZLAR = `${API}/api/mijozlar`;
const API_SOTUVLAR = `${API}/api/sotuvlar`;
const API_NASIYA = `${API}/api/nasiya`;

const emptyMijoz = {
  ism: "",
  telefon: "",
  manzil: "",
  izoh: "",
};

function getAuthHeaders() {
  const token = localStorage.getItem("temir_dokon_token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function App() {
  // =====================================================
  // USER / AUTH
  // =====================================================

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem("temir_dokon_user");

    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [authChecking, setAuthChecking] = useState(true);

  // =====================================================
  // NAVIGATION
  // =====================================================

  const [activePage, setActivePage] = useState("dashboard");

  // =====================================================
  // DATA
  // =====================================================

  const [tovarlar, setTovarlar] = useState([]);
  const [mijozlar, setMijozlar] = useState([]);
  const [sotuvlar, setSotuvlar] = useState([]);
  const [nasiya, setNasiya] = useState([]);

  // =====================================================
  // MIJOZ FORM
  // =====================================================

  const [mijozLoading, setMijozLoading] = useState(false);
  const [mijozQidiruv, setMijozQidiruv] = useState("");
  const [mijozForm, setMijozForm] = useState(emptyMijoz);
  const [editingMijozId, setEditingMijozId] = useState(null);

  // =====================================================
  // MESSAGES
  // =====================================================

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // AUTH CHECK
  // =====================================================

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem("temir_dokon_token");
      const savedUser = localStorage.getItem("temir_dokon_user");

      if (!token || !savedUser) {
        setCurrentUser(null);
        setAuthChecking(false);
        return;
      }

      try {
        const response = await fetch(`${API}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          localStorage.removeItem("temir_dokon_token");
          localStorage.removeItem("temir_dokon_user");

          setCurrentUser(null);
          setAuthChecking(false);
          return;
        }

        setCurrentUser(data.user);

        localStorage.setItem(
          "temir_dokon_user",
          JSON.stringify(data.user)
        );
      } catch (err) {
        console.error("Auth tekshirish xatosi:", err);

        // Server vaqtincha ishlamasa,
        // saqlangan userni chiqarib yubormaymiz.
      } finally {
        setAuthChecking(false);
      }
    }

    checkAuth();
  }, []);

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = (user) => {
    setCurrentUser(user);
    setActivePage("dashboard");

    setMessage(`Xush kelibsiz, ${user.ism}!`);
    setError("");

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("temir_dokon_token");
    localStorage.removeItem("temir_dokon_user");

    setCurrentUser(null);
    setActivePage("dashboard");

    setMessage("");
    setError("");
  };

  // =====================================================
  // TOVARLAR
  // =====================================================

  const loadTovarlar = async () => {
    try {
      const response = await fetch(API_TOVARLAR, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Tovarlarni olishda xatolik");
      }

      const data = await response.json();

      setTovarlar(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Tovarlar:", err);
      setError(err.message);
    }
  };

  // =====================================================
  // MIJOZLAR
  // =====================================================

  const loadMijozlar = async () => {
    try {
      setMijozLoading(true);

      const response = await fetch(API_MIJOZLAR, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Mijozlarni olishda xatolik");
      }

      const data = await response.json();

      setMijozlar(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Mijozlar:", err);
      setError(err.message);
    } finally {
      setMijozLoading(false);
    }
  };

  // =====================================================
  // SOTUVLAR
  // =====================================================

  const loadSotuvlar = async () => {
    try {
      const response = await fetch(API_SOTUVLAR, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Sotuvlarni olishda xatolik");
      }

      const data = await response.json();

      setSotuvlar(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Sotuvlar:", err);
    }
  };

  // =====================================================
  // NASIYA
  // =====================================================

  const loadNasiya = async () => {
    try {
      const response = await fetch(API_NASIYA, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          "Nasiya ma'lumotlarini olishda xatolik"
        );
      }

      const data = await response.json();

      setNasiya(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Nasiya:", err);
    }
  };

  // =====================================================
  // INITIAL DATA
  // =====================================================

  useEffect(() => {
    if (!currentUser || authChecking) {
      return;
    }

    loadTovarlar();
    loadMijozlar();
    loadSotuvlar();
    loadNasiya();
  }, [currentUser, authChecking]);

  // =====================================================
  // MIJOZ FORM CHANGE
  // =====================================================

  const handleMijozChange = (e) => {
    const { name, value } = e.target;

    setMijozForm((old) => ({
      ...old,
      [name]: value,
    }));
  };

  // =====================================================
  // MIJOZ ADD / EDIT
  // =====================================================

  const handleMijozSubmit = async (e) => {
    e.preventDefault();

    if (!mijozForm.ism.trim()) {
      setError("Mijoz ismini kiriting");
      return;
    }

    try {
      setError("");
      setMessage("");

      const url = editingMijozId
        ? `${API_MIJOZLAR}/${editingMijozId}`
        : API_MIJOZLAR;

      const method = editingMijozId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(mijozForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Xatolik yuz berdi"
        );
      }

      setMessage(
        editingMijozId
          ? "Mijoz muvaffaqiyatli yangilandi"
          : "Mijoz muvaffaqiyatli qo'shildi"
      );

      setMijozForm(emptyMijoz);
      setEditingMijozId(null);

      await loadMijozlar();

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // =====================================================
  // MIJOZ EDIT
  // =====================================================

  const handleMijozEdit = (mijoz) => {
    setEditingMijozId(mijoz.id);

    setMijozForm({
      ism: mijoz.ism || "",
      telefon: mijoz.telefon || "",
      manzil: mijoz.manzil || "",
      izoh: mijoz.izoh || "",
    });

    setActivePage("mijozlar");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // CANCEL MIJOZ EDIT
  // =====================================================

  const cancelMijozEdit = () => {
    setEditingMijozId(null);
    setMijozForm(emptyMijoz);
    setError("");
  };

  // =====================================================
  // MIJOZ DELETE
  // =====================================================

  const handleMijozDelete = async (id) => {
    if (currentUser?.rol !== "admin") {
      setError(
        "Mijozni o‘chirish faqat admin uchun"
      );
      return;
    }

    const tasdiq = window.confirm(
      "Bu mijozni o'chirishga ishonchingiz komilmi?"
    );

    if (!tasdiq) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_MIJOZLAR}/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "O'chirishda xatolik"
        );
      }

      setMessage("Mijoz o'chirildi");

      await loadMijozlar();
      await loadNasiya();

      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // =====================================================
  // MIJOZ FILTER
  // =====================================================

  const filteredMijozlar = useMemo(() => {
    const search = mijozQidiruv
      .toLowerCase()
      .trim();

    return mijozlar.filter((mijoz) => {
      return (
        mijoz.ism
          ?.toLowerCase()
          .includes(search) ||
        mijoz.telefon
          ?.toLowerCase()
          .includes(search) ||
        mijoz.manzil
          ?.toLowerCase()
          .includes(search)
      );
    });
  }, [mijozlar, mijozQidiruv]);

  // =====================================================
  // STATISTICS
  // =====================================================

  const jamiTovar = tovarlar.length;

  const jamiMiqdor = tovarlar.reduce(
    (sum, tovar) =>
      sum + Number(tovar.miqdor || 0),
    0
  );

  const kamQolgan = tovarlar.filter(
    (tovar) =>
      Number(tovar.miqdor || 0) <=
      Number(tovar.min_zaxira || 0)
  ).length;

  const umumiyQiymat = tovarlar.reduce(
    (sum, tovar) =>
      sum +
      Number(tovar.narx || 0) *
        Number(tovar.miqdor || 0),
    0
  );

  const jamiMijoz = mijozlar.length;

  const jamiSotuv = sotuvlar.length;

  const jamiNasiya = nasiya.reduce(
    (sum, mijoz) =>
      sum + Number(mijoz.qarz || 0),
    0
  );

  // =====================================================
  // MONEY FORMAT
  // =====================================================

  const formatMoney = (value) => {
    return new Intl.NumberFormat("uz-UZ").format(
      Number(value || 0)
    );
  };

  // =====================================================
  // DASHBOARD
  // =====================================================

  const DashboardPage = () => {
    return (
      <>
        <section className="stats">
          <div className="stat-card">
            <span>📦</span>

            <div>
              <small>Jami tovarlar</small>
              <strong>{jamiTovar}</strong>
            </div>
          </div>

          <div className="stat-card">
            <span>🔢</span>

            <div>
              <small>Jami miqdor</small>
              <strong>{jamiMiqdor}</strong>
            </div>
          </div>

          <div className="stat-card warning">
            <span>⚠️</span>

            <div>
              <small>Kam qolgan</small>
              <strong>{kamQolgan}</strong>
            </div>
          </div>

          <div className="stat-card">
            <span>💰</span>

            <div>
              <small>Ombor qiymati</small>

              <strong>
                {formatMoney(umumiyQiymat)} so‘m
              </strong>
            </div>
          </div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>👥</span>

            <div>
              <small>Mijozlar</small>
              <strong>{jamiMijoz}</strong>
            </div>
          </div>

          <div className="stat-card">
            <span>💵</span>

            <div>
              <small>Sotuvlar</small>
              <strong>{jamiSotuv}</strong>
            </div>
          </div>

          <div className="stat-card warning">
            <span>🧾</span>

            <div>
              <small>Nasiya</small>

              <strong>
                {formatMoney(jamiNasiya)} so‘m
              </strong>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="products-header">
            <div>
              <h2>🏠 Boshqaruv paneli</h2>

              <p>
                Temir Do‘koni tizimining umumiy holati
              </p>
            </div>

            <button
              className="btn secondary"
              onClick={() => {
                loadTovarlar();
                loadMijozlar();
                loadSotuvlar();
                loadNasiya();
              }}
            >
              🔄 Yangilash
            </button>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <div className="dashboard-icon">
                📦
              </div>

              <div>
                <h3>Ombor</h3>

                <p>
                  {jamiTovar} xil tovar mavjud.
                </p>
              </div>

              <button
                className="btn primary"
                onClick={() =>
                  setActivePage("tovarlar")
                }
              >
                Tovarlarni ko‘rish
              </button>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-icon">
                👥
              </div>

              <div>
                <h3>Mijozlar</h3>

                <p>
                  {jamiMijoz} ta mijoz ro‘yxatda.
                </p>
              </div>

              <button
                className="btn primary"
                onClick={() =>
                  setActivePage("mijozlar")
                }
              >
                Mijozlarni ko‘rish
              </button>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-icon">
                💰
              </div>

              <div>
                <h3>Sotuvlar</h3>

                <p>
                  {jamiSotuv} ta sotuv amalga oshirilgan.
                </p>
              </div>

              <button
                className="btn primary"
                onClick={() =>
                  setActivePage("sotuvlar")
                }
              >
                Sotuvlarni ko‘rish
              </button>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-icon">
                🧾
              </div>

              <div>
                <h3>Nasiya</h3>

                <p>
                  {formatMoney(jamiNasiya)} so‘m
                  qarzdorlik mavjud.
                </p>
              </div>

              <button
                className="btn primary"
                onClick={() =>
                  setActivePage("nasiya")
                }
              >
                Nasiyani ko‘rish
              </button>
            </div>
          </div>
        </section>

        {kamQolgan > 0 && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>⚠️ Kam qolgan tovarlar</h2>

                <p>
                  Omborda zaxirasi minimal darajaga
                  tushgan tovarlar
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Tovar</th>
                    <th>Kategoriya</th>
                    <th>Miqdor</th>
                    <th>Minimal zaxira</th>
                    <th>Holat</th>
                  </tr>
                </thead>

                <tbody>
                  {tovarlar
                    .filter(
                      (tovar) =>
                        Number(tovar.miqdor || 0) <=
                        Number(tovar.min_zaxira || 0)
                    )
                    .map((tovar) => (
                      <tr key={tovar.id}>
                        <td>
                          <strong>{tovar.nom}</strong>
                        </td>

                        <td>
                          {tovar.kategoriya || "—"}
                        </td>

                        <td>
                          {tovar.miqdor} {tovar.birlik}
                        </td>

                        <td>
                          {tovar.min_zaxira}{" "}
                          {tovar.birlik}
                        </td>

                        <td>
                          <span className="status low">
                            ⚠️ Kam
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </>
    );
  };

  // =====================================================
  // MIJOZLAR
  // =====================================================

  const MijozlarPage = () => {
    return (
      <>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                {editingMijozId
                  ? "✏️ Mijozni tahrirlash"
                  : "➕ Yangi mijoz"}
              </h2>

              <p>
                Mijoz ma'lumotlarini boshqaring
              </p>
            </div>
          </div>

          <form onSubmit={handleMijozSubmit}>
            <div className="form-grid">
              <div className="input-group">
                <label>Ism familiya *</label>

                <input
                  name="ism"
                  value={mijozForm.ism}
                  onChange={handleMijozChange}
                  placeholder="Ali Valiyev"
                />
              </div>

              <div className="input-group">
                <label>Telefon</label>

                <input
                  name="telefon"
                  value={mijozForm.telefon}
                  onChange={handleMijozChange}
                  placeholder="+998 90 123 45 67"
                />
              </div>

              <div className="input-group">
                <label>Manzil</label>

                <input
                  name="manzil"
                  value={mijozForm.manzil}
                  onChange={handleMijozChange}
                  placeholder="Toshkent"
                />
              </div>

              <div className="input-group">
                <label>Izoh</label>

                <input
                  name="izoh"
                  value={mijozForm.izoh}
                  onChange={handleMijozChange}
                  placeholder="Qo‘shimcha ma'lumot"
                />
              </div>
            </div>

            <div className="form-buttons">
              <button
                className="btn primary"
                type="submit"
              >
                {editingMijozId
                  ? "💾 Saqlash"
                  : "➕ Mijoz qo‘shish"}
              </button>

              {editingMijozId && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={cancelMijozEdit}
                >
                  Bekor qilish
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="products-header">
            <div>
              <h2>👥 Mijozlar</h2>

              <p>
                Jami: {mijozlar.length} ta
              </p>
            </div>

            <button
              className="btn secondary"
              onClick={loadMijozlar}
            >
              🔄 Yangilash
            </button>
          </div>

          <div className="filters">
            <input
              className="search"
              value={mijozQidiruv}
              onChange={(e) =>
                setMijozQidiruv(e.target.value)
              }
              placeholder="🔍 Ism, telefon yoki manzil..."
            />
          </div>

          {mijozLoading ? (
            <div className="empty">
              ⏳ Mijozlar yuklanmoqda...
            </div>
          ) : filteredMijozlar.length === 0 ? (
            <div className="empty">
              📭 Mijoz topilmadi
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Mijoz</th>
                    <th>Telefon</th>
                    <th>Manzil</th>
                    <th>Izoh</th>
                    <th>Amallar</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMijozlar.map((mijoz) => (
                    <tr key={mijoz.id}>
                      <td>#{mijoz.id}</td>

                      <td>
                        <strong>{mijoz.ism}</strong>
                      </td>

                      <td>
                        {mijoz.telefon || "—"}
                      </td>

                      <td>
                        {mijoz.manzil || "—"}
                      </td>

                      <td>
                        {mijoz.izoh || "—"}
                      </td>

                      <td>
                        <div className="actions">
                          <button
                            className="action edit"
                            onClick={() =>
                              handleMijozEdit(mijoz)
                            }
                            title="Tahrirlash"
                          >
                            ✏️
                          </button>

                          {currentUser?.rol ===
                            "admin" && (
                            <button
                              className="action delete"
                              onClick={() =>
                                handleMijozDelete(
                                  mijoz.id
                                )
                              }
                              title="O‘chirish"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  };

  // =====================================================
  // AUTH LOADING
  // =====================================================

  if (authChecking) {
    return (
      <div className="login-page">
        <div className="login-box">
          <div className="login-logo">🔩</div>

          <h1>Temir Do'kon</h1>

          <p className="login-subtitle">
            Tizim tekshirilmoqda...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // LOGIN
  // =====================================================

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // =====================================================
  // MAIN APP
  // =====================================================

  return (
    <div className="app">
      {/* HEADER */}

      <header className="header">
        <div>
          <h1>Temir Do‘koni</h1>

          <p>
            Ombor va savdo boshqaruv tizimi
          </p>
        </div>

        <div className="header-right">
          <div className="current-user">
            <strong>{currentUser.ism}</strong>

            <span>
              {currentUser.rol === "admin"
                ? "👑 Administrator"
                : "👨‍💼 Sotuvchi"}
            </span>
          </div>

          <div className="header-badge">
            {currentUser.rol === "admin"
              ? "ADMIN PANEL"
              : "SOTUVCHI"}
          </div>

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            🚪 Chiqish
          </button>
        </div>
      </header>

      {/* LAYOUT */}

      <div className="layout">
        {/* SIDEBAR */}

        <aside className="sidebar">
          <div className="logo">
            🔩 Temir Do‘kon
          </div>

          <button
            className={
              activePage === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage("dashboard")
            }
          >
            🏠 Bosh sahifa
          </button>

          <button
            className={
              activePage === "tovarlar"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage("tovarlar")
            }
          >
            📦 Tovarlar
          </button>

          <button
            className={
              activePage === "mijozlar"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage("mijozlar")
            }
          >
            👥 Mijozlar
          </button>

          <button
            className={
              activePage === "sotuvlar"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage("sotuvlar")
            }
          >
            💰 Sotuvlar
          </button>

          <button
            className={
              activePage === "nasiya"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage("nasiya")
            }
          >
            🧾 Nasiya
          </button>

          <button
            className={
              activePage === "statistika"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              setActivePage("statistika")
            }
          >
            📊 Statistika
          </button>

          {/* ADMIN MENU */}

          {currentUser.rol === "admin" && (
            <button
              className={
                activePage === "foydalanuvchilar"
                  ? "nav-item active"
                  : "nav-item"
              }
              onClick={() =>
                setActivePage(
                  "foydalanuvchilar"
                )
              }
            >
              👤 Foydalanuvchilar
            </button>
          )}
        </aside>

        {/* MAIN */}

        <main className="main">
          {message && (
            <div className="success-message">
              ✅ {message}
            </div>
          )}

          {error && (
            <div className="error-message">
              ❌ {error}

              <button
                type="button"
                onClick={() => setError("")}
                style={{
                  marginLeft: "10px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* DASHBOARD */}

          {activePage === "dashboard" && (
            <DashboardPage />
          )}

          {/* TOVARLAR */}

          {activePage === "tovarlar" && (
            <Tovarlar />
          )}

          {/* MIJOZLAR */}

          {activePage === "mijozlar" && (
            <MijozlarPage />
          )}

          {/* SOTUVLAR */}

          {activePage === "sotuvlar" && (
            <Sotuvlar />
          )}

          {/* NASIYA */}

          {activePage === "nasiya" && (
            <Nasiya />
          )}

          {/* STATISTIKA */}

          {activePage === "statistika" && (
            <Statistika />
          )}

          {/* FOYDALANUVCHILAR */}

          {activePage === "foydalanuvchilar" &&
            currentUser.rol === "admin" && (
              <Foydalanuvchilar />
            )}
        </main>
      </div>
    </div>
  );
}

export default App;
