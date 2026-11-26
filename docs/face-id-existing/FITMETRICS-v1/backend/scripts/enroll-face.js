const fs = require("node:fs");
const path = require("node:path");
const { findByEmail, updateReferenceFace } = require("../src/store");

const [email, imagePath] = process.argv.slice(2);
if (!email || !imagePath) {
    console.error("Usage: npm run enroll:face -- <email> <image-path>");
    process.exit(1);
}

const user = findByEmail(email);
if (!user) {
    console.error(`No account found for ${email}`);
    process.exit(1);
}

const resolvedPath = path.resolve(imagePath);
if (!fs.existsSync(resolvedPath)) {
    console.error(`Image not found: ${resolvedPath}`);
    process.exit(1);
}

const image = fs.readFileSync(resolvedPath);
if (image.length < 100) {
    console.error("The image is empty or invalid");
    process.exit(1);
}

const extension = path.extname(resolvedPath).toLowerCase();
const mimeType = extension === ".png" ? "image/png" : "image/jpeg";
updateReferenceFace(user.email, `data:${mimeType};base64,${image.toString("base64")}`);
console.log(`Updated the face reference for ${user.email}.`);
