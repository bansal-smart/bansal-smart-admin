const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const CourseController = require("../controllers/Admin/CourseController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

const courseUploadPath = "public/uploads/courses/";
const courseUploadStorage = setupStorage(courseUploadPath);
const courseUploadMulter = multer({ storage: courseUploadStorage });

router.route("/admin/course-list/:course_type")
  .get(adminauthenticateCustomer, CourseController.List)
  .post(adminauthenticateCustomer, CourseController.List);
router.get(
  "/admin/course-create",
  adminauthenticateCustomer,
  CourseController.Create
);

router.get(
  "/admin/course-edit/:courseId",
  adminauthenticateCustomer,
  CourseController.Edit
);

router.post(
  "/admin/course-update/:courseId?",
  adminauthenticateCustomer,
  courseUploadMulter.fields([
    { name: "image", maxCount: 1 },
    { name: "details_image", maxCount: 1 },
    { name: "brochure", maxCount: 1 },
  ]),
  CourseController.Update
);
// Define the route to update course
// router.post('/admin/course-update/:courseId',
//   upload.none(),  // Handle form data (no files)
//   adminauthenticateCustomer,  // Authenticate the customer
//   courseUpload,  // Handle file uploads (multiple images for the course)
//   CourseController.Update  // The controller function to update the course
// );

router.get(
  "/admin/course-delete/:courseId",
  adminauthenticateCustomer,
  CourseController.Delete
);
router.get(
  "/admin/course-restore",
  adminauthenticateCustomer,
  CourseController.Restore
);
router.get(
  "/admin/course-permanent-delete",
  adminauthenticateCustomer,
  CourseController.PermanentDelete
);
router.get(
  "/admin/course-show/:courseId",
  adminauthenticateCustomer,
  CourseController.Show
);

router.get(
  "/admin/course-booking-list/:courseId",
  adminauthenticateCustomer,
  CourseController.Booking
);
module.exports = router;
