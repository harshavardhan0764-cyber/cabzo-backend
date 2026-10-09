const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'cabpro_secure_production_secret_key_9876543210';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

exports.generateToken = (user) => {
    const payload = {
        id: user.id,
        role: user.role || 'CUSTOMER'
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
};

exports.verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
