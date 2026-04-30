const bcrypt = require('bcryptjs');

const PASSWORD_SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 12);

const isHashedPassword = (value) => typeof value === 'string' && value.startsWith('$2');

const hashPassword = async (plainPassword) => bcrypt.hash(plainPassword, PASSWORD_SALT_ROUNDS);

const verifyPassword = async (plainPassword, storedPassword) => {
    if (!storedPassword) return false;

    if (isHashedPassword(storedPassword)) {
        return bcrypt.compare(plainPassword, storedPassword);
    }

    return plainPassword === storedPassword;
};

module.exports = {
    hashPassword,
    verifyPassword,
    isHashedPassword
};
