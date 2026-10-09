const db = require('../config/database');

exports.calculateFare = async (vehicleType, distanceKm, estimatedDays, destinationState) => {
    const [rows] = await db.execute('SELECT * FROM pricing_rules WHERE vehicle_type = ?', [vehicleType]);
    
    if (rows.length === 0) {
        throw new Error('Pricing rules not found for vehicle type');
    }

    const pricing = rows[0];
    
    // Determine minimum km based on state
    let minKmPerDay = destinationState === 'TN' ? pricing.min_km_tn : pricing.min_km_ap;
    
    // For calculating minimum billable distance across the days
    let minBillableDistance = minKmPerDay * estimatedDays;
    
    // Billable distance is max of actual distance and minimum allowed
    let billableDistance = Math.max(distanceKm, minBillableDistance);
    
    let baseFare = billableDistance * parseFloat(pricing.base_rate_per_km);
    
    let extraDayCharge = 0;
    if (estimatedDays > 1) {
        // e.g. for Innova extra day charge starts from 2nd day, but the rule applies to all vehicle types if extra_day_charge > 0
        extraDayCharge = (estimatedDays - 1) * parseFloat(pricing.extra_day_charge);
    }
    
    let totalFare = baseFare + extraDayCharge;
    
    // Advance is 15% of total fare
    let advanceAmount = totalFare * 0.15;
    
    return {
        totalFare: Math.round(totalFare),
        advanceAmount: Math.round(advanceAmount),
        breakdown: {
            billableDistance,
            baseFare: Math.round(baseFare),
            extraDayCharge: Math.round(extraDayCharge)
        }
    };
};
