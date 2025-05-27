const express = require('express');
const router = express.Router();
const multer = require('multer');
const CustomerController = require('../controllers/Admin/CustomerController');
const adminauthenticateCustomer = require('../middlewares/adminauthenticateCustomer');

const upload = multer();  // No storage configuration needed for `upload.none()`
router.get('/admin/customer-list', adminauthenticateCustomer, CustomerController.List);
router.get('/admin/customer-create', adminauthenticateCustomer, CustomerController.Create);
router.post('/admin/customer-store',upload.none(), adminauthenticateCustomer, CustomerController.Store);

router.get('/admin/customer-edit/:customerId', adminauthenticateCustomer, CustomerController.Edit);
router.post('/admin/customer-update/:customerId', upload.none(), adminauthenticateCustomer, CustomerController.Update);
router.get('/admin/customer-delete/:customerId', adminauthenticateCustomer, CustomerController.Delete);
router.get('/admin/customer-restore/:customerId', adminauthenticateCustomer, CustomerController.Restore);
router.get('/admin/customer-permanent-delete', adminauthenticateCustomer, CustomerController.PermanentDelete);
router.get('/admin/customer-show/:customerId', adminauthenticateCustomer, CustomerController.Show);
router.get('/admin/customer-course-booking/:customerId', adminauthenticateCustomer, CustomerController.Booking);
router.get('/admin/customer-test-series-booking/:customerId', adminauthenticateCustomer, CustomerController.testSeriesBooking);
module.exports = router;
