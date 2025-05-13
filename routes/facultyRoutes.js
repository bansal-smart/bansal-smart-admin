const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const facultyController = require("../controllers/Admin/FacultyController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

const fileUploadPath = "public/uploads/faculty/";
const fileUploadPathStorage = setupStorage(fileUploadPath);
const fileUploadPathStorageMulter = multer({ storage: fileUploadPathStorage });

router.get(
  "/admin/faculty-list",
  adminauthenticateCustomer,
  facultyController.List
);
router.get(
  "/admin/faculty-create",
  adminauthenticateCustomer,
  facultyController.Create
);

router.get(
  "/admin/faculty-edit/:postId?",
  adminauthenticateCustomer,
  facultyController.Edit
);

router.post(
  "/admin/faculty-update/:postId?",
  adminauthenticateCustomer,
  fileUploadPathStorageMulter.fields([{ name: "image", maxCount: 1 }]),
  facultyController.Update
);

router.get(
  "/admin/faculty-delete/:postId",
  adminauthenticateCustomer,
  facultyController.Delete
);
router.get(
  "/admin/faculty-restore",
  adminauthenticateCustomer,
  facultyController.Restore
);
router.get(
  "/admin/faculty-permanent-delete",
  adminauthenticateCustomer,
  facultyController.PermanentDelete
);
router.get(
  "/admin/faculty-show/:postId",
  adminauthenticateCustomer,
  facultyController.Show
);

module.exports = router;
