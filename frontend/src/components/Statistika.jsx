import { useEffect, useState } from "react";

const API_STATISTIKA =
  "http://localhost:5000/api/statistika";

function getAuthHeaders() {
  const token = localStorage.getItem(
    "temir_dokon_token"
  );

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function Statistika() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatMoney = (value) => {
    return new Intl.NumberFormat("uz-UZ").format(
      Number(value || 0)
    );
  };

  const loadStatistika = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        API_STATISTIKA,
        {
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Statistikani olishda xatolik"
        );
      }

      setData(result);
    } catch (err) {
      console.error(
        "Statistika xatosi:",
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistika();
  }, []);

  if (loading) {
    return (
      <section className="panel">
        <div className="empty">
          ⏳ Statistika yuklanmoqda...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <div className="error-message">
          ❌ {error}
        </div>

        <button
          className="btn secondary"
          onClick={loadStatistika}
        >
          🔄 Qayta urinish
        </button>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="panel">
        <div className="empty">
          📭 Statistika ma'lumotlari mavjud emas
        </div>
      </section>
    );
  }

  const umumiy = data.umumiy || {};
  const bugun = data.bugun || {};

  return (
    <>
      {/* ================================= */}
      {/* SARLAVHA */}
      {/* ================================= */}

      <section className="panel">
        <div className="products-header">
          <div>
            <h2>📊 Statistika</h2>

            <p>
              Do‘konning sotuv va moliyaviy
              ko‘rsatkichlari
            </p>
          </div>

          <button
            className="btn secondary"
            onClick={loadStatistika}
          >
            🔄 Yangilash
          </button>
        </div>
      </section>

      {/* ================================= */}
      {/* UMUMIY STATISTIKA */}
      {/* ================================= */}

      <section className="stats">
        <div className="stat-card">
          <span>💰</span>

          <div>
            <small>Jami savdo</small>

            <strong>
              {formatMoney(
                umumiy.jami_savdo
              )}{" "}
              so‘m
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <span>💵</span>

          <div>
            <small>Jami to‘langan</small>

            <strong>
              {formatMoney(
                umumiy.jami_tolangan
              )}{" "}
              so‘m
            </strong>
          </div>
        </div>

        <div className="stat-card warning">
          <span>🧾</span>

          <div>
            <small>Jami qarz</small>

            <strong>
              {formatMoney(
                umumiy.jami_qarz
              )}{" "}
              so‘m
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <span>🛒</span>

          <div>
            <small>Jami sotuvlar</small>

            <strong>
              {umumiy.jami_sotuvlar || 0}
            </strong>
          </div>
        </div>
      </section>

      {/* ================================= */}
      {/* BUGUN */}
      {/* ================================= */}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>📅 Bugungi natijalar</h2>

            <p>
              Bugun amalga oshirilgan savdolar
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="dashboard-icon">
              🛒
            </div>

            <div>
              <h3>Sotuvlar</h3>

              <p>
                {bugun.sotuvlar_soni || 0} ta sotuv
              </p>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-icon">
              💰
            </div>

            <div>
              <h3>Savdo</h3>

              <p>
                {formatMoney(
                  bugun.summa
                )}{" "}
                so‘m
              </p>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-icon">
              💵
            </div>

            <div>
              <h3>Tushum</h3>

              <p>
                {formatMoney(
                  bugun.tolangan
                )}{" "}
                so‘m
              </p>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-icon">
              🧾
            </div>

            <div>
              <h3>Nasiya</h3>

              <p>
                {formatMoney(
                  bugun.qarz
                )}{" "}
                so‘m
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================= */}
      {/* KUNLIK SOTUVLAR */}
      {/* ================================= */}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>📈 Oxirgi 7 kun</h2>

            <p>Kunlik sotuvlar</p>
          </div>
        </div>

        {data.kunlik &&
        data.kunlik.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Sotuvlar</th>
                  <th>Savdo</th>
                  <th>To‘langan</th>
                </tr>
              </thead>

              <tbody>
                {data.kunlik.map(
                  (kun, index) => (
                    <tr key={index}>
                      <td>
                        {String(
                          kun.sana
                        ).slice(0, 10)}
                      </td>

                      <td>
                        {kun.sotuvlar_soni}
                      </td>

                      <td>
                        {formatMoney(
                          kun.summa
                        )}{" "}
                        so‘m
                      </td>

                      <td>
                        {formatMoney(
                          kun.tolangan
                        )}{" "}
                        so‘m
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            📭 Hozircha kunlik statistika yo‘q
          </div>
        )}
      </section>

      {/* ================================= */}
      {/* ENG KO‘P SOTILGAN TOVARLAR */}
      {/* ================================= */}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>
              🔥 Eng ko‘p sotilgan tovarlar
            </h2>

            <p>
              Sotuvlar bo‘yicha TOP 10
            </p>
          </div>
        </div>

        {data.topTovarlar &&
        data.topTovarlar.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tovar</th>
                  <th>Birlik</th>
                  <th>Sotilgan</th>
                  <th>Savdo summasi</th>
                </tr>
              </thead>

              <tbody>
                {data.topTovarlar.map(
                  (tovar, index) => (
                    <tr key={index}>
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {tovar.nom}
                        </strong>
                      </td>

                      <td>
                        {tovar.birlik}
                      </td>

                      <td>
                        {tovar.sotilgan_miqdor}
                      </td>

                      <td>
                        {formatMoney(
                          tovar.sotuv_summa
                        )}{" "}
                        so‘m
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            📭 Hozircha sotuv ma'lumotlari yo‘q
          </div>
        )}
      </section>

      {/* ================================= */}
      {/* KAM QOLGAN TOVARLAR */}
      {/* ================================= */}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>⚠️ Kam qolgan tovarlar</h2>

            <p>
              Minimal zaxiraga yetgan tovarlar
            </p>
          </div>
        </div>

        {data.kamQolgan &&
        data.kamQolgan.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tovar</th>
                  <th>Kategoriya</th>
                  <th>Miqdor</th>
                  <th>Minimal</th>
                  <th>Holat</th>
                </tr>
              </thead>

              <tbody>
                {data.kamQolgan.map(
                  (tovar) => (
                    <tr key={tovar.id}>
                      <td>
                        <strong>
                          {tovar.nom}
                        </strong>
                      </td>

                      <td>
                        {tovar.kategoriya ||
                          "—"}
                      </td>

                      <td>
                        {tovar.miqdor}{" "}
                        {tovar.birlik}
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
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            ✅ Hamma tovar zaxirasi yetarli
          </div>
        )}
      </section>
    </>
  );
}

export default Statistika;
