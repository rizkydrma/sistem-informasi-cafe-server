const router = require('express').Router();
const dashboardController = require('./controller');
const multer = require('multer');
const os = require('os');

router.get('/dashboard', dashboardController.getDataDashboard);

module.exports = router;
