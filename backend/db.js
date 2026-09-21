const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "majidov",
    password: "password123", // Agar parolsiz qilgan bo'lsangiz: ""
    database: "temir_dokon",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
