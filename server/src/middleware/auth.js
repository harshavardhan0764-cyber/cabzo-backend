const jwt = require('../utils/jwt');
const { errorResponse } = require('../utils/response');

exports.authenticate = (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return errorResponse(res, 'Not authorized to access this route', 401);
        }

        const decoded = jwt.verifyToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        return errorResponse(res, 'Not authorized to access this route', 401);
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return errorResponse(res, `User role ${req.user.role} is not authorized to access this route`, 403);
        }
        next();
    };
};
