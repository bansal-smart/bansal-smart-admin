const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const Controller = require("../controllers/Admin/AchievementController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // For upload.none()

const fileUploadPath = "public/uploads/achievement/";
const fileUploadPathStorage = setupStorage(fileUploadPath);
const fileUploadPathStorageMulter = multer({ storage: fileUploadPathStorage });

const route = "achievement";

// List
router.get(
  `/admin/${route}-list`,
  adminauthenticateCustomer,
  Controller.List
);

// Create
router.get(
  `/admin/${route}-create`,
  adminauthenticateCustomer,
  Controller.Create
);

// Store
router.post(
  `/admin/${route}-store`,
  adminauthenticateCustomer,
  fileUploadPathStorageMulter.array("gallery", 10),
  Controller.Store
);

// Delete (soft delete)
router.get(
  `/admin/${route}-delete/:postId`,
  adminauthenticateCustomer,
  Controller.Delete
);

// Restore
router.get(
  `/admin/${route}-restore`,
  adminauthenticateCustomer,
  Controller.Restore
);

// Permanent Delete
router.get(
  `/admin/${route}-permanent-delete`,
  adminauthenticateCustomer,
  Controller.PermanentDelete
);

module.exports = router;
