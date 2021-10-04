const router = require('express').Router();
const multer = require('multer');
const likedController = require('./controller');

router.get('/liked', likedController.index);
router.put('/liked', multer().none(), likedController.update);

module.exports = router;
