import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:5000";

const emptyForm = {
    nom: "",
    kategoriya: "",
    narx: "",
    miqdor: "",
    min_zaxira: "10",
    birlik: "dona",
};

function getAuthHeaders() {
    const token = localStorage.getItem("temir_dokon_token");

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

export default function Tovarlar() {
    const [tovarlar, setTovarlar] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState("all");

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState(emptyForm);

    async function loadTovarlar() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API}/api/tovarlar`,
                {
                    headers: getAuthHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Tovarlarni yuklab bo'lmadi"
                );
            }

            if (Array.isArray(data)) {
                setTovarlar(data);
            } else if (data.success && Array.isArray(data.tovarlar)) {
                setTovarlar(data.tovarlar);
            } else {
                throw new Error(
                    data.message || "Tovarlar ma'lumoti noto'g'ri"
                );
            }
        } catch (err) {
            console.error(err);
            setError(
                err.message ||
                "Tovarlarni yuklashda xatolik yuz berdi"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTovarlar();
    }, []);

    function showSuccess(text) {
        setMessage(text);

        setTimeout(() => {
            setMessage("");
        }, 3000);
    }

    function openAddForm() {
        setEditingId(null);
        setForm(emptyForm);
        setError("");
        setShowForm(true);
    }

    function openEditForm(tovar) {
        setEditingId(tovar.id);

        setForm({
            nom: tovar.nom || "",
            kategoriya: tovar.kategoriya || "",
            narx: tovar.narx ?? "",
            miqdor: tovar.miqdor ?? "",
            min_zaxira: tovar.min_zaxira ?? 10,
            birlik: tovar.birlik || "dona",
        });

        setError("");
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
    }

    function handleChange(e) {
        const { name, value } = e.target;

        setForm((old) => ({
            ...old,
            [name]: value,
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();

        setError("");
        setMessage("");

        const nom = form.nom.trim();
        const kategoriya = form.kategoriya.trim();

        const narx = Number(form.narx);
        const miqdor = Number(form.miqdor);
        const minZaxira = Number(form.min_zaxira);

        if (!nom) {
            setError("Tovar nomini kiriting");
            return;
        }

        if (!Number.isFinite(narx) || narx < 0) {
            setError("Narxni to'g'ri kiriting");
            return;
        }

        if (!Number.isInteger(miqdor) || miqdor < 0) {
            setError("Miqdorni to'g'ri kiriting");
            return;
        }

        if (!Number.isInteger(minZaxira) || minZaxira < 0) {
            setError("Minimal zaxirani to'g'ri kiriting");
            return;
        }

        try {
            setSaving(true);

            const body = {
                nom,
                kategoriya,
                narx,
                miqdor,
                min_zaxira: minZaxira,
                birlik: form.birlik,
            };

            const url = editingId
                ? `${API}/api/tovarlar/${editingId}`
                : `${API}/api/tovarlar`;

            const method = editingId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(
                    data.message ||
                    "Tovarni saqlashda xatolik"
                );
            }

            closeForm();

            showSuccess(
                editingId
                    ? "Tovar muvaffaqiyatli yangilandi"
                    : "Tovar muvaffaqiyatli qo'shildi"
            );

            await loadTovarlar();
        } catch (err) {
            console.error(err);

            setError(
                err.message ||
                "Tovarni saqlashda xatolik yuz berdi"
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteTovar(tovar) {
        const confirmed = window.confirm(
            `"${tovar.nom}" tovarini o'chirishni xohlaysizmi?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setMessage("");

            const response = await fetch(
                `${API}/api/tovarlar/${tovar.id}`,
                {
                    method: "DELETE",
                    headers: getAuthHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok || data.success === false) {
                throw new Error(
                    data.message ||
                    "Tovarni o'chirib bo'lmadi"
                );
            }

            showSuccess("Tovar o'chirildi");

            await loadTovarlar();
        } catch (err) {
            console.error(err);

            setError(
                err.message ||
                "Tovarni o'chirishda xatolik yuz berdi"
            );
        }
    }

    const categories = useMemo(() => {
        const result = [
            ...new Set(
                tovarlar
                    .map((tovar) => tovar.kategoriya)
                    .filter(Boolean)
            ),
        ];

        return result.sort();
    }, [tovarlar]);

    const filteredTovarlar = useMemo(() => {
        const searchText = search
            .trim()
            .toLowerCase();

        return tovarlar.filter((tovar) => {
            const matchesSearch =
                !searchText ||
                String(tovar.nom || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(tovar.kategoriya || "")
                    .toLowerCase()
                    .includes(searchText);

            const matchesCategory =
                categoryFilter === "all" ||
                tovar.kategoriya === categoryFilter;

            const miqdor = Number(tovar.miqdor || 0);
            const minZaxira = Number(
                tovar.min_zaxira || 0
            );

            let matchesStock = true;

            if (stockFilter === "low") {
                matchesStock = miqdor <= minZaxira;
            }

            if (stockFilter === "empty") {
                matchesStock = miqdor === 0;
            }

            if (stockFilter === "normal") {
                matchesStock = miqdor > minZaxira;
            }

            return (
                matchesSearch &&
                matchesCategory &&
                matchesStock
            );
        });
    }, [
        tovarlar,
        search,
        categoryFilter,
        stockFilter,
    ]);

    const totalProducts = tovarlar.length;

    const lowStockCount = tovarlar.filter(
        (tovar) =>
            Number(tovar.miqdor || 0) <=
            Number(tovar.min_zaxira || 0)
    ).length;

    const emptyStockCount = tovarlar.filter(
        (tovar) =>
            Number(tovar.miqdor || 0) === 0
    ).length;

    function formatMoney(value) {
        return Number(value || 0).toLocaleString(
            "uz-UZ"
        ) + " so'm";
    }

    function getStockStatus(tovar) {
        const miqdor = Number(tovar.miqdor || 0);
        const min = Number(tovar.min_zaxira || 0);

        if (miqdor === 0) {
            return {
                className: "stock-danger",
                text: "Tugagan",
            };
        }

        if (miqdor <= min) {
            return {
                className: "stock-warning",
                text: "Kam",
            };
        }

        return {
            className: "stock-ok",
            text: "Yetarli",
        };
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h2>📦 Tovarlar</h2>
                    <p>
                        Ombordagi barcha tovarlarni
                        boshqarish
                    </p>
                </div>

                <button
                    className="primary-btn"
                    onClick={openAddForm}
                >
                    ➕ Tovar qo'shish
                </button>
            </div>

            {message && (
                <div className="success-message">
                    ✅ {message}
                </div>
            )}

            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">
                        📦
                    </div>

                    <div>
                        <div className="stat-label">
                            Jami tovar
                        </div>

                        <div className="stat-value">
                            {totalProducts}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        ⚠️
                    </div>

                    <div>
                        <div className="stat-label">
                            Kam qolgan
                        </div>

                        <div className="stat-value">
                            {lowStockCount}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        🚫
                    </div>

                    <div>
                        <div className="stat-label">
                            Tugagan
                        </div>

                        <div className="stat-value">
                            {emptyStockCount}
                        </div>
                    </div>
                </div>
            </div>

            <div className="filters-card">
                <div className="search-box">
                    🔎
                    <input
                        type="text"
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        placeholder="Tovar yoki kategoriya qidiring..."
                    />
                </div>

                <select
                    value={categoryFilter}
                    onChange={(e) =>
                        setCategoryFilter(e.target.value)
                    }
                >
                    <option value="all">
                        Barcha kategoriyalar
                    </option>

                    {categories.map((category) => (
                        <option
                            key={category}
                            value={category}
                        >
                            {category}
                        </option>
                    ))}
                </select>

                <select
                    value={stockFilter}
                    onChange={(e) =>
                        setStockFilter(e.target.value)
                    }
                >
                    <option value="all">
                        Barcha holat
                    </option>

                    <option value="normal">
                        Yetarli
                    </option>

                    <option value="low">
                        Kam qolgan
                    </option>

                    <option value="empty">
                        Tugagan
                    </option>
                </select>
            </div>

            {loading ? (
                <div className="loading">
                    Tovarlar yuklanmoqda...
                </div>
            ) : filteredTovarlar.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        📦
                    </div>

                    <h3>
                        Tovar topilmadi
                    </h3>

                    <p>
                        Qidiruv yoki filtrlarni
                        o'zgartirib ko'ring.
                    </p>
                </div>
            ) : (
                <div className="table-card">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Tovar</th>
                                    <th>Kategoriya</th>
                                    <th>Narx</th>
                                    <th>Miqdor</th>
                                    <th>Min. zaxira</th>
                                    <th>Holat</th>
                                    <th>Amallar</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredTovarlar.map(
                                    (tovar) => {
                                        const status =
                                            getStockStatus(
                                                tovar
                                            );

                                        return (
                                            <tr
                                                key={
                                                    tovar.id
                                                }
                                            >
                                                <td>
                                                    #
                                                    {
                                                        tovar.id
                                                    }
                                                </td>

                                                <td>
                                                    <strong>
                                                        {
                                                            tovar.nom
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {tovar.kategoriya ||
                                                        "-"}
                                                </td>

                                                <td>
                                                    {formatMoney(
                                                        tovar.narx
                                                    )}
                                                </td>

                                                <td>
                                                    <strong>
                                                        {
                                                            tovar.miqdor
                                                        }
                                                    </strong>{" "}
                                                    {
                                                        tovar.birlik
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        tovar.min_zaxira
                                                    }
                                                </td>

                                                <td>
                                                    <span
                                                        className={`stock-badge ${status.className}`}
                                                    >
                                                        {
                                                            status.text
                                                        }
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="small-btn edit"
                                                            onClick={() =>
                                                                openEditForm(
                                                                    tovar
                                                                )
                                                            }
                                                        >
                                                            ✏️
                                                            Tahrirlash
                                                        </button>

                                                        <button
                                                            className="small-btn delete"
                                                            onClick={() =>
                                                                deleteTovar(
                                                                    tovar
                                                                )
                                                            }
                                                        >
                                                            🗑️
                                                            O'chirish
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>
                                {editingId
                                    ? "✏️ Tovarni tahrirlash"
                                    : "➕ Yangi tovar"}
                            </h3>

                            <button
                                className="modal-close"
                                onClick={closeForm}
                            >
                                ✕
                            </button>
                        </div>

                        <form
                            onSubmit={
                                handleSubmit
                            }
                        >
                            <div className="form-group">
                                <label>
                                    Tovar nomi *
                                </label>

                                <input
                                    type="text"
                                    name="nom"
                                    value={form.nom}
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Masalan: Bolg'a"
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    Kategoriya
                                </label>

                                <input
                                    type="text"
                                    name="kategoriya"
                                    value={
                                        form.kategoriya
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Masalan: Asboblar"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>
                                        Narx *
                                    </label>

                                    <input
                                        type="number"
                                        name="narx"
                                        value={
                                            form.narx
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        min="0"
                                        step="0.01"
                                        placeholder="85000"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        Miqdor *
                                    </label>

                                    <input
                                        type="number"
                                        name="miqdor"
                                        value={
                                            form.miqdor
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        min="0"
                                        step="1"
                                        placeholder="10"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>
                                        Minimal zaxira
                                    </label>

                                    <input
                                        type="number"
                                        name="min_zaxira"
                                        value={
                                            form.min_zaxira
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        min="0"
                                        step="1"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        Birlik
                                    </label>

                                    <select
                                        name="birlik"
                                        value={
                                            form.birlik
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    >
                                        <option value="dona">
                                            dona
                                        </option>

                                        <option value="quti">
                                            quti
                                        </option>

                                        <option value="kg">
                                            kg
                                        </option>

                                        <option value="metr">
                                            metr
                                        </option>

                                        <option value="litr">
                                            litr
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={
                                        closeForm
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    Bekor qilish
                                </button>

                                <button
                                    type="submit"
                                    className="primary-btn"
                                    disabled={
                                        saving
                                    }
                                >
                                    {saving
                                        ? "Saqlanmoqda..."
                                        : editingId
                                        ? "Saqlash"
                                        : "Tovar qo'shish"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

