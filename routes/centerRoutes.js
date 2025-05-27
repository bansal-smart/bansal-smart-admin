const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const FileUploadPath = "public/uploads/centers/";
const storage = setupStorage(FileUploadPath);
const upload = multer({ storage });

const controller = require("../controllers/Admin/CenterController");

// List
router.get(
  "/admin/center-list",
  adminauthenticateCustomer,
  controller.List
);

// Create form
router.get(
  "/admin/center-create",
  adminauthenticateCustomer,
  controller.Create
);

// Edit form
router.get(
  "/admin/center-edit/:postId",
  adminauthenticateCustomer,
  controller.Edit
);

// Update or Create post
router.post(
  "/admin/center-update/:postId?",
  adminauthenticateCustomer,
  upload.fields([{ name: "logo", maxCount: 1 }]),
  controller.Update
);

// Soft Delete
router.get(
  "/admin/center-delete/:postId",
  adminauthenticateCustomer,
  controller.Delete
);

// Restore (undo soft delete)
router.get(
  "/admin/center-restore/:postId",
  adminauthenticateCustomer,
  controller.Restore
);

// Permanent Delete (hard delete)
router.get(
  "/admin/center-permanent-delete/:postId",
  adminauthenticateCustomer,
  controller.PermanentDelete
);

// Show details
router.get(
  "/admin/center-show/:postId",
  adminauthenticateCustomer,
  controller.Show
);

module.exports = router;
