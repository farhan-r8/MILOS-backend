const db = require('../config/db');
const { createToken, createResetPasswordToken, verifyResetPasswordToken } = require('../utils/token');
const { verifyGoogleCredential } = require('../utils/googleAuth');
const { hashPassword, verifyPassword, isHashedPassword } = require('../utils/password');
const { sendMail } = require('../utils/mailer');

const normalizeRole = (role) => {
    if (role === 'admin' || role === 'nasabah') return role;
    return 'nasabah';
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email) => EMAIL_REGEX.test(String(email || '').trim());

const mapUserRow = (row) => ({
    id: String(row.id_user ?? row.id ?? ''),
    name: row.nama ?? row.name ?? '',
    email: row.email ?? '',
    role: row.role ?? 'nasabah',
    phone: row.phone ?? row.telepon ?? null,
    address: row.address ?? row.alamat ?? null,
    roomNumber: row.room_number ?? row.roomNumber ?? row.no_kamar ?? null,
    points: Number(row.points ?? row.poin ?? 0)
});

const createAuthResponse = (user, message) => ({
    message,
    token: createToken({
        userId: user.id_user,
        email: user.email,
        role: user.role
    }),
    user: mapUserRow(user)
});

const createUserRecord = async ({ nama, email, password, role, phone, address }, res) => {
    const checkEmailSql = 'SELECT id_user FROM user WHERE email = ? LIMIT 1';
    db.query(checkEmailSql, [email], async (checkErr, existingUsers) => {
        if (checkErr) return res.status(500).json(checkErr);

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: 'Email sudah terdaftar'
            });
        }

        if (role === 'nasabah' && (!phone || !address)) {
            return res.status(400).json({
                message: 'Field wajib untuk nasabah: phone, address'
            });
        }

        const hashedPassword = await hashPassword(password);
        const insertSql = 'INSERT INTO user (nama, email, password, role, phone, address) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(insertSql, [nama, email, hashedPassword, role, phone, address], (insertErr, insertResult) => {
            if (insertErr) return res.status(500).json(insertErr);

            return res.status(201).json({
                message: 'User berhasil ditambahkan',
                user: {
                    id: insertResult.insertId,
                    name: nama,
                    email,
                    role,
                    phone,
                    address,
                    points: role === 'nasabah' ? 0 : null
                }
            });
        });
    });
};

exports.getUsers = (req, res) => {
    db.query('SELECT * FROM user', (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json(result.map(mapUserRow));
    });
};

exports.createUser = (req, res) => {
    const nama = req.body.nama || req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const role = normalizeRole(req.body.role);
    const phone = req.body.phone || null;
    const address = req.body.address || req.body.location || null;

    if (!nama || !email || !password) {
        return res.status(400).json({
            message: 'Field wajib: name/nama, email, password'
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            message: 'Format email tidak valid'
        });
    }

    return createUserRecord({ nama, email, password, role, phone, address }, res);
};

exports.registerNasabah = (req, res) => {
    const nama = req.body.nama || req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const phone = req.body.phone || null;
    const address = req.body.address || req.body.location || null;

    if (!nama || !email || !password || !phone || !address) {
        return res.status(400).json({
            message: 'Field wajib: name/nama, email, password, phone, address'
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            message: 'Format email tidak valid'
        });
    }

    return createUserRecord({
        nama,
        email,
        password,
        role: 'nasabah',
        phone,
        address
    }, res);
};

exports.requestNasabahPasswordReset = async (req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.status(400).json({
            message: 'Field wajib: email'
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            message: 'Format email tidak valid'
        });
    }

    db.query(
        "SELECT id_user, nama, email FROM user WHERE email = ? AND role = 'nasabah' LIMIT 1",
        [email],
        async (err, result) => {
            if (err) return res.status(500).json(err);

            if (!result || result.length === 0) {
                return res.status(404).json({
                    message: 'Akun nasabah dengan email tersebut tidak ditemukan'
                });
            }

            const user = result[0];
            const token = createResetPasswordToken({
                userId: user.id_user,
                email: user.email,
                role: 'nasabah'
            });
            const frontendBaseUrl = (process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
            const resetUrl = `${frontendBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
            try {
                await sendMail({
                    to: user.email,
                    subject: 'Reset Password MILOS',
                    text: `Halo ${user.nama}, buka tautan berikut untuk mereset password akun MILOS Anda: ${resetUrl}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                            <h2>Reset Password MILOS</h2>
                            <p>Halo ${user.nama},</p>
                            <p>Kami menerima permintaan reset password untuk akun MILOS Anda.</p>
                            <p>
                                <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:8px;">
                                    Reset Password
                                </a>
                            </p>
                            <p>Atau salin tautan berikut ke browser Anda:</p>
                            <p>${resetUrl}</p>
                            <p>Tautan ini hanya berlaku dalam waktu terbatas.</p>
                        </div>
                    `
                });

                return res.json({
                    message: 'Tautan reset password berhasil dikirim ke email Anda.'
                });
            } catch (mailError) {
                console.error('Gagal mengirim email reset password:', mailError);
                return res.status(500).json({
                    message: 'Gagal mengirim email reset password. Silakan coba lagi nanti.'
                });
            }
        }
    );
};

exports.confirmNasabahPasswordReset = async (req, res) => {
    const token = req.body.token;
    const newPassword = req.body.newPassword;

    if (!token || !newPassword) {
        return res.status(400).json({
            message: 'Field wajib: token, newPassword'
        });
    }

    if (String(newPassword).length < 8) {
        return res.status(400).json({
            message: 'Password baru minimal 8 karakter'
        });
    }

    const payload = verifyResetPasswordToken(token);
    if (!payload || payload.role !== 'nasabah' || !payload.userId || !payload.email) {
        return res.status(400).json({
            message: 'Token reset password tidak valid atau sudah kedaluwarsa'
        });
    }

    db.query(
        "SELECT id_user FROM user WHERE id_user = ? AND email = ? AND role = 'nasabah' LIMIT 1",
        [payload.userId, payload.email],
        async (err, result) => {
            if (err) return res.status(500).json(err);

            if (!result || result.length === 0) {
                return res.status(404).json({
                    message: 'Akun nasabah dengan token tersebut tidak ditemukan'
                });
            }

            const hashedPassword = await hashPassword(newPassword);
            db.query(
                'UPDATE user SET password = ? WHERE id_user = ?',
                [hashedPassword, result[0].id_user],
                (updateErr) => {
                    if (updateErr) return res.status(500).json(updateErr);

                    return res.json({
                        message: 'Password berhasil direset. Silakan login dengan password baru.'
                    });
                }
            );
        }
    );
};

exports.getTotalPoin = (req, res) => {
    db.query(`
        SELECT u.nama, SUM(d.poin) as total_poin
        FROM detail_transaksi d
        JOIN transaksi t ON d.id_transaksi = t.id_transaksi
        JOIN user u ON t.id_user = u.id_user
        GROUP BY u.nama
    `, (err, result) => {
        if (err) return res.status(500).json(err);
        return res.json(result);
    });
};

exports.getPoinUser = (req, res) => {
    const { id_user } = req.params;

    db.query(`
        SELECT u.id_user, u.nama, COALESCE(SUM(d.poin), 0) as total_poin
        FROM user u
        LEFT JOIN transaksi t ON t.id_user = u.id_user
        LEFT JOIN detail_transaksi d ON d.id_transaksi = t.id_transaksi
        WHERE u.id_user = ?
        GROUP BY u.id_user, u.nama
    `, [id_user], (err, result) => {
        if (err) return res.status(500).json(err);
        if (!result || result.length === 0) {
            return res.json({
                userId: String(id_user),
                totalPoints: 0
            });
        }
        return res.json({
            userId: String(result[0].id_user),
            name: result[0].nama,
            totalPoints: Number(result[0].total_poin || 0)
        });
    });
};

exports.loginUser = (req, res) => {
    const { email, password } = req.body;
    const role = normalizeRole(req.body.role);

    if (!email || !password) {
        return res.status(400).json({
            message: 'Field wajib: email, password'
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            message: 'Format email tidak valid'
        });
    }

    const sql = 'SELECT * FROM user WHERE email = ? AND role = ? LIMIT 1';
    db.query(sql, [email, role], async (err, result) => {
        if (err) return res.status(500).json(err);
        if (!result || result.length === 0) {
            return res.status(401).json({
                message: 'Email atau role tidak sesuai'
            });
        }

        const user = result[0];
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Password salah'
            });
        }

        if (!isHashedPassword(user.password)) {
            const hashedPassword = await hashPassword(password);
            db.query('UPDATE user SET password = ? WHERE id_user = ?', [hashedPassword, user.id_user]);
            user.password = hashedPassword;
        }

        return res.json(createAuthResponse(user, 'Login berhasil'));
    });
};

exports.registerGoogleUser = async (req, res) => {
    try {
        const { credential, phone, address } = req.body;
        const role = normalizeRole(req.body.role);

        if (role !== 'nasabah') {
            return res.status(400).json({
                message: 'Registrasi Google hanya tersedia untuk nasabah'
            });
        }

        if (!phone || !address) {
            return res.status(400).json({
                message: 'Field wajib: phone, address'
            });
        }

        const googleUser = await verifyGoogleCredential(credential);

        db.query(
            'SELECT * FROM user WHERE email = ? LIMIT 1',
            [googleUser.email],
            (checkErr, existingUsers) => {
                if (checkErr) return res.status(500).json(checkErr);

                if (existingUsers.length > 0) {
                    return res.status(409).json({
                        message: 'Email Google ini sudah terdaftar. Silakan masuk.'
                    });
                }

                const generatedPassword = `google:${googleUser.googleId}`;
                const insertSql = `
                    INSERT INTO user (nama, email, password, role, phone, address)
                    VALUES (?, ?, ?, 'nasabah', ?, ?)
                `;

                hashPassword(generatedPassword).then((hashedPassword) => {
                    db.query(
                        insertSql,
                        [googleUser.name, googleUser.email, hashedPassword, phone, address],
                        (insertErr, insertResult) => {
                        if (insertErr) return res.status(500).json(insertErr);

                        const user = {
                            id_user: insertResult.insertId,
                            nama: googleUser.name,
                            email: googleUser.email,
                            role: 'nasabah',
                            phone,
                            address,
                            poin: 0
                        };

                            return res.status(201).json(createAuthResponse(user, 'Registrasi Google berhasil'));
                        }
                    );
                }).catch((hashError) => {
                    return res.status(500).json({
                        message: hashError.message || 'Gagal memproses password akun Google'
                    });
                });
            }
        );
    } catch (error) {
        return res.status(401).json({
            message: error.message || 'Verifikasi akun Google gagal'
        });
    }
};

exports.loginGoogleUser = async (req, res) => {
    try {
        const { credential } = req.body;
        const role = normalizeRole(req.body.role);

        if (role !== 'nasabah') {
            return res.status(400).json({
                message: 'Login Google hanya tersedia untuk nasabah'
            });
        }

        const googleUser = await verifyGoogleCredential(credential);

        db.query(
            "SELECT * FROM user WHERE email = ? AND role = 'nasabah' LIMIT 1",
            [googleUser.email],
            (err, result) => {
                if (err) return res.status(500).json(err);

                if (!result || result.length === 0) {
                    return res.status(404).json({
                        message: 'Akun Google ini belum terdaftar. Silakan daftar terlebih dahulu.',
                        email: googleUser.email,
                        name: googleUser.name
                    });
                }

                return res.json(createAuthResponse(result[0], 'Login Google berhasil'));
            }
        );
    } catch (error) {
        return res.status(401).json({
            message: error.message || 'Verifikasi akun Google gagal'
        });
    }
};

exports.loginAdmin = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: 'Field wajib: email, password'
        });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({
            message: 'Admin wajib menggunakan email yang valid'
        });
    }

    const sql = "SELECT * FROM user WHERE email = ? AND role = 'admin' LIMIT 1";
    db.query(sql, [email], async (err, result) => {
        if (err) return res.status(500).json(err);
        if (!result || result.length === 0) {
            return res.status(401).json({
                message: 'Akun admin tidak ditemukan'
            });
        }

        const user = result[0];
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Password salah'
            });
        }

        if (!isHashedPassword(user.password)) {
            const hashedPassword = await hashPassword(password);
            db.query('UPDATE user SET password = ? WHERE id_user = ?', [hashedPassword, user.id_user]);
            user.password = hashedPassword;
        }

        return res.json(createAuthResponse(user, 'Login admin berhasil'));
    });
};

exports.logoutAdmin = (_req, res) => {
    return res.json({
        message: 'Logout admin berhasil. Hapus token di sisi client.'
    });
};

exports.updateNasabah = (req, res) => {
    const { id } = req.params;
    const { nama, email, phone, address } = req.body;

    db.query(
        `UPDATE user
         SET nama = COALESCE(?, nama),
             email = COALESCE(?, email),
             phone = COALESCE(?, phone),
             address = COALESCE(?, address)
         WHERE id_user = ? AND role = 'nasabah'`,
        [nama, email, phone, address, id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Nasabah tidak ditemukan' });
            }
            return res.json({ message: 'Data nasabah berhasil diupdate' });
        }
    );
};

exports.deleteNasabah = (req, res) => {
    const { id } = req.params;
    db.query(
        `DELETE FROM user WHERE id_user = ? AND role = 'nasabah'`,
        [id],
        (err, result) => {
            if (err) return res.status(500).json(err);
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Nasabah tidak ditemukan' });
            }
            return res.json({ message: 'Nasabah berhasil dihapus' });
        }
    );
};
