const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const route = "blog"; // Dynamic route module
const controllerName = "Blog";
const FileUploadPath = `public/uploads/blogs/`;
const storage = setupStorage(FileUploadPath);
const upload = multer({ storage });

const controller = require(`../controllers/Admin/${controllerName}Controller`);

// List
router.get(`/admin/${route}-list`, adminauthenticateCustomer, controller.List);

// Create
router.get(
  `/admin/${route}-create`,
  adminauthenticateCustomer,
  controller.Create
);

// Edit
router.get(
  `/admin/${route}-edit/:postId`,
  adminauthenticateCustomer,
  controller.Edit
);

// Create/Update
router.post(
  `/admin/${route}-update/:postId?`,
  adminauthenticateCustomer,
  upload.fields([
    { name: "image", maxCount: 1 },
  ]),
  controller.Update
);

// Soft delete
router.get(
  `/admin/${route}-delete/:postId`,
  adminauthenticateCustomer,
  controller.Delete
);

// Restore
router.get(
  `/admin/${route}-restore/:postId`,
  adminauthenticateCustomer,
  controller.Restore
);

// Permanent delete
router.get(
  `/admin/${route}-permanent-delete/:postId`,
  adminauthenticateCustomer,
  controller.PermanentDelete
);

// Show
router.get(
  `/admin/${route}-show/:postId`,
  adminauthenticateCustomer,
  controller.Show
);

module.exports = router;
