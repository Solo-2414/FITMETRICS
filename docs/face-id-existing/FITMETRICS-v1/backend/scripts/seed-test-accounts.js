const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");

const dataPath = path.resolve(__dirname, "../data/users.json");
const identityImagePath = path.resolve(__dirname, "../fixtures/identity/IDImage.jpg");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

const accounts = [
    ["admin.test@fitmetrics.local", "admin", "FM-Admin-2026!"],
    ["clerk1.test@fitmetrics.local", "clerk", "FM-Clerk1-2026!"],
    ["clerk2.test@fitmetrics.local", "clerk", "FM-Clerk2-2026!"],
    ["member1.test@fitmetrics.local", "member", "FM-Member1-2026!"],
    ["member2.test@fitmetrics.local", "member", "FM-Member2-2026!"],
    ["member3.test@fitmetrics.local", "member", "FM-Member3-2026!"],
];

if (!fs.existsSync(identityImagePath)) {
    throw new Error(`Identity fixture not found: ${identityImagePath}`);
}

const referenceFaceImage = `data:image/jpeg;base64,${fs.readFileSync(identityImagePath).toString("base64")}`;
const existingUsers = fs.existsSync(dataPath)
    ? JSON.parse(fs.readFileSync(dataPath, "utf8"))
    : [];

const usersByEmail = new Map(existingUsers.map((user) => [user.email, user]));
for (const [email, role, password] of accounts) {
    const existing = usersByEmail.get(email);
    usersByEmail.set(email, {
        id: existing?.id || crypto.randomUUID(),
        fullName: "Michael Andre Tanza",
        email,
        role,
        passwordHash: existing?.passwordHash || hashPassword(password),
        referenceFaceImage,
        idVerifiedAt: new Date().toISOString(),
        developmentOnly: true,
        sharedIdentityFixture: true,
    });
}

fs.mkdirSync(path.dirname(dataPath), { recursive: true });
fs.writeFileSync(dataPath, JSON.stringify([...usersByEmail.values()], null, 2));

console.log("Seeded development accounts:");
for (const [email, role, password] of accounts) {
    console.log(`${role}\t${email}\t${password}`);
}
