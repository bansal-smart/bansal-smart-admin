const express = require('express');
const router = express.Router();
const multer = require('multer');
const CustomerController = require('../controllers/Admin/CustomerController');
const adminauthenticateCustomer = require('../middlewares/adminauthenticateCustomer');

const upload = multer();  // No storage configuration needed for `upload.none()`
router.get('/admin/student-list/:status?', adminauthenticateCustomer, upload.none(),CustomerController.List);
router.post('/admin/student-list/:status?', adminauthenticateCustomer,upload.none(), CustomerController.List);
router.get('/admin/student-create', adminauthenticateCustomer, CustomerController.Create);
router.post('/admin/student-store',upload.none(), adminauthenticateCustomer, CustomerController.Store);

router.get('/admin/student-edit/:customerId', adminauthenticateCustomer, CustomerController.Edit);
router.post('/admin/student-update/:customerId', upload.none(), adminauthenticateCustomer, CustomerController.Update);
router.get('/admin/student-delete/:customerId', adminauthenticateCustomer, CustomerController.Delete);
router.get('/admin/student-restore/:customerId', adminauthenticateCustomer, CustomerController.Restore);
router.get('/admin/student-permanent-delete', adminauthenticateCustomer, CustomerController.PermanentDelete);
router.get('/admin/student-show/:customerId', adminauthenticateCustomer, CustomerController.Show);
router.get('/admin/student-course-booking/:customerId', adminauthenticateCustomer, CustomerController.Booking);
router.get('/admin/student-test-series-booking/:customerId', adminauthenticateCustomer, CustomerController.testSeriesBooking);
module.exports = router;
