const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const databasePath = path.resolve(__dirname, "../data/fitmetrics.sqlite");
const legacyUsersPath = path.resolve(__dirname, "../data/users.json");
const database = new Database(databasePath);

database.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        phone TEXT,
        gender TEXT,
        emergency_contact_name TEXT,
        emergency_contact_phone TEXT,
        membership_plan TEXT,
        payment_method TEXT,
        password_hash TEXT NOT NULL,
        reference_face_image TEXT NOT NULL,
        id_verified_at TEXT,
        created_at TEXT NOT NULL
    )
`);

const count = database.prepare("SELECT COUNT(*) AS count FROM users").get().count;
if (count === 0 && fs.existsSync(legacyUsersPath)) {
    const insert = database.prepare(`
        INSERT OR IGNORE INTO users (
            id, full_name, email, role, phone, gender,
            emergency_contact_name, emergency_contact_phone,
            membership_plan, payment_method, password_hash,
            reference_face_image, id_verified_at, created_at
        ) VALUES (
            @id, @fullName, @email, @role, @phone, @gender,
            @emergencyContactName, @emergencyContactPhone,
            @membershipPlan, @paymentMethod, @passwordHash,
            @referenceFaceImage, @idVerifiedAt, @createdAt
        )
    `);
    const users = JSON.parse(fs.readFileSync(legacyUsersPath, "utf8"));
    const migrate = database.transaction(() => users.forEach((user) => insert.run({
        phone: null,
        gender: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        membershipPlan: null,
        paymentMethod: null,
        ...user,
        createdAt: user.createdAt || new Date().toISOString(),
    })));
    migrate();
}

const toUser = (row) => row ? ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    phone: row.phone,
    gender: row.gender,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    membershipPlan: row.membership_plan,
    paymentMethod: row.payment_method,
    passwordHash: row.password_hash,
    referenceFaceImage: row.reference_face_image,
    idVerifiedAt: row.id_verified_at,
    createdAt: row.created_at,
}) : null;

function findByEmail(email) {
    return toUser(database.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim()));
}

function findById(id) {
    return toUser(database.prepare("SELECT * FROM users WHERE id = ?").get(id));
}

function createUser(user) {
    database.prepare(`
        INSERT INTO users (
            id, full_name, email, role, phone, gender,
            emergency_contact_name, emergency_contact_phone,
            membership_plan, payment_method, password_hash,
            reference_face_image, id_verified_at, created_at
        ) VALUES (
            @id, @fullName, @email, @role, @phone, @gender,
            @emergencyContactName, @emergencyContactPhone,
            @membershipPlan, @paymentMethod, @passwordHash,
            @referenceFaceImage, @idVerifiedAt, @createdAt
        )
    `).run({ ...user, createdAt: user.createdAt || new Date().toISOString() });
    return findById(user.id);
}

function updateReferenceFace(email, referenceFaceImage) {
    database.prepare("UPDATE users SET reference_face_image = ? WHERE email = ?")
        .run(referenceFaceImage, email.toLowerCase().trim());
    return findByEmail(email);
}

module.exports = { findByEmail, findById, createUser, updateReferenceFace };
