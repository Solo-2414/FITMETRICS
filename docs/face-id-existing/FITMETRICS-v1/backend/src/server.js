const crypto = require("node:crypto");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const {
    port,
    jwtSecret,
    assertProviderConfiguration,
} = require("./config");
const { findByEmail, findById, createUser } = require("./store");
const { hashPassword, verifyPassword, imageToBase64 } = require("./security");
const { verifyIdWithOcr, idTextContainsName, compareFaces, compareFaceBuffers } = require("./providers");

const app = express();
const livenessChallenges = new Map();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function issueToken(user, purpose, expiresIn) {
    return jwt.sign(
        { sub: user.id, role: user.role, purpose },
        jwtSecret,
        { expiresIn },
    );
}

function createLivenessChallenge(user) {
    const actions = ["blink", "blink", "blink", "left", "right"]
        .sort(() => crypto.randomInt(-1, 2));
    const id = crypto.randomUUID();
    livenessChallenges.set(id, {
        userId: user.id,
        actions,
        expiresAt: Date.now() + 5 * 60 * 1000,
        used: false,
    });
    return { id, actions };
}

function requireToken(purpose) {
    return (request, response, next) => {
        try {
            const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
            const claims = jwt.verify(token, jwtSecret);
            if (claims.purpose !== purpose) {
                return response.status(401).json({ message: "Invalid authentication flow" });
            }
            request.claims = claims;
            next();
        } catch {
            return response.status(401).json({ message: "Authentication token is missing or expired" });
        }
    };
}

function requireRole(...roles) {
    return (request, response, next) => {
        if (!roles.includes(request.claims.role)) {
            return response.status(403).json({ message: "You do not have permission to access this resource" });
        }
        next();
    };
}

app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

app.post("/api/auth/register", upload.fields([
    { name: "idImage", maxCount: 1 },
    { name: "faceImage", maxCount: 1 },
]), requireToken("access"), requireRole("clerk", "admin"), async (request, response) => {
    try {
        assertProviderConfiguration();
        const { fullName, email, password, role = "member", phone, gender, emergencyContactName, emergencyContactPhone, membershipPlan, paymentMethod } = request.body;
        const idImage = request.files?.idImage?.[0];
        const faceImage = request.files?.faceImage?.[0];
        if (!fullName || !email || !password || !idImage || !faceImage) {
            return response.status(400).json({ message: "fullName, email, password, idImage, and faceImage are required" });
        }
        if (!["member", "clerk", "admin"].includes(role)) {
            return response.status(400).json({ message: "Invalid role" });
        }
        if (findByEmail(email)) {
            return response.status(409).json({ message: "An account with this email already exists" });
        }

        const ocrText = await verifyIdWithOcr(idImage);
        if (!idTextContainsName(ocrText, fullName)) {
            return response.status(422).json({ message: "The name on the ID does not match the registered full name" });
        }
        const faceMatch = await compareFaceBuffers(faceImage.buffer, idImage.buffer);
        if (faceMatch.confidence < faceMatch.threshold) {
            return response.status(422).json({
                message: "The scanned face does not match the face on the submitted ID",
                confidence: faceMatch.confidence,
                threshold: faceMatch.threshold,
            });
        }
        const user = createUser({
            id: crypto.randomUUID(),
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            role,
            phone: phone || null,
            gender: gender || null,
            emergencyContactName: emergencyContactName || null,
            emergencyContactPhone: emergencyContactPhone || null,
            membershipPlan: membershipPlan || null,
            paymentMethod: paymentMethod || null,
            passwordHash: hashPassword(password),
            referenceFaceImage: imageToBase64(faceImage),
            idVerifiedAt: new Date().toISOString(),
        });
        return response.status(201).json({ id: user.id, email: user.email, role: user.role });
    } catch (error) {
        console.error("Registration failed:", error.message);
        const providerFailure = error.message.includes("provider");
        return response.status(providerFailure ? 502 : 422).json({ message: error.message });
    }
});

app.post("/api/auth/login", async (request, response) => {
    const { email, password } = request.body || {};
    const user = email ? findByEmail(email) : null;
    if (!user || !password || !verifyPassword(password, user.passwordHash)) {
        return response.status(401).json({ message: "Invalid email or password" });
    }
    const livenessChallenge = createLivenessChallenge(user);
    return response.json({
        verificationToken: issueToken(user, "face-verification", "5m"),
        livenessToken: issueToken(user, "liveness", "5m"),
        livenessChallenge,
        role: user.role,
        requiresFaceVerification: true,
    });
});

app.post("/api/auth/verify-face", upload.single("faceImage"), requireToken("face-verification"), async (request, response) => {
    try {
        assertProviderConfiguration();
        const livenessToken = request.body?.livenessToken;
        let livenessClaims;
        try {
            livenessClaims = jwt.verify(livenessToken, jwtSecret);
        } catch {
            return response.status(401).json({ message: "Live face challenge expired or is invalid" });
        }
        const challenge = livenessChallenges.get(request.body?.livenessChallengeId);
        let submittedActions;
        try {
            submittedActions = JSON.parse(request.body?.livenessActions || "null");
        } catch {
            submittedActions = null;
        }
        if (livenessClaims.purpose !== "liveness"
            || livenessClaims.sub !== request.claims.sub
            || !challenge
            || challenge.used
            || challenge.expiresAt < Date.now()
            || challenge.userId !== request.claims.sub
            || JSON.stringify(submittedActions) !== JSON.stringify(challenge.actions)) {
            return response.status(401).json({ message: "Live face challenge was not completed" });
        }
        if (!request.file) {
            return response.status(400).json({ message: "faceImage is required" });
        }
        const user = findById(request.claims.sub);
        if (!user) {
            return response.status(401).json({ message: "Account no longer exists" });
        }
        const match = await compareFaces(request.file.buffer, user.referenceFaceImage);
        if (match.confidence < match.threshold) {
            return response.status(401).json({
                message: "Face did not match the registered identity",
                confidence: match.confidence,
            });
        }
        challenge.used = true;
        return response.json({
            accessToken: issueToken(user, "access", "8h"),
            user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error("Face verification failed:", error.message);
        const isInvalidImage = error.message.includes("no registered face image")
            || error.message.includes("captured face image");
        return response.status(isInvalidImage ? 422 : 502).json({ message: error.message });
    }
});

app.get("/api/profile", requireToken("access"), (request, response) => {
    const user = findById(request.claims.sub);
    if (!user) return response.status(404).json({ message: "Profile not found" });
    return response.json({
        user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            phone: user.phone,
            gender: user.gender,
            emergencyContactName: user.emergencyContactName,
            emergencyContactPhone: user.emergencyContactPhone,
            membershipPlan: user.membershipPlan,
            paymentMethod: user.paymentMethod,
            faceImage: user.referenceFaceImage,
            idVerifiedAt: user.idVerifiedAt,
            createdAt: user.createdAt,
        },
    });
});

app.get("/api/admin/users", requireToken("access"), requireRole("admin"), (_request, response) => {
    response.json({ message: "Admin access granted" });
});

app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError) {
        return response.status(400).json({ message: error.message });
    }
    console.error("Unhandled request error:", error);
    return response.status(500).json({ message: "Unexpected server error" });
});

app.listen(port, () => console.log(`FITMETRICS auth API listening on http://localhost:${port}`));
