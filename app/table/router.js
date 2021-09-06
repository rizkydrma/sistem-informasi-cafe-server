const router = require('express').Router();
const tableController = require('./controller');
const multer = require('multer');

router.get('/tables', tableController.index);
router.post('/tables', multer().none(), tableController.store);
router.put('/tables/:id', multer().none(), tableController.update);
router.delete('/tables/:id', tableController.destroy);

module.exports = router;
