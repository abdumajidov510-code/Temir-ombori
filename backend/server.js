require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db");
const app = express();
const PORT = 5000;
app.use(cors());
app.use(express.json());
const JWT_SECRET =
    process.env.JWT_SECRET || "temir-dokon-super-secret-key-2026";
// ======================================================
// AUTHENTICATION
// ======================================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: "Kirish talab qilinadi",
        });
    }
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({
            success: false,
            message: "Token formati noto'g'ri",
        });
    }
    const token = parts[1];
    try {
        const user = jwt.verify(token, JWT_SECRET);
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token yaroqsiz yoki muddati tugagan",
        });
    }
}
// ======================================================
// ADMIN ONLY
// ======================================================
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Kirish talab qilinadi",
        });
    }
    if (req.user.rol !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Bu amal faqat Admin uchun",
        });
    }
    next();
}
// ======================================================
// ROOT
// ======================================================
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Temir Do'koni API ishlayapti!",
    });
});
// ======================================================
// DATABASE TEST
// ======================================================
app.get("/api/test-db", async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT 1 AS test"
        );
        res.json({
            success: true,
            message: "MariaDB bilan ulanish ishlayapti!",
            result: rows,
        });
    } catch (error) {
        console.error("DB test xatosi:", error);
        res.status(500).json({
            success: false,
            message: "Database bilan ulanishda xatolik",
            error: error.message,
        });
    }
});
// ======================================================
// LOGIN
// ======================================================
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, parol } = req.body;
        if (!email || !parol) {
            return res.status(400).json({
                success: false,
                message: "Email va parol kiritilishi kerak",
            });
        }
        const [users] = await db.query(
            `
            SELECT
                id,
                ism,
                telefon,
                email,
                parol_hash,
                rol
            FROM foydalanuvchilar
            WHERE email = ?
            LIMIT 1
            `,
            [email.trim()]
        );
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Email yoki parol noto'g'ri",
            });
        }
        const user = users[0];
        const passwordCorrect = await bcrypt.compare(
            parol,
            user.parol_hash
        );
        if (!passwordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Email yoki parol noto'g'ri",
            });
        }
        const token = jwt.sign(
            {
                id: user.id,
                ism: user.ism,
                email: user.email,
                rol: user.rol,
            },
            JWT_SECRET,
            {
                expiresIn: "1d",
            }
        );
        res.json({
            success: true,
            message: "Tizimga muvaffaqiyatli kirdingiz",
            token,
            user: {
                id: user.id,
                ism: user.ism,
                telefon: user.telefon,
                email: user.email,
                rol: user.rol,
            },
        });
    } catch (error) {
        console.error("Login xatosi:", error);
        res.status(500).json({
            success: false,
            message: "Login vaqtida xatolik",
            error: error.message,
        });
    }
});
// ======================================================
// CURRENT USER
// ======================================================
app.get(
    "/api/auth/me",
    authenticateToken,
    async (req, res) => {
        try {
            const [users] = await db.query(
                `
                SELECT
                    id,
                    ism,
                    telefon,
                    email,
                    rol
                FROM foydalanuvchilar
                WHERE id = ?
                LIMIT 1
                `,
                [req.user.id]
            );
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Foydalanuvchi topilmadi",
                });
            }
            res.json({
                success: true,
                user: users[0],
            });
        } catch (error) {
            console.error(
                "Auth me xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Foydalanuvchini tekshirishda xatolik",
            });
        }
    }
);
// ======================================================
// FOYDALANUVCHILAR - GET
// ADMIN ONLY
// ======================================================
app.get(
    "/api/foydalanuvchilar",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const [rows] = await db.query(
                `
                SELECT
                    id,
                    ism,
                    telefon,
                    email,
                    rol
                FROM foydalanuvchilar
                ORDER BY id DESC
                `
            );
            res.json({
                success: true,
                foydalanuvchilar: rows,
            });
        } catch (error) {
            console.error(
                "Foydalanuvchilar GET xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Foydalanuvchilarni olishda xatolik",
            });
        }
    }
);
// ======================================================
// FOYDALANUVCHI QO'SHISH
// ADMIN ONLY
// ======================================================
app.post(
    "/api/foydalanuvchilar",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const {
                ism,
                telefon,
                email,
                parol,
                rol,
            } = req.body;
            if (
                !ism ||
                !ism.trim() ||
                !email ||
                !email.trim() ||
                !parol
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Ism, email va parol majburiy",
                });
            }
            if (parol.length < 6) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Parol kamida 6 ta belgidan iborat bo'lishi kerak",
                });
            }
            const allowedRoles = [
                "admin",
                "sotuvchi",
            ];
            if (!allowedRoles.includes(rol)) {
                return res.status(400).json({
                    success: false,
                    message: "Rol noto'g'ri",
                });
            }
            const cleanEmail =
                email.trim().toLowerCase();
            const [existing] = await db.query(
                `
                SELECT id
                FROM foydalanuvchilar
                WHERE email = ?
                LIMIT 1
                `,
                [cleanEmail]
            );
            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Bu email allaqachon mavjud",
                });
            }
            const passwordHash =
                await bcrypt.hash(
                    parol,
                    10
                );
            const [result] = await db.query(
                `
                INSERT INTO foydalanuvchilar
                (
                    ism,
                    telefon,
                    email,
                    parol_hash,
                    rol
                )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    ism.trim(),
                    telefon || null,
                    cleanEmail,
                    passwordHash,
                    rol,
                ]
            );
            res.status(201).json({
                success: true,
                message:
                    "Foydalanuvchi muvaffaqiyatli qo'shildi",
                id: result.insertId,
            });
        } catch (error) {
            console.error(
                "Foydalanuvchi qo'shish xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Foydalanuvchi qo'shishda xatolik",
            });
        }
    }
);
// ======================================================
// FOYDALANUVCHI TAHRIRLASH
// ADMIN ONLY
// ======================================================
app.put(
    "/api/foydalanuvchilar/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;
            const {
                ism,
                telefon,
                email,
                rol,
            } = req.body;
            if (!ism || !ism.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Ismni kiriting",
                });
            }
            if (!email || !email.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Emailni kiriting",
                });
            }
            const allowedRoles = [
                "admin",
                "sotuvchi",
            ];
            if (!allowedRoles.includes(rol)) {
                return res.status(400).json({
                    success: false,
                    message: "Rol noto'g'ri",
                });
            }
            const [users] = await db.query(
                `
                SELECT id
                FROM foydalanuvchilar
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Foydalanuvchi topilmadi",
                });
            }
            // Admin o'zini sotuvchiga tushira olmaydi
            if (
                Number(id) ===
                    Number(req.user.id) &&
                rol !== "admin"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "O'zingizni adminlikdan tushira olmaysiz",
                });
            }
            const cleanEmail =
                email.trim().toLowerCase();
            const [duplicate] =
                await db.query(
                    `
                    SELECT id
                    FROM foydalanuvchilar
                    WHERE email = ?
                    AND id <> ?
                    LIMIT 1
                    `,
                    [
                        cleanEmail,
                        id,
                    ]
                );
            if (duplicate.length > 0) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Bu email boshqa foydalanuvchiga tegishli",
                });
            }
            await db.query(
                `
                UPDATE foydalanuvchilar
                SET
                    ism = ?,
                    telefon = ?,
                    email = ?,
                    rol = ?
                WHERE id = ?
                `,
                [
                    ism.trim(),
                    telefon || null,
                    cleanEmail,
                    rol,
                    id,
                ]
            );
            res.json({
                success: true,
                message:
                    "Foydalanuvchi yangilandi",
            });
        } catch (error) {
            console.error(
                "Foydalanuvchini tahrirlash xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Foydalanuvchini yangilashda xatolik",
            });
        }
    }
);
// ======================================================
// FOYDALANUVCHI PAROLINI O'ZGARTIRISH
// ADMIN ONLY
// ======================================================
app.put(
    "/api/foydalanuvchilar/:id/parol",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { parol } = req.body;
            if (!parol) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Yangi parolni kiriting",
                });
            }
            if (parol.length < 6) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Parol kamida 6 ta belgidan iborat bo'lishi kerak",
                });
            }
            const [users] = await db.query(
                `
                SELECT id
                FROM foydalanuvchilar
                WHERE id = ?
                LIMIT 1
                `,
                [id]
            );
            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Foydalanuvchi topilmadi",
                });
            }
            const passwordHash =
                await bcrypt.hash(
                    parol,
                    10
                );
            await db.query(
                `
                UPDATE foydalanuvchilar
                SET parol_hash = ?
                WHERE id = ?
                `,
                [
                    passwordHash,
                    id,
                ]
            );
            res.json({
                success: true,
                message:
                    "Parol muvaffaqiyatli o'zgartirildi",
            });
        } catch (error) {
            console.error(
                "Parol o'zgartirish xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Parolni o'zgartirishda xatolik",
            });
        }
    }
);
// ======================================================
// FOYDALANUVCHI O'CHIRISH
// ADMIN ONLY
// ======================================================
app.delete(
    "/api/foydalanuvchilar/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;
            if (
                Number(id) ===
                Number(req.user.id)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "O'zingizni o'chira olmaysiz",
                });
            }
            const [result] = await db.query(
                `
                DELETE FROM foydalanuvchilar
                WHERE id = ?
                `,
                [id]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Foydalanuvchi topilmadi",
                });
            }
            res.json({
                success: true,
                message:
                    "Foydalanuvchi o'chirildi",
            });
        } catch (error) {
            console.error(
                "Foydalanuvchini o'chirish xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Foydalanuvchini o'chirishda xatolik",
            });
        }
    }
);
// ======================================================
// TOVARLAR - GET
// ADMIN + SOTUVCHI
// ======================================================
app.get(
    "/api/tovarlar",
    authenticateToken,
    async (req, res) => {
        try {
            const [rows] = await db.query(
                `
                SELECT *
                FROM tovarlar
                ORDER BY id DESC
                `
            );
            res.json(rows);
        } catch (error) {
            console.error(
                "Tovar GET xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Tovarlarni olishda xatolik",
            });
        }
    }
);
// ======================================================
// TOVAR QO'SHISH
// ADMIN ONLY
// ======================================================
app.post(
    "/api/tovarlar",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const {
                nom,
                kategoriya,
                narx,
                miqdor,
                min_zaxira,
                birlik,
            } = req.body;
            if (
                !nom ||
                narx === undefined ||
                miqdor === undefined
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "nom, narx va miqdor majburiy",
                });
            }
            if (
                Number(narx) < 0 ||
                Number(miqdor) < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Narx va miqdor manfiy bo'lishi mumkin emas",
                });
            }
            const [result] = await db.query(
                `
                INSERT INTO tovarlar
                (
                    nom,
                    kategoriya,
                    narx,
                    miqdor,
                    min_zaxira,
                    birlik
                )
                VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    nom.trim(),
                    kategoriya || null,
                    narx,
                    miqdor,
                    min_zaxira ?? 10,
                    birlik || "dona",
                ]
            );
            res.status(201).json({
                success: true,
                message:
                    "Tovar muvaffaqiyatli qo'shildi",
                id: result.insertId,
            });
        } catch (error) {
            console.error(
                "Tovar qo'shish xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Tovar qo'shishda xatolik",
            });
        }
    }
);
// ======================================================
// TOVAR TAHRIRLASH
// ADMIN ONLY
// ======================================================
app.put(
    "/api/tovarlar/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;
            const {
                nom,
                kategoriya,
                narx,
                miqdor,
                min_zaxira,
                birlik,
            } = req.body;
            if (
                !nom ||
                narx === undefined ||
                miqdor === undefined
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "nom, narx va miqdor majburiy",
                });
            }
            if (
                Number(narx) < 0 ||
                Number(miqdor) < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Narx va miqdor manfiy bo'lishi mumkin emas",
                });
            }
            const [result] = await db.query(
                `
                UPDATE tovarlar
                SET
                    nom = ?,
                    kategoriya = ?,
                    narx = ?,
                    miqdor = ?,
                    min_zaxira = ?,
                    birlik = ?
                WHERE id = ?
                `,
                [
                    nom.trim(),
                    kategoriya || null,
                    narx,
                    miqdor,
                    min_zaxira ?? 10,
                    birlik || "dona",
                    id,
                ]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Tovar topilmadi",
                });
            }
            res.json({
                success: true,
                message:
                    "Tovar muvaffaqiyatli yangilandi",
            });
        } catch (error) {
            console.error(
                "Tovar PUT xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Tovarni yangilashda xatolik",
            });
        }
    }
);
// ======================================================
// TOVAR O'CHIRISH
// ADMIN ONLY
// ======================================================
app.delete(
    "/api/tovarlar/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const { id } = req.params;
            const [result] = await db.query(
                `
                DELETE FROM tovarlar
                WHERE id = ?
                `,
                [id]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Tovar topilmadi",
                });
            }
            res.json({
                success: true,
                message:
                    "Tovar o'chirildi",
            });
        } catch (error) {
            console.error(
                "Tovar DELETE xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Tovarni o'chirishda xatolik",
            });
        }
    }
);
// ======================================================
// SOTUVLAR - GET
// ADMIN + SOTUVCHI
// ======================================================
app.get(
    "/api/sotuvlar",
    authenticateToken,
    async (req, res) => {
        try {
            const [rows] = await db.query(
                `
                SELECT
                    s.id,
                    s.foydalanuvchi_id,
                    s.mijoz_id,
                    COALESCE(
                        m.ism,
                        'Noma''lum mijoz'
                    ) AS mijoz_ismi,
                    s.jami_summa,
                    s.tolov_turi,
                    s.tolangan_summa,
                    (
                        s.jami_summa -
                        s.tolangan_summa
                    ) AS qarz,
                    s.sotilgan_vaqt
                FROM sotuvlar s
                LEFT JOIN mijozlar m
                    ON s.mijoz_id = m.id
                ORDER BY s.id DESC
                `
            );
            res.json(rows);
        } catch (error) {
            console.error(
                "Sotuv GET xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Sotuvlarni olishda xatolik",
            });
        }
    }
);
// ======================================================
// SOTUV YARATISH
// ADMIN + SOTUVCHI
//
// foydalanuvchi_id frontenddan olinmaydi.
// Token ichidagi req.user.id ishlatiladi.
// ======================================================
app.post(
    "/api/sotuvlar",
    authenticateToken,
    async (req, res) => {
        const connection =
            await db.getConnection();
        try {
            const {
                mijoz_id,
                tolov_turi,
                tolangan_summa,
                items,
            } = req.body;
            if (
                !items ||
                !Array.isArray(items) ||
                items.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Savat bo'sh",
                });
            }
            const allowedPaymentTypes = [
                "naqd",
                "nasiya",
                "qisman",
            ];
            if (
                !allowedPaymentTypes.includes(
                    tolov_turi
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "To'lov turi noto'g'ri",
                });
            }
            await connection.beginTransaction();
            let jamiSumma = 0;
            const saleItems = [];
            // ----------------------------------
            // TOVARLARNI TEKSHIRISH
            // ----------------------------------
            for (const item of items) {
                const tovarId =
                    Number(item.tovar_id);
                const miqdor =
                    Number(item.miqdor);
                if (
                    !tovarId ||
                    !miqdor ||
                    miqdor <= 0
                ) {
                    throw new Error(
                        "Sotuvdagi tovar ma'lumotlari noto'g'ri"
                    );
                }
                const [products] =
                    await connection.query(
                        `
                        SELECT
                            id,
                            nom,
                            narx,
                            miqdor
                        FROM tovarlar
                        WHERE id = ?
                        FOR UPDATE
                        `,
                        [tovarId]
                    );
                if (
                    products.length === 0
                ) {
                    throw new Error(
                        `Tovar topilmadi: ID ${tovarId}`
                    );
                }
                const product =
                    products[0];
                if (
                    Number(product.miqdor) <
                    miqdor
                ) {
                    throw new Error(
                        `${product.nom} uchun omborda yetarli mahsulot yo'q. Qoldiq: ${product.miqdor}`
                    );
                }
                const birlikNarx =
                    Number(product.narx);
                const jamiNarx =
                    birlikNarx * miqdor;
                jamiSumma += jamiNarx;
                saleItems.push({
                    tovar_id: tovarId,
                    miqdor,
                    birlik_narx:
                        birlikNarx,
                    jami_narx:
                        jamiNarx,
                });
            }
            // ----------------------------------
            // MIJOZ TEKSHIRISH
            // ----------------------------------
            if (
                tolov_turi === "nasiya" ||
                tolov_turi === "qisman"
            ) {
                if (!mijoz_id) {
                    throw new Error(
                        "Nasiya yoki qisman to'lov uchun mijoz tanlanishi kerak"
                    );
                }
                const [customers] =
                    await connection.query(
                        `
                        SELECT id
                        FROM mijozlar
                        WHERE id = ?
                        LIMIT 1
                        `,
                        [mijoz_id]
                    );
                if (
                    customers.length === 0
                ) {
                    throw new Error(
                        "Tanlangan mijoz topilmadi"
                    );
                }
            }
            // ----------------------------------
            // TO'LOV
            // ----------------------------------
            let tolangan =
                Number(
                    tolangan_summa || 0
                );
            if (
                tolov_turi === "naqd"
            ) {
                tolangan =
                    jamiSumma;
            }
            if (
                tolov_turi === "nasiya"
            ) {
                tolangan = 0;
            }
            if (tolangan < 0) {
                throw new Error(
                    "To'langan summa manfiy bo'lishi mumkin emas"
                );
            }
            if (
                tolangan > jamiSumma
            ) {
                throw new Error(
                    "To'langan summa sotuv summasidan katta bo'lishi mumkin emas"
                );
            }
            if (
                tolov_turi === "qisman" &&
                tolangan >= jamiSumma
            ) {
                throw new Error(
                    "Qisman to'lovda to'langan summa jami summadan kichik bo'lishi kerak"
                );
            }
            // ----------------------------------
            // SOTUVNI YOZISH
            // ----------------------------------
            const [saleResult] =
                await connection.query(
                    `
                    INSERT INTO sotuvlar
                    (
                        foydalanuvchi_id,
                        mijoz_id,
                        jami_summa,
                        tolov_turi,
                        tolangan_summa
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        req.user.id,
                        mijoz_id || null,
                        jamiSumma,
                        tolov_turi,
                        tolangan,
                    ]
                );
            const sotuvId =
                saleResult.insertId;
            // ----------------------------------
            // SOTUV TAFSILOTLARI
            // ----------------------------------
            for (
                const item of saleItems
            ) {
                await connection.query(
                    `
                    INSERT INTO sotuv_tafsilotlari
                    (
                        sotuv_id,
                        tovar_id,
                        miqdor,
                        birlik_narx,
                        jami_narx
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        sotuvId,
                        item.tovar_id,
                        item.miqdor,
                        item.birlik_narx,
                        item.jami_narx,
                    ]
                );
                // ----------------------------------
                // OMBORNI KAMAYTIRISH
                // ----------------------------------
                await connection.query(
                    `
                    UPDATE tovarlar
                    SET miqdor =
                        miqdor - ?
                    WHERE id = ?
                    `,
                    [
                        item.miqdor,
                        item.tovar_id,
                    ]
                );
            }
            await connection.commit();
            res.status(201).json({
                success: true,
                message:
                    "Sotuv muvaffaqiyatli amalga oshirildi",
                sotuv_id: sotuvId,
                jami_summa: jamiSumma,
                tolangan_summa:
                    tolangan,
                qarz:
                    jamiSumma -
                    tolangan,
            });
        } catch (error) {
            await connection.rollback();
            console.error(
                "Sotuv POST xatosi:",
                error
            );
            res.status(400).json({
                success: false,
                message: error.message,
            });
        } finally {
            connection.release();
        }
    }
);
// ======================================================
// MIJOZLAR - GET
// ADMIN + SOTUVCHI
// ======================================================
app.get(
    "/api/mijozlar",
    authenticateToken,
    async (req, res) => {
        try {
            const [rows] = await db.query(
                `
                SELECT *
                FROM mijozlar
                ORDER BY id DESC
                `
            );
            res.json(rows);
        } catch (error) {
            console.error(
                "Mijoz GET xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Mijozlarni olishda xatolik",
            });
        }
    }
);
// ======================================================
// MIJOZ QO'SHISH
// ADMIN + SOTUVCHI
// ======================================================
app.post(
    "/api/mijozlar",
    authenticateToken,
    async (req, res) => {
        try {
            const {
                ism,
                telefon,
                manzil,
                izoh,
            } = req.body;
            if (
                !ism ||
                !ism.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Mijoz ismini kiriting",
                });
            }
            const [result] =
                await db.query(
                    `
                    INSERT INTO mijozlar
                    (
                        ism,
                        telefon,
                        manzil,
                        izoh
                    )
                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        ism.trim(),
                        telefon || null,
                        manzil || null,
                        izoh || null,
                    ]
                );
            res.status(201).json({
                success: true,
                message:
                    "Mijoz muvaffaqiyatli qo'shildi",
                id: result.insertId,
            });
        } catch (error) {
            console.error(
                "Mijoz POST xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Mijoz qo'shishda xatolik",
            });
        }
    }
);
// ======================================================
// MIJOZ TAHRIRLASH
// ADMIN + SOTUVCHI
// ======================================================
app.put(
    "/api/mijozlar/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const { id } =
                req.params;
            const {
                ism,
                telefon,
                manzil,
                izoh,
            } = req.body;
            if (
                !ism ||
                !ism.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Mijoz ismini kiriting",
                });
            }
            const [result] =
                await db.query(
                    `
                    UPDATE mijozlar
                    SET
                        ism = ?,
                        telefon = ?,
                        manzil = ?,
                        izoh = ?
                    WHERE id = ?
                    `,
                    [
                        ism.trim(),
                        telefon || null,
                        manzil || null,
                        izoh || null,
                        id,
                    ]
                );
            if (
                result.affectedRows === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Mijoz topilmadi",
                });
            }
            res.json({
                success: true,
                message:
                    "Mijoz muvaffaqiyatli yangilandi",
            });
        } catch (error) {
            console.error(
                "Mijoz PUT xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Mijozni yangilashda xatolik",
            });
        }
    }
);
// ======================================================
// MIJOZ O'CHIRISH
// ADMIN ONLY
// ======================================================
app.delete(
    "/api/mijozlar/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const { id } =
                req.params;
            const [result] =
                await db.query(
                    `
                    DELETE FROM mijozlar
                    WHERE id = ?
                    `,
                    [id]
                );
            if (
                result.affectedRows === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Mijoz topilmadi",
                });
            }
            res.json({
                success: true,
                message:
                    "Mijoz muvaffaqiyatli o'chirildi",
            });
        } catch (error) {
            console.error(
                "Mijoz DELETE xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Mijozni o'chirishda xatolik",
            });
        }
    }
);
// ======================================================
// NASIYA - QARZDOR MIJOZLAR
// ADMIN + SOTUVCHI
// ======================================================
app.get(
    "/api/nasiya",
    authenticateToken,
    async (req, res) => {
        try {
            const [rows] =
                await db.query(
                    `
                    SELECT
                        m.id,
                        m.ism,
                        m.telefon,
                        COALESCE(
                            SUM(
                                s.jami_summa -
                                s.tolangan_summa
                            ),
                            0
                        ) AS qarz
                    FROM mijozlar m
                    LEFT JOIN sotuvlar s
                        ON s.mijoz_id = m.id
                        AND s.jami_summa >
                            s.tolangan_summa
                    GROUP BY
                        m.id,
                        m.ism,
                        m.telefon
                    HAVING qarz > 0
                    ORDER BY qarz DESC
                    `
                );
            res.json(rows);
        } catch (error) {
            console.error(
                "Nasiya GET xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Nasiya ma'lumotlarini olishda xatolik",
            });
        }
    }
);
// ======================================================
// NASIYA - MIJOZNING QARZLARI
// ADMIN + SOTUVCHI
// ======================================================
app.get(
    "/api/nasiya/mijoz/:id",
    authenticateToken,
    async (req, res) => {
        try {
            const mijozId =
                Number(req.params.id);
            if (!mijozId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Mijoz ID noto'g'ri",
                });
            }
            const [rows] =
                await db.query(
                    `
                    SELECT
                        s.id,
                        s.jami_summa,
                        s.tolangan_summa,
                        (
                            s.jami_summa -
                            s.tolangan_summa
                        ) AS qarz,
                        s.tolov_turi,
                        s.sotilgan_vaqt
                    FROM sotuvlar s
                    WHERE s.mijoz_id = ?
                    AND s.jami_summa >
                        s.tolangan_summa
                    ORDER BY s.id DESC
                    `,
                    [mijozId]
                );
            res.json(rows);
        } catch (error) {
            console.error(
                "Mijoz nasiya xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Mijoz qarzlarini olishda xatolik",
            });
        }
    }
);
// ======================================================
// NASIYA - TO'LOV
// ADMIN + SOTUVCHI
// ======================================================
app.post(
    "/api/nasiya/tolov",
    authenticateToken,
    async (req, res) => {
        const connection =
            await db.getConnection();
        try {
            const {
                mijoz_id,
                sotuv_id,
                summa,
                izoh,
            } = req.body;
            const mijozId =
                Number(mijoz_id);
            const sotuvId =
                sotuv_id
                    ? Number(sotuv_id)
                    : null;
            const tolovSumma =
                Number(summa);
            if (!mijozId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Mijoz tanlanmagan",
                });
            }
            if (
                !tolovSumma ||
                tolovSumma <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "To'lov summasi noto'g'ri",
                });
            }
            await connection.beginTransaction();
            // ----------------------------------
            // MIJOZNI TEKSHIRISH
            // ----------------------------------
            const [mijozRows] =
                await connection.query(
                    `
                    SELECT id
                    FROM mijozlar
                    WHERE id = ?
                    `,
                    [mijozId]
                );
            if (
                mijozRows.length === 0
            ) {
                throw new Error(
                    "Mijoz topilmadi"
                );
            }
            // ----------------------------------
            // BIRTA SOTUVGA TO'LOV
            // ----------------------------------
            if (sotuvId) {
                const [saleRows] =
                    await connection.query(
                        `
                        SELECT
                            id,
                            mijoz_id,
                            jami_summa,
                            tolangan_summa
                        FROM sotuvlar
                        WHERE id = ?
                        FOR UPDATE
                        `,
                        [sotuvId]
                    );
                if (
                    saleRows.length === 0
                ) {
                    throw new Error(
                        "Sotuv topilmadi"
                    );
                }
                const sale =
                    saleRows[0];
                if (
                    Number(
                        sale.mijoz_id
                    ) !== mijozId
                ) {
                    throw new Error(
                        "Bu sotuv ushbu mijozga tegishli emas"
                    );
                }
                const qarz =
                    Number(
                        sale.jami_summa
                    ) -
                    Number(
                        sale.tolangan_summa
                    );
                if (qarz <= 0) {
                    throw new Error(
                        "Bu sotuv bo'yicha qarz qolmagan"
                    );
                }
                if (
                    tolovSumma > qarz
                ) {
                    throw new Error(
                        `To'lov qarzdan katta bo'lishi mumkin emas. Qarz: ${qarz}`
                    );
                }
                await connection.query(
                    `
                    UPDATE sotuvlar
                    SET
                        tolangan_summa =
                        tolangan_summa + ?
                    WHERE id = ?
                    `,
                    [
                        tolovSumma,
                        sotuvId,
                    ]
                );
            } else {
                // ----------------------------------
                // MIJOZNING JAMI QARZI
                // ----------------------------------
                const [debtRows] =
                    await connection.query(
                        `
                        SELECT
                            COALESCE(
                                SUM(
                                    jami_summa -
                                    tolangan_summa
                                ),
                                0
                            ) AS jami_qarz
                        FROM sotuvlar
                        WHERE mijoz_id = ?
                        AND jami_summa >
                            tolangan_summa
                        `,
                        [mijozId]
                    );
                const qarz =
                    Number(
                        debtRows[0].jami_qarz
                    );
                if (qarz <= 0) {
                    throw new Error(
                        "Bu mijozda qarz mavjud emas"
                    );
                }
                if (
                    tolovSumma > qarz
                ) {
                    throw new Error(
                        `To'lov jami qarzdan katta. Jami qarz: ${qarz}`
                    );
                }
                // ----------------------------------
                // ENG ESKI QARZLARDAN BOSHLAYMIZ
                // ----------------------------------
                const [sales] =
                    await connection.query(
                        `
                        SELECT
                            id,
                            jami_summa,
                            tolangan_summa
                        FROM sotuvlar
                        WHERE mijoz_id = ?
                        AND jami_summa >
                            tolangan_summa
                        ORDER BY
                            sotilgan_vaqt ASC,
                            id ASC
                        FOR UPDATE
                        `,
                        [mijozId]
                    );
                let remaining =
                    tolovSumma;
                for (
                    const sale of sales
                ) {
                    if (
                        remaining <= 0
                    ) {
                        break;
                    }
                    const saleDebt =
                        Number(
                            sale.jami_summa
                        ) -
                        Number(
                            sale.tolangan_summa
                        );
                    const payment =
                        Math.min(
                            remaining,
                            saleDebt
                        );
                    await connection.query(
                        `
                        UPDATE sotuvlar
                        SET
                            tolangan_summa =
                            tolangan_summa + ?
                        WHERE id = ?
                        `,
                        [
                            payment,
                            sale.id,
                        ]
                    );
                    remaining -=
                        payment;
                }
            }
            // ----------------------------------
            // TO'LOV TARIXI
            // ----------------------------------
            await connection.query(
                `
                INSERT INTO nasiya_tolovlari
                (
                    mijoz_id,
                    sotuv_id,
                    summa,
                    izoh
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    mijozId,
                    sotuvId,
                    tolovSumma,
                    izoh || null,
                ]
            );
            await connection.commit();
            res.json({
                success: true,
                message:
                    "Nasiya to'lovi muvaffaqiyatli qabul qilindi",
                summa: tolovSumma,
            });
        } catch (error) {
            await connection.rollback();
            console.error(
                "Nasiya to'lovi xatosi:",
                error
            );
            res.status(400).json({
                success: false,
                message: error.message,
            });
        } finally {
            connection.release();
        }
    }
);
// ======================================================
// NASIYA - TO'LOVLAR TARIXI
// ADMIN + SOTUVCHI
// ======================================================
app.get(
    "/api/nasiya/tolovlar",
    authenticateToken,
    async (req, res) => {
        try {
            const [rows] =
                await db.query(
                    `
                    SELECT
                        nt.id,
                        nt.mijoz_id,
                        m.ism AS mijoz_ismi,
                        m.telefon,
                        nt.sotuv_id,
                        nt.summa,
                        nt.izoh,
                        nt.tolangan_vaqt
                    FROM nasiya_tolovlari nt
                    INNER JOIN mijozlar m
                        ON nt.mijoz_id = m.id
                    ORDER BY nt.id DESC
                    `
                );
            res.json(rows);
        } catch (error) {
            console.error(
                "Nasiya to'lovlar GET xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "To'lovlar tarixini olishda xatolik",
            });
        }
    }
);
// ======================================================
// DASHBOARD
// ADMIN + SOTUVCHI
// ======================================================
app.get(
    "/api/dashboard",
    authenticateToken,
    async (req, res) => {
        try {
            // ----------------------------------
            // BUGUNGI SAVDO
            // ----------------------------------
            const [todaySales] =
                await db.query(
                    `
                    SELECT
                        COUNT(*) AS sotuvlar_soni,
                        COALESCE(
                            SUM(jami_summa),
                            0
                        ) AS jami_savdo,
                        COALESCE(
                            SUM(tolangan_summa),
                            0
                        ) AS jami_tolangan
                    FROM sotuvlar
                    WHERE DATE(
                        sotilgan_vaqt
                    ) = CURDATE()
                    `
                );
            // ----------------------------------
            // MIJOZLAR
            // ----------------------------------
            const [customers] =
                await db.query(
                    `
                    SELECT
                        COUNT(*) AS soni
                    FROM mijozlar
                    `
                );
            // ----------------------------------
            // TOVARLAR
            // ----------------------------------
            const [products] =
                await db.query(
                    `
                    SELECT
                        COUNT(*) AS soni,
                        COALESCE(
                            SUM(miqdor),
                            0
                        ) AS jami_miqdor
                    FROM tovarlar
                    `
                );
            // ----------------------------------
            // KAM QOLGAN TOVARLAR
            // ----------------------------------
            const [lowStock] =
                await db.query(
                    `
                    SELECT
                        id,
                        nom,
                        kategoriya,
                        miqdor,
                        min_zaxira,
                        birlik
                    FROM tovarlar
                    WHERE miqdor <= min_zaxira
                    ORDER BY
                        miqdor ASC,
                        nom ASC
                    LIMIT 10
                    `
                );
            // ----------------------------------
            // JAMI NASIYA
            // ----------------------------------
            const [debt] =
                await db.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(
                                jami_summa -
                                tolangan_summa
                            ),
                            0
                        ) AS jami_qarz
                    FROM sotuvlar
                    WHERE jami_summa >
                        tolangan_summa
                    `
                );
            // ----------------------------------
            // OXIRGI SOTUVLAR
            // ----------------------------------
            const [recentSales] =
                await db.query(
                    `
                    SELECT
                        s.id,
                        COALESCE(
                            m.ism,
                            'Noma''lum mijoz'
                        ) AS mijoz_ismi,
                        s.jami_summa,
                        s.tolangan_summa,
                        (
                            s.jami_summa -
                            s.tolangan_summa
                        ) AS qarz,
                        s.tolov_turi,
                        s.sotilgan_vaqt
                    FROM sotuvlar s
                    LEFT JOIN mijozlar m
                        ON s.mijoz_id = m.id
                    ORDER BY s.id DESC
                    LIMIT 10
                    `
                );
            // ----------------------------------
            // ENG KO'P SOTILGAN TOVARLAR
            // ----------------------------------
            const [topProducts] =
                await db.query(
                    `
                    SELECT
                        t.id,
                        t.nom,
                        t.birlik,
                        COALESCE(
                            SUM(st.miqdor),
                            0
                        ) AS sotilgan_miqdor,
                        COALESCE(
                            SUM(st.jami_narx),
                            0
                        ) AS tushum
                    FROM sotuv_tafsilotlari st
                    INNER JOIN tovarlar t
                        ON st.tovar_id = t.id
                    GROUP BY
                        t.id,
                        t.nom,
                        t.birlik
                    ORDER BY
                        sotilgan_miqdor DESC
                    LIMIT 10
                    `
                );
            res.json({
                success: true,
                today: {
                    sotuvlar_soni:
                        Number(
                            todaySales[0]
                                .sotuvlar_soni ||
                            0
                        ),
                    jami_savdo:
                        Number(
                            todaySales[0]
                                .jami_savdo ||
                            0
                        ),
                    jami_tolangan:
                        Number(
                            todaySales[0]
                                .jami_tolangan ||
                            0
                        ),
                },
                customers: {
                    soni:
                        Number(
                            customers[0]
                                .soni ||
                            0
                        ),
                },
                products: {
                    soni:
                        Number(
                            products[0]
                                .soni ||
                            0
                        ),
                    jami_miqdor:
                        Number(
                            products[0]
                                .jami_miqdor ||
                            0
                        ),
                },
                debt: {
                    jami_qarz:
                        Number(
                            debt[0]
                                .jami_qarz ||
                            0
                        ),
                },
                lowStock,
                recentSales,
                topProducts,
            });
        } catch (error) {
            console.error(
                "Dashboard xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Dashboard ma'lumotlarini olishda xatolik",
                error: error.message,
            });
        }
    }
);
// ======================================================
// STATISTIKA
// ADMIN + SOTUVCHI
// ======================================================
app.get(
    "/api/statistika",
    authenticateToken,
    async (req, res) => {
        try {
            // ----------------------------------
            // UMUMIY
            // ----------------------------------
            const [umumiy] =
                await db.query(
                    `
                    SELECT
                        COUNT(*) AS jami_sotuvlar,
                        COALESCE(
                            SUM(jami_summa),
                            0
                        ) AS jami_savdo,
                        COALESCE(
                            SUM(tolangan_summa),
                            0
                        ) AS jami_tolangan,
                        COALESCE(
                            SUM(
                                jami_summa -
                                tolangan_summa
                            ),
                            0
                        ) AS jami_qarz
                    FROM sotuvlar
                    `
                );
            // ----------------------------------
            // TO'LOV TURLARI
            // ----------------------------------
            const [tolovTurlari] =
                await db.query(
                    `
                    SELECT
                        tolov_turi,
                        COUNT(*) AS sotuv_soni,
                        COALESCE(
                            SUM(jami_summa),
                            0
                        ) AS summa
                    FROM sotuvlar
                    GROUP BY
                        tolov_turi
                    ORDER BY
                        summa DESC
                    `
                );
            // ----------------------------------
            // ENG KO'P SOTILGAN TOVARLAR
            // ----------------------------------
            const [topTovarlar] =
                await db.query(
                    `
                    SELECT
                        t.id,
                        t.nom,
                        t.kategoriya,
                        COALESCE(
                            SUM(st.miqdor),
                            0
                        ) AS sotilgan_miqdor,
                        COALESCE(
                            SUM(st.jami_narx),
                            0
                        ) AS sotuv_summa
                    FROM sotuv_tafsilotlari st
                    INNER JOIN tovarlar t
                        ON t.id =
                            st.tovar_id
                    GROUP BY
                        t.id,
                        t.nom,
                        t.kategoriya
                    ORDER BY
                        sotilgan_miqdor DESC
                    LIMIT 10
                    `
                );
            // ----------------------------------
            // KUNLIK SAVDO
            // ----------------------------------
            const [kunlik] =
                await db.query(
                    `
                    SELECT
                        DATE(
                            sotilgan_vaqt
                        ) AS sana,
                        COUNT(*) AS sotuv_soni,
                        COALESCE(
                            SUM(jami_summa),
                            0
                        ) AS summa
                    FROM sotuvlar
                    GROUP BY
                        DATE(
                            sotilgan_vaqt
                        )
                    ORDER BY
                        sana DESC
                    LIMIT 30
                    `
                );
            // ----------------------------------
            // NASIYA STATISTIKASI
            // ----------------------------------
            const [nasiya] =
                await db.query(
                    `
                    SELECT
                        COUNT(*) AS nasiya_sotuvlar,
                        COALESCE(
                            SUM(
                                jami_summa -
                                tolangan_summa
                            ),
                            0
                        ) AS jami_nasiya_qarz
                    FROM sotuvlar
                    WHERE jami_summa >
                        tolangan_summa
                    `
                );
            res.json({
                success: true,
                umumiy:
                    umumiy[0],
                tolov_turlari:
                    tolovTurlari,
                top_tovarlar:
                    topTovarlar,
                kunlik:
                    kunlik,
                nasiya:
                    nasiya[0],
            });
        } catch (error) {
            console.error(
                "Statistika xatosi:",
                error
            );
            res.status(500).json({
                success: false,
                message:
                    "Statistikani olishda xatolik",
                error: error.message,
            });
        }
    }
);
// ======================================================
// SERVER
// ======================================================
app.listen(
    PORT,
    () => {
        console.log(
            `Server http://localhost:${PORT} da ishga tushdi`
        );
    }
);
