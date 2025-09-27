const jwt = require('jsonwebtoken');
const db = require('../models/database'); // Impor koneksi database

const verifyToken = (req, res, next) => {
    let token;
    const authHeader = req.headers['authorization'];
    
    if (authHeader) {
        token = authHeader.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Token tidak ditemukan. Akses ditolak.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                const refreshToken = req.cookies.refreshToken;
                if (!refreshToken) {
                    return res.status(401).json({ message: 'Sesi berakhir. Silakan login kembali.' });
                }

                jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (errRefresh, decodedRefresh) => {
                    if (errRefresh) {
                        return res.status(401).json({ message: 'Sesi berakhir. Silakan login kembali.' });
                    }

                    try {
                        const connection = await db;
                        const [users] = await connection.execute(
                            'SELECT name, role FROM users WHERE id = ?',
                            [decodedRefresh.userId]
                        );

                        if (users.length === 0) {
                            return res.status(401).json({ message: 'User tidak ditemukan.' });
                        }
                        const user = users[0];

                        const newAccessToken = jwt.sign(
                            {
                                userId: decodedRefresh.userId,
                                name: user.name, // Gunakan data dari DB
                                role: user.role  // Gunakan data dari DB
                            },
                            process.env.JWT_SECRET,
                            { expiresIn: '15m' }
                        );

                        res.cookie('token', newAccessToken, {
                            expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
                        });

                        req.headers['authorization'] = `Bearer ${newAccessToken}`;
                        req.user = { userId: decodedRefresh.userId, name: user.name, role: user.role };
                        
                        next();
                    } catch (dbError) {
                        return res.status(500).json({ message: 'Database error saat refresh token.' });
                    }
                });
            } else {
                return res.status(403).json({ message: 'Token tidak valid.' });
            }
        } else {
            req.user = decoded;
            next();
        }
    });
};

module.exports = verifyToken;
