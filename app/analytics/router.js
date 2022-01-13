const router = require('express').Router();
const analyticsController = require('./controller');

router.get('/analyticsTrend', analyticsController.getAnalytics);
router.get('/analyticsProduct', analyticsController.getAnalyticsProduct);
router.get('/analyticsOneProduct', analyticsController.getAnalyticsOneProduct);

module.exports = router;
