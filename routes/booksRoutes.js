const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const controller = require("../controllers/Admin/BookController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

const UploadPath = "public/uploads/books/";
const UploadStorage = setupStorage(UploadPath);
const UploadMulter = multer({ storage: UploadStorage });

router
  .route("/admin/book-list/:type?")
  .get(adminauthenticateCustomer, controller.List)
  .post(adminauthenticateCustomer, controller.List);

router.get("/admin/book-create", adminauthenticateCustomer, controller.Create);

router.get(
  "/admin/book-edit/:postId",
  adminauthenticateCustomer,
  controller.Edit
);

router.post(
  "/admin/book-update/:postId?",
  adminauthenticateCustomer,
  UploadMulter.fields([
    { name: "image", maxCount: 1 },
    { name: "details_image", maxCount: 1 },
    { name: "brochure", maxCount: 1 },
  ]),
  controller.Update
);
// Define the route to update course
// router.post('/admin/course-update/:courseId',
//   upload.none(),  // Handle form data (no files)
//   adminauthenticateCustomer,  // Authenticate the customer
//   courseUpload,  // Handle file uploads (multiple images for the course)
//   CourseController.Update  // The controller function to update the course
// );

router.get(
  "/admin/book-delete/:postId",
  adminauthenticateCustomer,
  controller.Delete
);
router.get(
  "/admin/book-restore/:postId",
  adminauthenticateCustomer,
  controller.Restore
);
router.get(
  "/admin/book-permanent-delete/:postId",
  adminauthenticateCustomer,
  controller.PermanentDelete
);
router.get(
  "/admin/book-show/:postId",
  adminauthenticateCustomer,
  controller.Show
);

router.get(
  "/admin/book-booking-list/:postId?",
  adminauthenticateCustomer,
  controller.Booking
);
module.exports = router;
