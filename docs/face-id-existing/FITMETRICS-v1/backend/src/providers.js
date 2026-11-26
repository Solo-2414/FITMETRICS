const { facePlusPlusApiKey, facePlusPlusApiSecret, ocrSpaceApiKey } = require("./config");

async function verifyIdWithOcr(file) {
    const form = new URLSearchParams({
        apikey: ocrSpaceApiKey,
        language: "eng",
        isOverlayRequired: "false",
        base64Image: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
    });

    let response;
    try {
        response = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form,
            signal: AbortSignal.timeout(30000),
        });
    } catch (error) {
        throw new Error(`OCR provider is unreachable: ${error.message}`);
    }
    if (!response.ok) {
        let providerMessage = "";
        try {
            const errorResult = await response.json();
            providerMessage = errorResult.ErrorMessage || errorResult.message || "";
            if (Array.isArray(providerMessage)) providerMessage = providerMessage.join(", ");
        } catch {
            // Keep the HTTP status when the provider does not return JSON.
        }
        throw new Error(`OCR provider returned HTTP ${response.status}${providerMessage ? `: ${providerMessage}` : ""}`);
    }
    const result = await response.json();
    if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage?.join(", ") || "OCR could not read the ID");
    }
    const text = (result.ParsedResults || []).map((item) => item.ParsedText || "").join("\n").trim();
    if (!text) {
        throw new Error("OCR did not detect readable text on the ID");
    }
    return text;
}

function normalize(value) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function idTextContainsName(ocrText, fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const normalizedText = normalize(ocrText);
    return parts.length > 0 && parts.every((part) => normalizedText.includes(normalize(part)));
}

async function compareFaces(probeImage, referenceImage) {
    const referenceBuffer = Buffer.isBuffer(referenceImage)
        ? referenceImage
        : Buffer.from(referenceImage.replace(/^data:[^;]+;base64,/, ""), "base64");
    return compareFaceBuffers(probeImage, referenceBuffer);
}

async function compareFaceBuffers(probeImage, referenceImage) {
    if (!Buffer.isBuffer(probeImage) || probeImage.length < 100) {
        throw new Error("The captured face image is empty or invalid");
    }
    if (!Buffer.isBuffer(referenceImage) || referenceImage.length < 100) {
        throw new Error("The registered ID or face image is empty or invalid");
    }

    const form = new URLSearchParams({
        api_key: facePlusPlusApiKey.trim(),
        api_secret: facePlusPlusApiSecret.trim(),
        image_base64_1: probeImage.toString("base64"),
        image_base64_2: referenceImage.toString("base64"),
    });

    const response = await fetch("https://api-us.faceplusplus.com/facepp/v3/compare", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
    });
    if (!response.ok) {
        let providerMessage = "";
        try {
            const errorResult = await response.json();
            providerMessage = errorResult.error_message || errorResult.message || "";
        } catch {
            // Keep the HTTP status when the provider does not return JSON.
        }
        throw new Error(`Face++ provider returned HTTP ${response.status}${providerMessage ? `: ${providerMessage}` : ""}`);
    }
    const result = await response.json();
    if (result.error_message) {
        throw new Error(result.error_message);
    }
    return {
        confidence: Number(result.confidence || 0),
        threshold: Number(result.thresholds?.["1e-5"] || 75),
    };
}

module.exports = { verifyIdWithOcr, idTextContainsName, compareFaces, compareFaceBuffers };
