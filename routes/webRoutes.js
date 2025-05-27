const express = require("express");
const multer = require("multer");
const { setupStorage } = require("../storage");
const router = express.Router();
const ModuleSettingController = require("../controllers/Admin/ModuleSettingController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");
const categoryRoute = require("../routes/categoryRoutes");
const courseRoutes = require("../routes/courseRoutes");
const serviceRoutes = require("../routes/serviceRoutes");
const couponRoutes = require("../routes/couponRoutes");
const customerRoutes = require("../routes/customerRoutes");
const adminLoginRoutes = require("../routes/adminLoginRoutes");
const facultyRoutes = require("../routes/facultyRoutes");
const bannerRoutes = require("../routes/bannerRoutes");
const rolePermissionRoutes = require("../routes/roleRoutes");
const testSeriesRoute = require("../routes/testSeriesRoutes");
const filterRoutes = require("../routes/filterRoute");
const cmsRoute = require("../routes/cmsRoute");
const moduleSettingRoutes = require("../routes/moduleSettingRoutes");
const faqRoutes = require("../routes/faqRoutes");
const serviceCityRoutes = require("../routes/serviceCityRoutes");
const examRoute = require("../routes/examRoutes");
const blogRoute = require("../routes/blogRoutes");
const courseSubjectRoutes = require("../routes/courseSubjectRoutes");
const courseChapterRoutes = require("../routes/courseChapterRoutes");
const coursePDFRoutes = require("./coursePdfRoutes");
const courseVideoRoutes = require("./courseVideoRoutes");
const courseTopicRoute = require("../routes/courseTopicRoutes");
const centerRoutes = require("../routes/centerRoutes");
const bookingRoutes = require("../routes/bookingRoutes");

router.use(adminLoginRoutes);
router.use(customerRoutes);
router.use(customerRoutes);
router.use(categoryRoute);
router.use(courseRoutes);
router.use(serviceRoutes);
router.use(couponRoutes);
router.use(couponRoutes);
router.use(facultyRoutes);
router.use(bannerRoutes);
router.use(rolePermissionRoutes);
router.use(testSeriesRoute);
router.use(examRoute);
router.use(cmsRoute);
router.use(filterRoutes);
router.use(faqRoutes);
router.use(blogRoute);
router.use(courseSubjectRoutes);
router.use(courseChapterRoutes);
router.use(coursePDFRoutes);
router.use(courseTopicRoute);
router.use(centerRoutes);
router.use(courseVideoRoutes);
router.use(bookingRoutes);
router.use(serviceCityRoutes);
const web_logoUploadPath = "uploads/logo/";
const web_logoStorage = setupStorage(web_logoUploadPath);
const web_logoUpload = multer({ storage: web_logoStorage });

const web_faviconUploadPath = "uploads/favicon/";
const web_faviconStorage = setupStorage(web_faviconUploadPath);
const web_faviconUpload = multer({ storage: web_faviconStorage });

router.post(
  "/admin/module_settings/update",
  adminauthenticateCustomer,
  web_logoUpload.array("web_logo"),
  web_faviconUpload.array("web_favicon"),
  ModuleSettingController.Update
);

module.exports = router;
