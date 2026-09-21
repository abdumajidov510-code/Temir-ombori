import { useEffect, useState } from "react";

const API = "http://localhost:5000";

function getAuthHeaders() {
    const token = localStorage.getItem("temir_dokon_token");

    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };
}

const emptyForm = {
    ism: "",
    telefon: "",
    email: "",
    parol: "",
    rol: "sotuvchi",
};

export default function Foydalanuvchilar() {
    const [foydalanuvchilar, setFoydalanuvchilar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [form, setForm] = useState(emptyForm);

    const [passwordUser, setPasswordUser] = useState(null);
    const [newPassword, setNewPassword] = useState("");

    async function loadUsers() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API}/api/foydalanuvchilar`,
                {
                    headers: getAuthHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Foydalanuvchilarni yuklab bo'lmadi"
                );
            }

            setFoydalanuvchilar(data.foydalanuvchilar || []);
        } catch (err) {
            console.error(err);
            setError(err.message || "Server xatosi");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    function showMessage(text) {
        setMessage(text);

        setTimeout(() => {
            setMessage("");
        }, 3000);
    }

    function openAddForm() {
        setEditingUser(null);
        setForm(emptyForm);
        setError("");
        setShowForm(true);
    }

    function openEditForm(user) {
        setEditingUser(user);

        setForm({
            ism: user.ism || "",
            telefon: user.telefon || "",
            email: user.email || "",
            parol: "",
            rol: user.rol || "sotuvchi",
        });

        setError("");
        setShowForm(true);
    }

    function closeForm() {
        setShowForm(false);
        setEditingUser(null);
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

        if (!form.ism.trim()) {
            setError("Ismni kiriting");
            return;
        }

        if (!form.email.trim()) {
            setError("Emailni kiriting");
            return;
        }

        if (!editingUser && !form.parol) {
            setError("Yangi foydalanuvchi uchun parol kiriting");
            return;
        }

        try {
            setSaving(true);

            let url;
            let method;
            let body;

            if (editingUser) {
                url = `${API}/api/foydalanuvchilar/${editingUser.id}`;
                method = "PUT";

                body = {
                    ism: form.ism.trim(),
                    telefon: form.telefon.trim(),
                    email: form.email.trim(),
                    rol: form.rol,
                };
            } else {
                url = `${API}/api/foydalanuvchilar`;
                method = "POST";

                body = {
                    ism: form.ism.trim(),
                    telefon: form.telefon.trim(),
                    email: form.email.trim(),
                    parol: form.parol,
                    rol: form.rol,
                };
            }

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Amalni bajarib bo'lmadi"
                );
            }

            showMessage(
                editingUser
                    ? "Foydalanuvchi yangilandi"
                    : "Foydalanuvchi qo'shildi"
            );

            closeForm();
            await loadUsers();
        } catch (err) {
            console.error(err);
            setError(err.message || "Server xatosi");
        } finally {
            setSaving(false);
        }
    }

    function openPasswordForm(user) {
        setPasswordUser(user);
        setNewPassword("");
        setError("");
        setMessage("");
    }

    function closePasswordForm() {
        setPasswordUser(null);
        setNewPassword("");
    }

    async function changePassword(e) {
        e.preventDefault();

        setError("");
        setMessage("");

        if (!newPassword || newPassword.length < 6) {
            setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
            return;
        }

        try {
            setSaving(true);

            const response = await fetch(
                `${API}/api/foydalanuvchilar/${passwordUser.id}/parol`,
                {
                    method: "PUT",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        parol: newPassword,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Parolni almashtirib bo'lmadi"
                );
            }

            showMessage("Parol muvaffaqiyatli almashtirildi");

            closePasswordForm();
        } catch (err) {
            console.error(err);
            setError(err.message || "Server xatosi");
        } finally {
            setSaving(false);
        }
    }

    async function deleteUser(user) {
        const currentUser = JSON.parse(
            localStorage.getItem("temir_dokon_user") || "null"
        );

        if (currentUser && currentUser.id === user.id) {
            setError("O'zingizni o'chira olmaysiz");
            return;
        }

        const confirmed = window.confirm(
            `"${user.ism}" foydalanuvchisini o'chirishni xohlaysizmi?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setMessage("");

            const response = await fetch(
                `${API}/api/foydalanuvchilar/${user.id}`,
                {
                    method: "DELETE",
                    headers: getAuthHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Foydalanuvchini o'chirib bo'lmadi"
                );
            }

            showMessage("Foydalanuvchi o'chirildi");

            await loadUsers();
        } catch (err) {
            console.error(err);
            setError(err.message || "Server xatosi");
        }
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h2>👥 Foydalanuvchilar</h2>
                    <p>
                        Tizim foydalanuvchilarini boshqarish
                    </p>
                </div>

                <button
                    className="primary-btn"
                    onClick={openAddForm}
                >
                    ➕ Foydalanuvchi qo'shish
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

            {loading ? (
                <div className="loading">
                    Yuklanmoqda...
                </div>
            ) : foydalanuvchilar.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <h3>Foydalanuvchilar yo'q</h3>
                    <p>
                        Birinchi foydalanuvchini qo'shing.
                    </p>
                </div>
            ) : (
                <div className="table-card">
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Ism</th>
                                    <th>Telefon</th>
                                    <th>Email</th>
                                    <th>Rol</th>
                                    <th>Amallar</th>
                                </tr>
                            </thead>

                            <tbody>
                                {foydalanuvchilar.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            #{user.id}
                                        </td>

                                        <td>
                                            <strong>
                                                {user.ism}
                                            </strong>
                                        </td>

                                        <td>
                                            {user.telefon || "-"}
                                        </td>

                                        <td>
                                            {user.email}
                                        </td>

                                        <td>
                                            {user.rol === "admin" ? (
                                                <span className="role-badge admin">
                                                    👑 Admin
                                                </span>
                                            ) : (
                                                <span className="role-badge seller">
                                                    🧑‍💼 Sotuvchi
                                                </span>
                                            )}
                                        </td>

                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="small-btn edit"
                                                    onClick={() =>
                                                        openEditForm(user)
                                                    }
                                                >
                                                    ✏️ Tahrirlash
                                                </button>

                                                <button
                                                    className="small-btn password"
                                                    onClick={() =>
                                                        openPasswordForm(user)
                                                    }
                                                >
                                                    🔑 Parol
                                                </button>

                                                <button
                                                    className="small-btn delete"
                                                    onClick={() =>
                                                        deleteUser(user)
                                                    }
                                                >
                                                    🗑️ O'chirish
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showForm && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div>
                                <h3>
                                    {editingUser
                                        ? "✏️ Foydalanuvchini tahrirlash"
                                        : "➕ Yangi foydalanuvchi"}
                                </h3>
                            </div>

                            <button
                                className="modal-close"
                                onClick={closeForm}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Ism *</label>

                                <input
                                    type="text"
                                    name="ism"
                                    value={form.ism}
                                    onChange={handleChange}
                                    placeholder="Masalan: Ali Valiyev"
                                />
                            </div>

                            <div className="form-group">
                                <label>Telefon</label>

                                <input
                                    type="text"
                                    name="telefon"
                                    value={form.telefon}
                                    onChange={handleChange}
                                    placeholder="+998901234567"
                                />
                            </div>

                            <div className="form-group">
                                <label>Email *</label>

                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    placeholder="user@example.com"
                                />
                            </div>

                            {!editingUser && (
                                <div className="form-group">
                                    <label>Parol *</label>

                                    <input
                                        type="password"
                                        name="parol"
                                        value={form.parol}
                                        onChange={handleChange}
                                        placeholder="Kamida 6 ta belgi"
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Rol *</label>

                                <select
                                    name="rol"
                                    value={form.rol}
                                    onChange={handleChange}
                                >
                                    <option value="sotuvchi">
                                        🧑‍💼 Sotuvchi
                                    </option>

                                    <option value="admin">
                                        👑 Admin
                                    </option>
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={closeForm}
                                    disabled={saving}
                                >
                                    Bekor qilish
                                </button>

                                <button
                                    type="submit"
                                    className="primary-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saqlanmoqda..."
                                        : editingUser
                                        ? "Saqlash"
                                        : "Qo'shish"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {passwordUser && (
                <div className="modal-overlay">
                    <div className="modal small-modal">
                        <div className="modal-header">
                            <h3>🔑 Parolni almashtirish</h3>

                            <button
                                className="modal-close"
                                onClick={closePasswordForm}
                            >
                                ✕
                            </button>
                        </div>

                        <p className="modal-description">
                            <strong>
                                {passwordUser.ism}
                            </strong>{" "}
                            uchun yangi parol kiriting.
                        </p>

                        <form onSubmit={changePassword}>
                            <div className="form-group">
                                <label>Yangi parol *</label>

                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                    placeholder="Kamida 6 ta belgi"
                                    autoFocus
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={closePasswordForm}
                                    disabled={saving}
                                >
                                    Bekor qilish
                                </button>

                                <button
                                    type="submit"
                                    className="primary-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saqlanmoqda..."
                                        : "Parolni saqlash"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
