const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', pricingController.getPricingRules);
router.put('/:type', authenticate, authorize('ADMIN'), pricingController.updatePricingRule);

module.exports = router;
