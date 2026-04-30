const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

const verifyGoogleCredential = async (idToken) => {
    if (!idToken) {
        throw new Error('Token Google wajib diisi');
    }

    const response = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
        throw new Error('Token Google tidak valid');
    }

    const payload = await response.json();
    if (payload.email_verified !== 'true') {
        throw new Error('Email Google belum terverifikasi');
    }

    const expectedAudience = process.env.GOOGLE_CLIENT_ID;
    if (expectedAudience && payload.aud !== expectedAudience) {
        throw new Error('Google Client ID tidak cocok');
    }

    return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email,
        picture: payload.picture || null
    };
};

module.exports = {
    verifyGoogleCredential
};