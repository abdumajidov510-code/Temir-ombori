import { useState } from "react";

const API = "http://localhost:5000";

export default function Login({ onLogin }) {
    const [email, setEmail] = useState("");
    const [parol, setParol] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();

        setError("");

        if (!email || !parol) {
            setError("Email va parolni kiriting");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${API}/api/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email,
                        parol
                    })
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Login amalga oshmadi"
                );
            }

            localStorage.setItem(
                "temir_dokon_token",
                data.token
            );

            localStorage.setItem(
                "temir_dokon_user",
                JSON.stringify(data.user)
            );

            onLogin(data.user);

        } catch (err) {
            console.error(err);

            setError(
                err.message ||
                "Server bilan bog'lanishda xatolik"
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">

            <div className="login-box">

                <div className="login-logo">
                    🔩
                </div>

                <h1>Temir Do'kon</h1>

                <p className="login-subtitle">
                    Boshqaruv tizimiga kirish
                </p>

                {error && (
                    <div className="login-error">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <label>
                        Email
                    </label>

                    <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                        placeholder="admin@temirdokon.local"
                        autoComplete="email"
                    />

                    <label>
                        Parol
                    </label>

                    <input
                        type="password"
                        value={parol}
                        onChange={(e) =>
                            setParol(e.target.value)
                        }
                        placeholder="Parolingizni kiriting"
                        autoComplete="current-password"
                    />

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Kirilmoqda..."
                            : "Kirish"}
                    </button>

                </form>

            </div>

        </div>
    );
}
