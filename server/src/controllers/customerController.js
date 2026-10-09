const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

exports.getAllCustomers = async (req, res) => {
    try {
        const [customers] = await db.execute('SELECT id, name, phone, email, status, created_at FROM users WHERE role = ?', ['CUSTOMER']);
        return successResponse(res, customers);
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error fetching customers');
    }
};

exports.getCustomerById = async (req, res) => {
    try {
        const [users] = await db.execute('SELECT id, name, phone, email, status, created_at FROM users WHERE id = ? AND role = ?', [req.params.id, 'CUSTOMER']);
        if (users.length === 0) {
            return errorResponse(res, 'Customer not found', 404);
        }
        return successResponse(res, users[0]);
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error fetching customer');
    }
};

exports.updateCustomer = async (req, res) => {
    try {
        const { name, email } = req.body;
        await db.execute('UPDATE users SET name = ?, email = ? WHERE id = ? AND role = ?', [name, email, req.params.id, 'CUSTOMER']);
        return successResponse(res, null, 'Customer updated successfully');
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error updating customer');
    }
};

exports.getCustomerBookings = async (req, res) => {
    try {
        const [bookings] = await db.execute('SELECT * FROM bookings WHERE customer_id = ? ORDER BY created_at DESC', [req.params.id]);
        return successResponse(res, bookings);
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error fetching bookings');
    }
};
