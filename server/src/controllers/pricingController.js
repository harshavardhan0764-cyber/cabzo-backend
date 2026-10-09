const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

exports.getPricingRules = async (req, res) => {
    try {
        const [rules] = await db.execute('SELECT * FROM pricing_rules');
        return successResponse(res, rules);
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error fetching pricing rules');
    }
};

exports.updatePricingRule = async (req, res) => {
    try {
        const { base_rate_per_km, min_km_tn, min_km_ap, extra_day_charge } = req.body;
        const vehicle_type = req.params.type; // SEDAN, MPV, INNOVA

        await db.execute(
            'UPDATE pricing_rules SET base_rate_per_km = ?, min_km_tn = ?, min_km_ap = ?, extra_day_charge = ? WHERE vehicle_type = ?',
            [base_rate_per_km, min_km_tn, min_km_ap, extra_day_charge, vehicle_type]
        );

        return successResponse(res, null, 'Pricing updated successfully');
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error updating pricing');
    }
};
