const express = require('express');
const router = express.Router();
const { setupStorage } = require('../storage'); 
const multer = require('multer');
const AuthController = require('../controllers/Admin/AuthController');
const IndexController = require('../controllers/Admin/IndexController');
const adminauthenticateCustomer = require('../middlewares/adminauthenticateCustomer');

const upload = multer();  // No storage configuration needed for `upload.none()`
router.get('/admin/login', AuthController.login);
router.post('/admin/postlogin', AuthController.Postlogin);
router.get('/admin/logout', AuthController.Logout);
router.get('/admin/dashboard', adminauthenticateCustomer, IndexController.dashboard);

module.exports = router;
