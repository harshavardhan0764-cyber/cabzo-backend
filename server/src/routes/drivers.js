const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', authorize('ADMIN'), driverController.getAllDrivers);
router.post('/', authorize('ADMIN'), driverController.createDriver);
router.get('/available', driverController.getAvailableDrivers);
router.get('/:id', driverController.getDriverById);
router.patch('/:id/status', authorize('DRIVER'), driverController.updateDriverStatus);

module.exports = router;
