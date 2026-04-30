const nodemailer = require('nodemailer');

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

const sendMail = async ({ to, subject, html, text }) => {
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

module.exports = {
    sendMail
};
