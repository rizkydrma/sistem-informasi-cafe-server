const router = require('express').Router();
const multer = require('multer');
const orderController = require('./controller');

router.post('/orders', multer().none(), orderController.store);
router.get('/orders', orderController.index);
router.get('/orders/:id', orderController.show);
router.get('/getOrdersByID/:id', orderController.getOrdersByID);

router.put('/orders/:id', multer().none(), orderController.update);
router.get('/ordersPayment/:id', orderController.updateStatusPaymentsByID);

router.get('/allOrders', orderController.getAllData);

router.get('/generateReport', orderController.generateReport);

router.delete('/orders/:id', orderController.destroy);

module.exports = router;
