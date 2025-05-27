const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const FileUploadPath = "public/uploads/service-city/";
const storage = setupStorage(FileUploadPath);
const upload = multer({ storage });

const controller = require("../controllers/Admin/ServiceCityController");

// List
router.get("/admin/service-city-list", adminauthenticateCustomer, controller.List);

// Create form
router.get("/admin/service-city-create", adminauthenticateCustomer, controller.Create);

// Edit form
router.get(
  "/admin/service-city-edit/:postId",
  adminauthenticateCustomer,
  controller.Edit
);

// Update or Create post
router.post(
  "/admin/service-city-update/:postId?",
  adminauthenticateCustomer,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.Update
);

// Soft Delete
router.get(
  "/admin/service-city-delete/:postId",
  adminauthenticateCustomer,
  controller.Delete
);

// Restore (undo soft delete)
router.get(
  "/admin/service-city-restore/:postId",
  adminauthenticateCustomer,
  controller.Restore
);

// Permanent Delete (hard delete)
router.get(
  "/admin/service-city-permanent-delete/:postId",
  adminauthenticateCustomer,
  controller.PermanentDelete
);

// Show details
router.get(
  "/admin/service-city-show/:postId",
  adminauthenticateCustomer,
  controller.Show
);

module.exports = router;
