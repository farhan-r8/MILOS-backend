const crypto = require('crypto');

const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS || 60 * 60 * 12);
const AUTH_SECRET = process.env.AUTH_SECRET || 'milos-dev-secret';
const RESET_PASSWORD_TTL_SECONDS = Number(process.env.RESET_PASSWORD_TTL_SECONDS || 60 * 60);
const RESET_PASSWORD_SECRET = process.env.RESET_PASSWORD_SECRET || AUTH_SECRET;

const base64UrlEncode = (value) => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value) => Buffer.from(value, 'base64url').toString('utf8');

const sign = (payloadBase64) => crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payloadBase64)
    .digest('base64url');

const signWithSecret = (payloadBase64, secret) => crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

const createToken = (payload) => {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + TOKEN_TTL_SECONDS
    };

    const payloadBase64 = base64UrlEncode(JSON.stringify(fullPayload));
    const signature = sign(payloadBase64);
    return `${payloadBase64}.${signature}`;
};

const verifyToken = (token) => {
    if (!token || typeof token !== 'string') return null;

    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return null;

    const expectedSignature = sign(payloadBase64);
    if (expectedSignature !== signature) return null;

    try {
        const payload = JSON.parse(base64UrlDecode(payloadBase64));
        const now = Math.floor(Date.now() / 1000);
        if (!payload.exp || payload.exp < now) return null;
        return payload;
    } catch (_err) {
        return null;
    }
};

const createResetPasswordToken = (payload) => {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        purpose: 'reset-password',
        iat: now,
        exp: now + RESET_PASSWORD_TTL_SECONDS
    };

    const payloadBase64 = base64UrlEncode(JSON.stringify(fullPayload));
    const signature = signWithSecret(payloadBase64, RESET_PASSWORD_SECRET);
    return `${payloadBase64}.${signature}`;
};

const verifyResetPasswordToken = (token) => {
    if (!token || typeof token !== 'string') return null;

    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return null;

    const expectedSignature = signWithSecret(payloadBase64, RESET_PASSWORD_SECRET);
    if (expectedSignature !== signature) return null;

    try {
        const payload = JSON.parse(base64UrlDecode(payloadBase64));
        const now = Math.floor(Date.now() / 1000);
        if (payload.purpose !== 'reset-password') return null;
        if (!payload.exp || payload.exp < now) return null;
        return payload;
    } catch (_err) {
        return null;
    }
};

module.exports = {
    createToken,
    verifyToken,
    createResetPasswordToken,
    verifyResetPasswordToken
};
