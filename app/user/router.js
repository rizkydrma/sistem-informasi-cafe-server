const router = require('express').Router();
const multer = require('multer');
const userController = require('./controller');
const os = require('os');

router.get('/users', userController.index);
router.get('/users/:id', userController.show);
router.post(
  '/users',
  multer({ dest: os.tmpdir() }).single('image'),
  userController.store,
);
router.put(
  '/users/:id',
  multer({ dest: os.tmpdir() }).single('image'),
  userController.update,
);
router.delete('/users/:id', userController.destroy);

module.exports = router;
