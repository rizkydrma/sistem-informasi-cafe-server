const router = require('express').Router();
const multer = require('multer');
const orderController = require('./controller');

router.post('/orders', multer().none(), orderController.store);
router.get('/orders', orderController.index);
router.get('/orders/:order_id', orderController.show);

router.get('/allOrders', orderController.getAllData);

module.exports = router;
