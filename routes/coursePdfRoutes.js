const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const controller = require("../controllers/Admin/PdfController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

const fileUploadPath = "public/uploads/course-pdf/";
const fileUploadPathStorage = setupStorage(fileUploadPath);
const fileUploadPathStorageMulter = multer({ storage: fileUploadPathStorage });

router.get(
  "/admin/course-pdf-list/:courseId",
  adminauthenticateCustomer,
  controller.List
);
router.get(
  "/admin/course-pdf-create/:courseId",
  adminauthenticateCustomer,
  controller.Create
);

router.get(
  "/admin/course-pdf-edit/:postId?",
  adminauthenticateCustomer,
  controller.Edit
);

router.post(
  "/admin/course-pdf-update/:postId?",
  adminauthenticateCustomer,
  fileUploadPathStorageMulter.fields([{ name: "pdf", maxCount: 1 }]),
  controller.Update
);

router.get(
  "/admin/course-pdf-delete/:postId",
  adminauthenticateCustomer,
  controller.Delete
);
router.get(
  "/admin/course-pdf-restore/:chapterId",
  adminauthenticateCustomer,
  controller.Restore
);

router.get(
  "/admin/course-pdf-permanent-delete/:chapterId",
  adminauthenticateCustomer,
  controller.PermanentDelete
);

router.get(
  "/admin/course-pdf-show/:postId",
  adminauthenticateCustomer,
  controller.Show
);


module.exports = router;
