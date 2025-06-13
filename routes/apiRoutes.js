
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
router.post('/course-list-app',  ApiController.courseListForApp);
router.post('/course-details',  ApiController.courseDetails);
router.post('/blog-list',  ApiController.blogList);
router.post('/blog-details',  ApiController.blogDetails);
router.post('/about-us',  ApiController.aboutUs);
router.post('/contact-data', ApiController.contactData)
router.post('/coupon-list',  authenticateCustomer,ApiController.couponList);
router.post('/apply-coupon',  authenticateCustomer,ApiController.applyCoupon);
router.post('/create-order', authenticateCustomer, ApiController.createOrder);
router.post('/buy-course', authenticateCustomer, ApiController.buyCourse);
router.post('/buy-live-test', authenticateCustomer, ApiController.buyLiveTest);
router.post('/test-series-list',  ApiController.testSeriesList);
router.post('/test-series-list-with-category',  ApiController.testSeriesWithCategoryList);
router.post('/test-series-details',  ApiController.testSeriesDetails);


router.post('/live-test-list',  ApiController.liveTestListing);
router.post('/live-test-details',  ApiController.liveTestDetails);

router.post('/profile', authenticateCustomer, (req, res) => {
  // If middleware assigns req.user:
  res.json({ userId: req.user.id, name: req.user.name });

  
  
  // If middleware assigns req.customer:
  // res.json({ userId: req.customer.id, name: req.customer.name });
});



const FileUploadPath = `public/uploads/users/`;
const storage = setupStorage(FileUploadPath);
const upload = multer({ storage });


router.post('/my-course', authenticateCustomer, ApiController.myCourse)
router.post('/my-test-series', authenticateCustomer, ApiController.myTestSeries)
router.post('/my-profile', authenticateCustomer, ApiController.myProfile)
router.post('/update-profile', authenticateCustomer, ApiController.updateProfile)
router.post('/update-profile-image', upload.single('profile_pic'),authenticateCustomer, ApiController.updateProfileImage);
router.post('/my-order', authenticateCustomer, ApiController.myOrder)
router.post('/study-material', authenticateCustomer, ApiController.getStudyMaterialsBySubject)

router.post('/exam-list', authenticateCustomer, ApiController.examList)
router.post('/course-exam-list', authenticateCustomer, ApiController.courseExamList)
router.post('/exam-details', authenticateCustomer, ApiController.examDetails)
router.post('/get-question', authenticateCustomer, ApiController.getQuestion)

router.post('/submit-live-test', authenticateCustomer, ApiController.submitLiveTest)
router.post('/submit-final-live-test', authenticateCustomer, ApiController.submitFinalLiveTest)
router.post('/live-test-result', authenticateCustomer, ApiController.liveTestResult)

router.post('/exam-attemp-history', authenticateCustomer, ApiController.examAttemptHistory )

router.post('/notification-list', authenticateCustomer, ApiController.NotificationList )
// router.get('/home_api', ApiController.home_api);
// router.get('/menu', ApiController.menu);
// router.get('/place', ApiController.place);
// router.get('/restaurant', ApiController.restaurant);
// router.get('/menu-detail', ApiController.menuDetail);


// router.post('/uddate-profile', authenticateCustomer, ApiController.updateProfile);


module.exports = router;
