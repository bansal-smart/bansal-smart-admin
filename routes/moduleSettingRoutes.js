const express = require('express');
const router = express.Router();
const { setupStorage } = require('../storage'); 
const multer = require('multer');
const ModuleSettingController = require('../controllers/Admin/ModuleSettingController');
const adminauthenticateCustomer = require('../middlewares/adminauthenticateCustomer');
router.get('/admin/about_us', adminauthenticateCustomer, ModuleSettingController.Edit);
router.get('/admin/privacy_policy', adminauthenticateCustomer, ModuleSettingController.Edit);
router.get('/admin/terms_&_condition', adminauthenticateCustomer, ModuleSettingController.Edit);
router.get('/admin/contact_us', adminauthenticateCustomer, ModuleSettingController.Edit);
router.get('/admin/fcm_server_key', adminauthenticateCustomer, ModuleSettingController.Edit);
router.get('/admin/why_choose_us', adminauthenticateCustomer, ModuleSettingController.Edit);
router.get('/admin/payment_settings', adminauthenticateCustomer, ModuleSettingController.Edit);
router.get('/admin/return_&_refund_policy', adminauthenticateCustomer, ModuleSettingController.Edit);
router.get('/admin/cancellation_policy', adminauthenticateCustomer, ModuleSettingController.Edit);
router.get('/admin/logos', adminauthenticateCustomer, ModuleSettingController.Edit);

module.exports = router;
