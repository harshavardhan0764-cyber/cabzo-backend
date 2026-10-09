const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');

exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const extractedErrors = [];
        errors.array().map(err => extractedErrors.push({ [err.path]: err.msg }));
        return errorResponse(res, 'Validation failed', 422, extractedErrors);
    }
    next();
};
