const router = require('express').Router();
const analyticsController = require('./controller');

router.get('/analyticsTrend', analyticsController.getAnalytics);

module.exports = router;
