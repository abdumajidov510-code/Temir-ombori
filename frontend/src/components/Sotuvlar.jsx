import { useEffect, useMemo, useState } from "react";
const API = "http://localhost:5000";
const API_TOVARLAR = `${API}/api/tovarlar`;
const API_MIJOZLAR = `${API}/api/mijozlar`;
const API_SOTUVLAR = `${API}/api/sotuvlar`;
function getAuthHeaders() {
  const token = localStorage.getItem("temir_dokon_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
function Sotuvlar() {
  const [tovarlar, setTovarlar] = useState([]);
  const [mijozlar, setMijozlar] = useState([]);
  const [sotuvlar, setSotuvlar] = useState([]);
  const [tovarId, setTovarId] = useState("");
  const [miqdor, setMiqdor] = useState(1);
  const [mijozId, setMijozId] = useState("");
  const [tolovTuri, setTolovTuri] = useState("naqd");
  const [tolanganSumma, setTolanganSumma] = useState("");
  const [savat, setSavat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const formatMoney = (value) => {
    return new Intl.NumberFormat("uz-UZ").format(
      Number(value || 0)
    );
  };
  // ========================================
  // MA'LUMOTLARNI OLISH
  // ========================================
  const loadData = async () => {
    setError("");
    try {
      setDataLoading(true);
      // =========================
      // TOVARLAR
      // =========================
      const tovarResponse = await fetch(API_TOVARLAR, {
        headers: getAuthHeaders(),
      });
      const tovarData = await tovarResponse.json();
      if (!tovarResponse.ok) {
        throw new Error(
          tovarData.message ||
            "Tovarlarni olishda xatolik"
        );
      }
      setTovarlar(
        Array.isArray(tovarData)
          ? tovarData
          : []
      );
      // =========================
      // MIJOZLAR
      // =========================
      const mijozResponse = await fetch(API_MIJOZLAR, {
        headers: getAuthHeaders(),
      });
      const mijozData = await mijozResponse.json();
      if (!mijozResponse.ok) {
        throw new Error(
          mijozData.message ||
            "Mijozlarni olishda xatolik"
        );
      }
      setMijozlar(
        Array.isArray(mijozData)
          ? mijozData
          : []
      );
      // =========================
      // SOTUVLAR
      // =========================
      const sotuvResponse = await fetch(API_SOTUVLAR, {
        headers: getAuthHeaders(),
      });
      const sotuvData = await sotuvResponse.json();
      if (!sotuvResponse.ok) {
        throw new Error(
          sotuvData.message ||
            "Sotuvlarni olishda xatolik"
        );
      }
      setSotuvlar(
        Array.isArray(sotuvData)
          ? sotuvData
          : []
      );
    } catch (err) {
      console.error("Sotuvlar loadData:", err);
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);
  // ========================================
  // TANLANGAN TOVAR
  // ========================================
  const selectedTovar = useMemo(() => {
    return tovarlar.find(
      (tovar) =>
        String(tovar.id) === String(tovarId)
    );
  }, [tovarlar, tovarId]);
  // ========================================
  // SAVATGA QO'SHISH
  // ========================================
  const addToCart = () => {
    setError("");
    setMessage("");
    if (!selectedTovar) {
      setError("Tovar tanlang");
      return;
    }
    const quantity = Number(miqdor);
    if (!quantity || quantity <= 0) {
      setError("Miqdor noto'g'ri");
      return;
    }
    if (
      quantity >
      Number(selectedTovar.miqdor)
    ) {
      setError(
        `Omborda faqat ${selectedTovar.miqdor} ${selectedTovar.birlik} bor`
      );
      return;
    }
    const existing = savat.find(
      (item) =>
        item.tovar_id === selectedTovar.id
    );
    if (existing) {
      const newQuantity =
        existing.miqdor + quantity;
      if (
        newQuantity >
        Number(selectedTovar.miqdor)
      ) {
        setError(
          `Omborda yetarli ${selectedTovar.nom} yo'q`
        );
        return;
      }
      setSavat(
        savat.map((item) =>
          item.tovar_id === selectedTovar.id
            ? {
                ...item,
                miqdor: newQuantity,
              }
            : item
        )
      );
    } else {
      setSavat([
        ...savat,
        {
          tovar_id: selectedTovar.id,
          nom: selectedTovar.nom,
          birlik: selectedTovar.birlik,
          narx: Number(selectedTovar.narx),
          miqdor: quantity,
        },
      ]);
    }
    setTovarId("");
    setMiqdor(1);
  };
  // ========================================
  // SAVATDAN O'CHIRISH
  // ========================================
  const removeFromCart = (id) => {
    setSavat(
      savat.filter(
        (item) => item.tovar_id !== id
      )
    );
  };
  // ========================================
  // SAVAT MIQDORINI O'ZGARTIRISH
  // ========================================
  const changeQuantity = (id, value) => {
    const quantity = Number(value);
    if (!quantity || quantity <= 0) {
      return;
    }
    const product = tovarlar.find(
      (tovar) => tovar.id === id
    );
    if (
      product &&
      quantity > Number(product.miqdor)
    ) {
      setError(
        `Omborda faqat ${product.miqdor} ${product.birlik} bor`
      );
      return;
    }
    setError("");
    setSavat(
      savat.map((item) =>
        item.tovar_id === id
          ? {
              ...item,
              miqdor: quantity,
            }
          : item
      )
    );
  };
  // ========================================
  // JAMI
  // ========================================
  const jamiSumma = savat.reduce(
    (sum, item) =>
      sum +
      Number(item.narx) *
        Number(item.miqdor),
    0
  );
  const qarz =
    jamiSumma -
    Number(tolanganSumma || 0);
  // ========================================
  // SOTUVNI TASDIQLASH
  // ========================================
  const submitSale = async () => {
    setError("");
    setMessage("");
    if (savat.length === 0) {
      setError("Savat bo'sh");
      return;
    }
    if (
      (tolovTuri === "nasiya" ||
        tolovTuri === "qisman") &&
      !mijozId
    ) {
      setError(
        "Nasiya yoki qisman to'lov uchun mijoz tanlang"
      );
      return;
    }
    let paid = 0;
    if (tolovTuri === "naqd") {
      paid = jamiSumma;
    }
    if (tolovTuri === "nasiya") {
      paid = 0;
    }
    if (tolovTuri === "qisman") {
      paid = Number(tolanganSumma || 0);
      if (
        paid <= 0 ||
        paid >= jamiSumma
      ) {
        setError(
          "Qisman to'lov jami summadan kichik bo'lishi kerak"
        );
        return;
      }
    }
    try {
      setLoading(true);
      const response = await fetch(
        API_SOTUVLAR,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            mijoz_id: mijozId
              ? Number(mijozId)
              : null,
            tolov_turi: tolovTuri,
            tolangan_summa: paid,
            items: savat.map((item) => ({
              tovar_id: Number(
                item.tovar_id
              ),
              miqdor: Number(
                item.miqdor
              ),
            })),
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message ||
            "Sotuvni amalga oshirishda xatolik"
        );
      }
      setMessage(
        `Sotuv #${data.sotuv_id} muvaffaqiyatli amalga oshirildi`
      );
      setSavat([]);
      setTovarId("");
      setMiqdor(1);
      setMijozId("");
      setTolovTuri("naqd");
      setTolanganSumma("");
      await loadData();
      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (err) {
      console.error("Sotuv xatosi:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  // ========================================
  // RENDER
  // ========================================
  return (
    <div>
      {/* ================================= */}
      {/* YANGI SOTUV */}
      {/* ================================= */}
      <section className="panel">
        <div className="panel-header">
          <h2>💰 Yangi sotuv</h2>
          <p>
            Tovarlarni tanlab sotuv yarating
          </p>
        </div>
        {dataLoading ? (
          <div className="empty">
            ⏳ Tovarlar yuklanmoqda...
          </div>
        ) : tovarlar.length === 0 ? (
          <div className="empty">
            📦 Omborda sotish uchun tovar mavjud emas
          </div>
        ) : (
          <div className="sale-form">
            <div className="input-group">
              <label>Tovar</label>
              <select
                value={tovarId}
                onChange={(e) =>
                  setTovarId(e.target.value)
                }
              >
                <option value="">
                  — Tovar tanlang —
                </option>
                {tovarlar.map((tovar) => (
                  <option
                    key={tovar.id}
                    value={tovar.id}
                    disabled={
                      Number(
                        tovar.miqdor
                      ) <= 0
                    }
                  >
                    {tovar.nom} —{" "}
                    {formatMoney(
                      Number(tovar.narx)
                    )}{" "}
                    so‘m — qoldiq:{" "}
                    {tovar.miqdor}{" "}
                    {tovar.birlik}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>Miqdor</label>
              <input
                type="number"
                min="1"
                value={miqdor}
                onChange={(e) =>
                  setMiqdor(
                    e.target.value
                  )
                }
              />
            </div>
            <div className="sale-add-button">
              <button
                className="btn primary"
                onClick={addToCart}
              >
                ➕ Savatga
              </button>
            </div>
          </div>
        )}
      </section>
      {/* ================================= */}
      {/* SAVAT */}
      {/* ================================= */}
      <section className="panel">
        <div className="products-header">
          <div>
            <h2>🛒 Savat</h2>
            <p>
              {savat.length} ta turdagi tovar
            </p>
          </div>
        </div>
        {savat.length === 0 ? (
          <div className="empty">
            🛒 Savat hozircha bo‘sh
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tovar</th>
                  <th>Narx</th>
                  <th>Miqdor</th>
                  <th>Jami</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {savat.map((item) => (
                  <tr key={item.tovar_id}>
                    <td>
                      <strong>
                        {item.nom}
                      </strong>
                    </td>
                    <td>
                      {formatMoney(
                        item.narx
                      )}{" "}
                      so‘m
                    </td>
                    <td>
                      <input
                        className="cart-quantity"
                        type="number"
                        min="1"
                        value={item.miqdor}
                        onChange={(e) =>
                          changeQuantity(
                            item.tovar_id,
                            e.target.value
                          )
                        }
                      />
                      {" "}
                      {item.birlik}
                    </td>
                    <td>
                      <strong>
                        {formatMoney(
                          item.narx *
                            item.miqdor
                        )}{" "}
                        so‘m
                      </strong>
                    </td>
                    <td>
                      <button
                        className="action delete"
                        onClick={() =>
                          removeFromCart(
                            item.tovar_id
                          )
                        }
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {savat.length > 0 && (
          <div className="sale-total">
            <span>
              Jami summa:
            </span>
            <strong>
              {formatMoney(
                jamiSumma
              )}{" "}
              so‘m
            </strong>
          </div>
        )}
      </section>
      {/* ================================= */}
      {/* TO'LOV */}
      {/* ================================= */}
      {savat.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2>💳 To‘lov</h2>
          </div>
          <div className="form-grid">
            <div className="input-group">
              <label>Mijoz</label>
              <select
                value={mijozId}
                onChange={(e) =>
                  setMijozId(
                    e.target.value
                  )
                }
              >
                <option value="">
                  — Mijoz tanlang —
                </option>
                {mijozlar.map(
                  (mijoz) => (
                    <option
                      key={mijoz.id}
                      value={mijoz.id}
                    >
                      {mijoz.ism}
                      {mijoz.telefon
                        ? ` — ${mijoz.telefon}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className="input-group">
              <label>
                To‘lov turi
              </label>
              <select
                value={tolovTuri}
                onChange={(e) => {
                  const value =
                    e.target.value;
                  setTolovTuri(value);
                  if (value === "naqd") {
                    setTolanganSumma(
                      jamiSumma
                    );
                  }
                  if (value === "nasiya") {
                    setTolanganSumma(0);
                  }
                  if (value === "qisman") {
                    setTolanganSumma("");
                  }
                }}
              >
                <option value="naqd">
                  Naqd
                </option>
                <option value="qisman">
                  Qisman
                </option>
                <option value="nasiya">
                  Nasiya
                </option>
              </select>
            </div>
            {tolovTuri === "qisman" && (
              <div className="input-group">
                <label>
                  To‘langan summa
                </label>
                <input
                  type="number"
                  min="0"
                  value={
                    tolanganSumma
                  }
                  onChange={(e) =>
                    setTolanganSumma(
                      e.target.value
                    )
                  }
                  placeholder="Masalan: 100000"
                />
              </div>
            )}
          </div>
          <div className="payment-summary">
            <div>
              <span>
                Jami:
              </span>
              <strong>
                {formatMoney(
                  jamiSumma
                )}{" "}
                so‘m
              </strong>
            </div>
            <div>
              <span>
                To‘langan:
              </span>
              <strong>
                {formatMoney(
                  tolovTuri ===
                    "naqd"
                    ? jamiSumma
                    : Number(
                        tolanganSumma ||
                          0
                      )
                )}{" "}
                so‘m
              </strong>
            </div>
            <div className="debt">
              <span>
                Qarz:
              </span>
              <strong>
                {formatMoney(
                  Math.max(
                    0,
                    tolovTuri ===
                      "naqd"
                      ? 0
                      : qarz
                  )
                )}{" "}
                so‘m
              </strong>
            </div>
          </div>
          <button
            className="btn sale-confirm"
            onClick={submitSale}
            disabled={loading}
          >
            {loading
              ? "⏳ Saqlanmoqda..."
              : "✅ SOTUVNI TASDIQLASH"}
          </button>
        </section>
      )}
      {/* ================================= */}
      {/* SOTUVLAR TARIXI */}
      {/* ================================= */}
      <section className="panel">
        <div className="products-header">
          <div>
            <h2>
              📜 Sotuvlar tarixi
            </h2>
            <p>
              Amalga oshirilgan sotuvlar
            </p>
          </div>
          <button
            className="btn secondary"
            onClick={loadData}
            disabled={dataLoading}
          >
            {dataLoading
              ? "⏳ Yuklanmoqda..."
              : "🔄 Yangilash"}
          </button>
        </div>
        {dataLoading ? (
          <div className="empty">
            ⏳ Sotuvlar yuklanmoqda...
          </div>
        ) : sotuvlar.length === 0 ? (
          <div className="empty">
            📭 Hozircha sotuv yo‘q
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Mijoz</th>
                  <th>Jami</th>
                  <th>To‘lov</th>
                  <th>To‘langan</th>
                  <th>Qarz</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                {sotuvlar.map(
                  (sotuv) => (
                    <tr
                      key={
                        sotuv.id
                      }
                    >
                      <td>
                        #{sotuv.id}
                      </td>
                      <td>
                        {sotuv.mijoz_ismi ||
                          "Noma'lum mijoz"}
                      </td>
                      <td>
                        {formatMoney(
                          Number(
                            sotuv.jami_summa
                          )
                        )}{" "}
                        so‘m
                      </td>
                      <td>
                        <span
                          className={
                            sotuv.tolov_turi ===
                            "naqd"
                              ? "status good"
                              : "status low"
                          }
                        >
                          {sotuv.tolov_turi}
                        </span>
                      </td>
                      <td>
                        {formatMoney(
                          Number(
                            sotuv.tolangan_summa
                          )
                        )}{" "}
                        so‘m
                      </td>
                      <td>
                        <strong>
                          {formatMoney(
                            Number(
                              sotuv.qarz
                            )
                          )}{" "}
                          so‘m
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
        )}
      </section>
    </div>
  );
}
export default Sotuvlar;
