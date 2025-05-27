
const express = require('express');
const multer = require('multer');
const { setupStorage } = require('../storage'); 
const authenticateCustomer = require('../middlewares/authenticateCustomer');
const authenticateToken = require("../middlewares/authenticateToken");

const router = express.Router();
const ApiController = require('../controllers/Api/v1/ApiController');
const AuthApiController = require('../controllers/Api/v1/AuthApiController');



router.post('/send-otp', AuthApiController.sendOtp); 
router.post('/verify-otp', AuthApiController.verifyOtp); 
router.post('/register', AuthApiController.register); 

router.post('/get-cms',  ApiController.getCms);
router.post('/category-list',  ApiController.categoryList);
router.post('/class-list',  ApiController.courseClassList);
router.post('/center-list',  ApiController.centerList);
router.post('/center-details',  ApiController.centerDetails);
router.post('/home-api', ApiController.homeApi);
router.post('/course-list',  ApiController.courseList);
router.post('/course-details',  ApiController.courseDetails);
router.post('/about-us',  ApiController.aboutUs);
router.post('/coupon-list',  authenticateCustomer,ApiController.couponList);
router.post('/apply-coupon',  authenticateCustomer,ApiController.applyCoupon);
router.post('/create-order', authenticateCustomer, ApiController.createOrder);
router.post('/buy-course', authenticateCustomer, ApiController.buyCourse);

router.post('/test-series-list',  ApiController.testSeriesList);
router.post('/test-series-details',  ApiController.testSeriesDetails);
router.post('/profile', authenticateCustomer, (req, res) => {
  // If middleware assigns req.user:
  res.json({ userId: req.user.id, name: req.user.name });
  
  // If middleware assigns req.customer:
  // res.json({ userId: req.customer.id, name: req.customer.name });
});
// router.get('/home_api', ApiController.home_api);
// router.get('/menu', ApiController.menu);
// router.get('/place', ApiController.place);
// router.get('/restaurant', ApiController.restaurant);
// router.get('/menu-detail', ApiController.menuDetail);


// router.post('/uddate-profile', authenticateCustomer, ApiController.updateProfile);


module.exports = router;
