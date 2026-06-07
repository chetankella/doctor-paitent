const crypto = require("crypto");

const algorithm = "aes-256-gcm";

function getKey() {
    const secret = process.env.LICENSE_SECRET;
    if (!secret) {
        throw new Error("LICENSE_SECRET not set");
    }
    return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(text) {
    const key = getKey();
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return iv.toString("hex") + ":" +
           tag.toString("hex") + ":" +
           encrypted.toString("hex");
}

function decryptLic(encryptedText) {
    try {
        if (!encryptedText) return null;

        const key = getKey();

        const [ivHex, tagHex, encryptedHex] = encryptedText.split(":");

        const iv = Buffer.from(ivHex, "hex");
        const tag = Buffer.from(tagHex, "hex");
        const encrypted = Buffer.from(encryptedHex, "hex");

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return decrypted.toString("utf8");
    } catch (err) {
        return null;
    }
}

module.exports = { encrypt, decryptLic };
