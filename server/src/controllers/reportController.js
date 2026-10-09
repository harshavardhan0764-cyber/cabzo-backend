const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

exports.getRevenue = async (req, res) => {
    try {
        const [revenueData] = await db.execute(`
            SELECT DATE(created_at) as date, SUM(amount) as daily_revenue 
            FROM payments 
            WHERE status = 'SUCCESS' 
            GROUP BY DATE(created_at) 
            ORDER BY DATE(created_at) DESC LIMIT 30
        `);
        return successResponse(res, revenueData);
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error fetching revenue report');
    }
};

exports.getBookingsAnalytics = async (req, res) => {
    try {
        const [vehicleTypeStats] = await db.execute(`
            SELECT vehicle_type, COUNT(*) as count 
            FROM bookings 
            GROUP BY vehicle_type
        `);
        
        const [statusStats] = await db.execute(`
            SELECT status, COUNT(*) as count 
            FROM bookings 
            GROUP BY status
        `);

        return successResponse(res, {
            vehicle_type_stats: vehicleTypeStats,
            status_stats: statusStats
        });
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error fetching booking analytics');
    }
};
