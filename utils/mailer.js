const nodemailer = require('nodemailer');

const BREVO_SEND_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';

const getMailerConfig = () => ({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
        : undefined
});

const createTransporter = () => {
    const config = getMailerConfig();
    if (!config.host || !config.auth?.user || !config.auth?.pass) {
        throw new Error('Konfigurasi SMTP belum lengkap');
    }
    return nodemailer.createTransport(config);
};

const parseFromAddress = (rawFrom) => {
    const fallbackEmail = process.env.SMTP_USER || '';
    const value = String(rawFrom || fallbackEmail).trim();
    const match = value.match(/^(.*)<(.+)>$/);

    if (!match) {
        return {
            name: 'MILOS',
            email: value || fallbackEmail
        };
    }

    return {
        name: match[1].trim().replace(/^"|"$/g, '') || 'MILOS',
        email: match[2].trim()
    };
};

const sendViaBrevoApi = async ({ to, subject, html, text }) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        throw new Error('BREVO_API_KEY belum diatur');
    }

    const sender = parseFromAddress(process.env.MAIL_FROM || process.env.SMTP_USER);
    if (!sender.email) {
        throw new Error('MAIL_FROM atau SMTP_USER belum valid');
    }

    const response = await fetch(BREVO_SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
            Accept: 'application/json'
        },
        body: JSON.stringify({
            sender,
            to: [{ email: to }],
            subject,
            htmlContent: html,
            textContent: text
        })
    });

    const rawText = await response.text();
    let data = null;

    try {
        data = rawText ? JSON.parse(rawText) : null;
    } catch (_error) {
        data = rawText;
    }

    if (!response.ok) {
        const message = data?.message || data?.code || rawText || 'Brevo API gagal mengirim email';
        throw new Error(message);
    }

    return data;
};

const sendViaSmtp = async ({ to, subject, html, text }) => {
    const transporter = createTransporter();
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;

    return transporter.sendMail({
        from,
        to,
        subject,
        text,
        html
    });
};

const sendMail = async ({ to, subject, html, text }) => {
    if (process.env.BREVO_API_KEY) {
        return sendViaBrevoApi({ to, subject, html, text });
    }

    return sendViaSmtp({ to, subject, html, text });
};

module.exports = {
    sendMail
};
