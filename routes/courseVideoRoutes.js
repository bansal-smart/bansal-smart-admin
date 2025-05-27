const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const courseVideoController = require("../controllers/Admin/courseVideoController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

const fileUploadPath = "public/uploads/course-video/";
const fileUploadPathStorage = setupStorage(fileUploadPath);
const fileUploadPathStorageMulter = multer({ storage: fileUploadPathStorage });

router.get(
  "/admin/course-video-list/:courseId",
  adminauthenticateCustomer,
  courseVideoController.List
);
router.get(
  "/admin/course-video-create/:courseId",
  adminauthenticateCustomer,
  courseVideoController.Create
);

router.get(
  "/admin/course-video-edit/:postId?",
  adminauthenticateCustomer,
  courseVideoController.Edit
);

router.post(
  "/admin/course-video-update/:postId?",
  adminauthenticateCustomer,
  fileUploadPathStorageMulter.fields([{ name: "video", maxCount: 1 }]),
  courseVideoController.Update
);

router.get(
  "/admin/course-video-delete/:postId",
  adminauthenticateCustomer,
  courseVideoController.Delete
);
router.get(
  "/admin/course-video-restore/:chapterId",
  adminauthenticateCustomer,
  courseVideoController.Restore
);

router.get(
  "/admin/course-video-permanent-delete/:chapterId",
  adminauthenticateCustomer,
  courseVideoController.PermanentDelete
);

router.get(
  "/admin/course-video-show/:postId",
  adminauthenticateCustomer,
  courseVideoController.Show
);


module.exports = router;
