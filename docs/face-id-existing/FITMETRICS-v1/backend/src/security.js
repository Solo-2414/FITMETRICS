const crypto = require("node:crypto");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const [salt, expected] = storedHash.split(":");
    const actual = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function imageToBase64(file) {
    return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

module.exports = { hashPassword, verifyPassword, imageToBase64 };
