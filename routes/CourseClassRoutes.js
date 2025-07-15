const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");
const upload = multer(); // If you're not using file uploads, keep it basic


const controller = require("../controllers/Admin/CourseClassController");

// List
router.get("/admin/course-class-list", adminauthenticateCustomer, controller.List);

// Create form
router.get("/admin/course-class-create", adminauthenticateCustomer, controller.Create);

// Edit form
router.get(
  "/admin/course-class-edit/:postId",
  adminauthenticateCustomer,
  controller.Edit
);

// Update or Create post
router.post(
  "/admin/course-class-update/:postId?",
  adminauthenticateCustomer,
  upload.none(),
  controller.Update
);

// Soft Delete
router.get(
  "/admin/course-class-delete/:postId",
  adminauthenticateCustomer,
  controller.Delete
);

// Restore (undo soft delete)
router.get(
  "/admin/course-class-restore/:postId",
  adminauthenticateCustomer,
  controller.Restore
);

// Permanent Delete (hard delete)
router.get(
  "/admin/course-class-permanent-delete/:postId",
  adminauthenticateCustomer,
  controller.PermanentDelete
);

// Show details
router.get(
  "/admin/course-class-show/:postId",
  adminauthenticateCustomer,
  controller.Show
);

module.exports = router;
