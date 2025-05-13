
const express = require('express');
const multer = require('multer');
const { setupStorage } = require('../storage'); 
const authenticateCustomer = require('../middlewares/authenticateCustomer');


const router = express.Router();
const ApiController = require('../controllers/Api/v1/ApiController');
const AuthApiController = require('../controllers/Api/v1/AuthApiController');



router.post('/send-otp', AuthApiController.sendOtp); 
router.post('/verify-otp', AuthApiController.verifyOtp); 

router.post('/restaurant-register', AuthApiController.restaurantRegister);


router.get('/home_api', ApiController.home_api);
router.get('/menu', ApiController.menu);
router.get('/place', ApiController.place);
router.get('/restaurant', ApiController.restaurant);
router.get('/menu-detail', ApiController.menuDetail);

router.post('/cart-list', authenticateCustomer, ApiController.cartlist);
router.post('/add-cart', authenticateCustomer, ApiController.Addcart);
router.post('/create-order', authenticateCustomer, ApiController.CreateOrder);
// router.post('/order-list', authenticateCustomer, ApiController.orderList);
// router.post('/order-detail', authenticateCustomer, ApiController.orderDetail);

module.exports = router;
