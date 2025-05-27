const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const FileUploadPath = "public/uploads/test-series-test/";
const storage = setupStorage(FileUploadPath);
const upload = multer({ storage });

const controller = require("../controllers/Admin/TestSeriesTestController");

// List
router.get(
  "/admin/exam-list",
  adminauthenticateCustomer,
  controller.List
);

// Create form
router.get(
  "/admin/exam-create",
  adminauthenticateCustomer,
  controller.Create
);

// Edit form
router.get(
  "/admin/exam-edit/:postId",
  adminauthenticateCustomer,
  controller.Edit
);

// Update or Create post
router.post(
  "/admin/exam-update/:postId?",
  adminauthenticateCustomer,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.Update
);

// Soft Delete
router.get(
  "/admin/exam-delete/:postId",
  adminauthenticateCustomer,
  controller.Delete
);

// Restore (undo soft delete)
router.get(
  "/admin/exam-restore/:postId",
  adminauthenticateCustomer,
  controller.Restore
);

// Permanent Delete (hard delete)
router.get(
  "/admin/exam-permanent-delete/:postId",
  adminauthenticateCustomer,
  controller.PermanentDelete
);

// Show details
router.get(
  "/admin/exam-show/:postId",
  adminauthenticateCustomer,
  controller.Show
);

module.exports = router;
