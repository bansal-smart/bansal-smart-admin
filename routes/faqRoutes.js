const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const FileUploadPath = "public/uploads/faq/";
const storage = setupStorage(FileUploadPath);
const upload = multer({ storage });

const controller = require("../controllers/Admin/FaqController");

// List
router.get("/admin/faq-list", adminauthenticateCustomer, controller.List);

// Create form
router.get("/admin/faq-create", adminauthenticateCustomer, controller.Create);

// Edit form
router.get(
  "/admin/faq-edit/:postId",
  adminauthenticateCustomer,
  controller.Edit
);

// Update or Create post
router.post(
  "/admin/faq-update/:postId?",
  adminauthenticateCustomer,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.Update
);

// Soft Delete
router.get(
  "/admin/faq-delete/:postId",
  adminauthenticateCustomer,
  controller.Delete
);

// Restore (undo soft delete)
router.get(
  "/admin/faq-restore/:postId",
  adminauthenticateCustomer,
  controller.Restore
);

// Permanent Delete (hard delete)
router.get(
  "/admin/faq-permanent-delete/:postId",
  adminauthenticateCustomer,
  controller.PermanentDelete
);

// Show details
router.get(
  "/admin/faq-show/:postId",
  adminauthenticateCustomer,
  controller.Show
);

module.exports = router;
