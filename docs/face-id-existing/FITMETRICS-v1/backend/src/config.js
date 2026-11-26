const path = require("node:path");
require("dotenv").config({
    path: path.resolve(__dirname, "../.env"),
    override: true,
});

const required = ["JWT_SECRET", "FACEPP_API_KEY", "FACEPP_API_SECRET"];

function assertProviderConfiguration() {
    const missing = required.filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
}

module.exports = {
    port: Number(process.env.PORT || 5000),
    jwtSecret: process.env.JWT_SECRET,
    facePlusPlusApiKey: process.env.FACEPP_API_KEY,
    facePlusPlusApiSecret: process.env.FACEPP_API_SECRET,
    ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY || "helloworld",
    assertProviderConfiguration,
};
