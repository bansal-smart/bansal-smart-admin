const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const FileUploadPath = "public/uploads/test-series/";
const storage = setupStorage(FileUploadPath);
const upload = multer({ storage });

const controller = require("../controllers/Admin/TestSeriesController");

// List
router.get(
  "/admin/test-series-list",
  adminauthenticateCustomer,
  controller.List
);

// Create form
router.get(
  "/admin/test-series-create",
  adminauthenticateCustomer,
  controller.Create
);

// Edit form
router.get(
  "/admin/test-series-edit/:postId",
  adminauthenticateCustomer,
  controller.Edit
);

// Update or Create post
router.post(
  "/admin/test-series-update/:postId?",
  adminauthenticateCustomer,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "details_image", maxCount: 1 },
  ]),
  controller.Update
);

// Soft Delete
router.get(
  "/admin/test-series-delete/:postId",
  adminauthenticateCustomer,
  controller.Delete
);

// Restore (undo soft delete)
router.get(
  "/admin/test-series-restore/:postId",
  adminauthenticateCustomer,
  controller.Restore
);

// Permanent Delete (hard delete)
router.get(
  "/admin/test-series-permanent-delete/:postId",
  adminauthenticateCustomer,
  controller.PermanentDelete
);

// Show details
router.get(
  "/admin/test-series-show/:postId",
  adminauthenticateCustomer,
  controller.Show
);

module.exports = router;
