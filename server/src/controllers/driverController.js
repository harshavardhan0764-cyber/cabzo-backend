const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

exports.getAllDrivers = async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.name, u.phone, u.status, d.vehicle_model, d.vehicle_type, d.vehicle_number, d.availability_status
            FROM users u
            JOIN driver_profiles d ON u.id = d.user_id
            WHERE u.role = 'DRIVER'
        `;
        const [drivers] = await db.execute(query);
        return successResponse(res, drivers);
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error fetching drivers');
    }
};

exports.getAvailableDrivers = async (req, res) => {
    try {
        const { vehicle_type } = req.query;
        let query = `
            SELECT u.id, u.name, u.phone, d.vehicle_model, d.vehicle_type, d.vehicle_number, d.current_lat, d.current_lng
            FROM users u
            JOIN driver_profiles d ON u.id = d.user_id
            WHERE u.role = 'DRIVER' AND u.status = 'ACTIVE' AND d.availability_status = 'AVAILABLE'
        `;
        let params = [];
        if (vehicle_type) {
            query += ` AND d.vehicle_type = ?`;
            params.push(vehicle_type);
        }
        
        const [drivers] = await db.execute(query, params);
        return successResponse(res, drivers);
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error fetching available drivers');
    }
};

exports.getDriverById = async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.name, u.phone, u.email, u.status, d.*
            FROM users u
            LEFT JOIN driver_profiles d ON u.id = d.user_id
            WHERE u.id = ? AND u.role = 'DRIVER'
        `;
        const [users] = await db.execute(query, [req.params.id]);
        if (users.length === 0) {
            return errorResponse(res, 'Driver not found', 404);
        }
        return successResponse(res, users[0]);
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error fetching driver');
    }
};

exports.createDriver = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { name, phone, email, license_number, vehicle_model, vehicle_type, vehicle_number } = req.body;
        
        const [userResult] = await connection.execute(
            'INSERT INTO users (name, phone, email, role) VALUES (?, ?, ?, ?)',
            [name, phone, email, 'DRIVER']
        );
        const userId = userResult.insertId;

        await connection.execute(
            'INSERT INTO driver_profiles (user_id, license_number, vehicle_model, vehicle_type, vehicle_number) VALUES (?, ?, ?, ?, ?)',
            [userId, license_number, vehicle_model, vehicle_type, vehicle_number]
        );

        await connection.commit();
        return successResponse(res, { id: userId }, 'Driver created successfully', 201);
    } catch (error) {
        await connection.rollback();
        console.error(error);
        return errorResponse(res, 'Error creating driver');
    } finally {
        connection.release();
    }
};

exports.updateDriverStatus = async (req, res) => {
    try {
        const { status } = req.body; // AVAILABLE, BUSY, OFFLINE
        await db.execute('UPDATE driver_profiles SET availability_status = ? WHERE user_id = ?', [status, req.user.id]);
        return successResponse(res, null, 'Status updated');
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error updating status');
    }
};
