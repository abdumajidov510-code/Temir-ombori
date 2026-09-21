import { useEffect, useMemo, useState } from "react";
const API_NASIYA = "http://localhost:5000/api/nasiya";
const API_TOLOVLAR = "http://localhost:5000/api/nasiya/tolovlar";
function getAuthHeaders() {
    const token = localStorage.getItem("temir_dokon_token");
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}
function Nasiya() {
    const [qarzdorlar, setQarzdorlar] = useState([]);
    const [tolovlar, setTolovlar] = useState([]);
    const [selectedMijoz, setSelectedMijoz] = useState(null);
    const [mijozSotuvlari, setMijozSotuvlari] = useState([]);
    const [tolovSumma, setTolovSumma] = useState("");
    const [izoh, setIzoh] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const formatMoney = (value) => {
        return new Intl.NumberFormat("uz-UZ").format(
            Number(value || 0)
        );
    };
    const loadData = async () => {
        try {
            setError("");
            const [qarzResponse, tolovResponse] =
                await Promise.all([
                    fetch(API_NASIYA, {
                        headers: getAuthHeaders(),
                    }),
                    fetch(API_TOLOVLAR, {
                        headers: getAuthHeaders(),
                    })
                ]);
            if (!qarzResponse.ok) {
                throw new Error(
                    "Qarzdorlar ma'lumotini olishda xatolik"
                );
            }
            if (!tolovResponse.ok) {
                throw new Error(
                    "To'lovlar tarixini olishda xatolik"
                );
            }
            const qarzData = await qarzResponse.json();
            const tolovData = await tolovResponse.json();
            setQarzdorlar(qarzData);
            setTolovlar(tolovData);
        } catch (err) {
            setError(err.message);
        }
    };
    useEffect(() => {
        loadData();
    }, []);
    const jamiQarz = useMemo(() => {
        return qarzdorlar.reduce(
            (sum, mijoz) =>
                sum + Number(mijoz.qarz || 0),
            0
        );
    }, [qarzdorlar]);
    const selectMijoz = async (mijoz) => {
        setError("");
        setMessage("");
        setSelectedMijoz(mijoz);
        setTolovSumma("");
        try {
            const response = await fetch(
                `http://localhost:5000/api/nasiya/mijoz/${mijoz.id}`,
                {
                    headers: getAuthHeaders(),
                }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Mijoz qarzlarini olishda xatolik"
                );
            }
            setMijozSotuvlari(data);
        } catch (err) {
            setError(err.message);
        }
    };
    const makePayment = async () => {
        setError("");
        setMessage("");
        if (!selectedMijoz) {
            setError("Avval mijoz tanlang");
            return;
        }
        const summa = Number(tolovSumma);
        if (!summa || summa <= 0) {
            setError("To'lov summasini kiriting");
            return;
        }
        if (summa > Number(selectedMijoz.qarz)) {
            setError(
                "To'lov mijozning qarzidan katta bo'lishi mumkin emas"
            );
            return;
        }
        try {
            setLoading(true);
            const response = await fetch(
                "http://localhost:5000/api/nasiya/tolov",
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        mijoz_id: selectedMijoz.id,
                        summa,
                        izoh: izoh.trim() || null
                    })
                }
            );
            const data = await response.json();
            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "To'lovni saqlashda xatolik"
                );
            }
            setMessage(
                `${formatMoney(summa)} so'm to'lov qabul qilindi`
            );
            setTolovSumma("");
            setIzoh("");
            await loadData();
            setSelectedMijoz(null);
            setMijozSotuvlari([]);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div>
            {/* ========================= */}
            {/* STATISTIKA */}
            {/* ========================= */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div>
                        <span>Qarzdor mijozlar</span>
                        <strong>
                            {qarzdorlar.length}
                        </strong>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div>
                        <span>Jami qarz</span>
                        <strong>
                            {formatMoney(jamiQarz)} so'm
                        </strong>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💳</div>
                    <div>
                        <span>To'lovlar soni</span>
                        <strong>
                            {tolovlar.length}
                        </strong>
                    </div>
                </div>
            </div>
            {/* ========================= */}
            {/* QARZDORLAR */}
            {/* ========================= */}
            <section className="panel">
                <div className="products-header">
                    <div>
                        <h2>📋 Qarzdor mijozlar</h2>
                        <p>
                            Nasiya bo'yicha qarzdorlar
                        </p>
                    </div>
                    <button
                        className="btn secondary"
                        onClick={loadData}
                    >
                        🔄 Yangilash
                    </button>
                </div>
                {qarzdorlar.length === 0 ? (
                    <div className="empty">
                        🎉 Hozircha qarzdor mijozlar yo'q
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Mijoz</th>
                                    <th>Telefon</th>
                                    <th>Qarz</th>
                                    <th>Amal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {qarzdorlar.map((mijoz) => (
                                    <tr key={mijoz.id}>
                                        <td>
                                            #{mijoz.id}
                                        </td>
                                        <td>
                                            <strong>
                                                {mijoz.ism}
                                            </strong>
                                        </td>
                                        <td>
                                            {mijoz.telefon || "—"}
                                        </td>
                                        <td>
                                            <strong>
                                                {formatMoney(
                                                    mijoz.qarz
                                                )}{" "}
                                                so'm
                                            </strong>
                                        </td>
                                        <td>
                                            <button
                                                className="btn primary"
                                                onClick={() =>
                                                    selectMijoz(mijoz)
                                                }
                                            >
                                                💳 To'lov
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
            {/* ========================= */}
            {/* TO'LOV OYNASI */}
            {/* ========================= */}
            {selectedMijoz && (
                <section className="panel">
                    <div className="panel-header">
                        <h2>
                            💳 Nasiya to'lovi
                        </h2>
                        <p>
                            {selectedMijoz.ism}
                        </p>
                    </div>
                    <div className="payment-summary">
                        <div>
                            <span>
                                Mijoz:
                            </span>
                            <strong>
                                {selectedMijoz.ism}
                            </strong>
                        </div>
                        <div className="debt">
                            <span>
                                Jami qarz:
                            </span>
                            <strong>
                                {formatMoney(
                                    selectedMijoz.qarz
                                )}{" "}
                                so'm
                            </strong>
                        </div>
                    </div>
                    <div className="form-grid">
                        <div className="input-group">
                            <label>
                                To'lov summasi
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={tolovSumma}
                                onChange={(e) =>
                                    setTolovSumma(
                                        e.target.value
                                    )
                                }
                                placeholder="Masalan: 100000"
                            />
                        </div>
                        <div className="input-group">
                            <label>
                                Izoh
                            </label>
                            <input
                                type="text"
                                value={izoh}
                                onChange={(e) =>
                                    setIzoh(
                                        e.target.value
                                    )
                                }
                                placeholder="Masalan: naqd to'lov"
                            />
                        </div>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            marginTop: "20px"
                        }}
                    >
                        <button
                            className="btn primary"
                            onClick={makePayment}
                            disabled={loading}
                        >
                            {loading
                                ? "⏳ Saqlanmoqda..."
                                : "✅ TO'LOVNI TASDIQLASH"}
                        </button>
                        <button
                            className="btn secondary"
                            onClick={() => {
                                setSelectedMijoz(null);
                                setMijozSotuvlari([]);
                            }}
                        >
                            Bekor qilish
                        </button>
                    </div>
                    {/* MIJOZ SOTUVLARI */}
                    {mijozSotuvlari.length > 0 && (
                        <div style={{ marginTop: "30px" }}>
                            <h3>
                                📜 Qarzdor sotuvlar
                            </h3>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Sotuv</th>
                                            <th>Jami</th>
                                            <th>To'langan</th>
                                            <th>Qarz</th>
                                            <th>Sana</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mijozSotuvlari.map(
                                            (sotuv) => (
                                                <tr
                                                    key={sotuv.id}
                                                >
                                                    <td>
                                                        #{sotuv.id}
                                                    </td>
                                                    <td>
                                                        {formatMoney(
                                                            sotuv.jami_summa
                                                        )}{" "}
                                                        so'm
                                                    </td>
                                                    <td>
                                                        {formatMoney(
                                                            sotuv.tolangan_summa
                                                        )}{" "}
                                                        so'm
                                                    </td>
                                                    <td>
                                                        <strong>
                                                            {formatMoney(
                                                                sotuv.qarz
                                                            )}{" "}
                                                            so'm
                                                        </strong>
                                                    </td>
                                                    <td>
                                                        {new Date(
                                                            sotuv.sotilgan_vaqt
                                                        ).toLocaleString(
                                                            "uz-UZ"
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>
            )}
            {/* ========================= */}
            {/* TO'LOVLAR TARIXI */}
            {/* ========================= */}
            <section className="panel">
                <div className="products-header">
                    <div>
                        <h2>
                            📜 To'lovlar tarixi
                        </h2>
                        <p>
                            Qabul qilingan nasiya to'lovlari
                        </p>
                    </div>
                </div>
                {tolovlar.length === 0 ? (
                    <div className="empty">
                        📭 Hozircha to'lovlar yo'q
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Mijoz</th>
                                    <th>Sotuv</th>
                                    <th>Summa</th>
                                    <th>Izoh</th>
                                    <th>Sana</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tolovlar.map(
                                    (tolov) => (
                                        <tr
                                            key={tolov.id}
                                        >
                                            <td>
                                                #{tolov.id}
                                            </td>
                                            <td>
                                                <strong>
                                                    {tolov.mijoz_ismi}
                                                </strong>
                                                <br />
                                                <small>
                                                    {tolov.telefon || ""}
                                                </small>
                                            </td>
                                            <td>
                                                {tolov.sotuv_id
                                                    ? `#${tolov.sotuv_id}`
                                                    : "Umumiy"}
                                            </td>
                                            <td>
                                                <strong>
                                                    {formatMoney(
                                                        tolov.summa
                                                    )}{" "}
                                                    so'm
                                                </strong>
                                            </td>
                                            <td>
                                                {tolov.izoh || "—"}
                                            </td>
                                            <td>
                                                {new Date(
                                                    tolov.tolangan_vaqt
                                                ).toLocaleString(
                                                    "uz-UZ"
                                                )}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
            {error && (
                <div className="alert error">
                    {error}
                </div>
            )}
            {message && (
                <div className="alert success">
                    {message}
                </div>
            )}
        </div>
    );
}
export default Nasiya;
