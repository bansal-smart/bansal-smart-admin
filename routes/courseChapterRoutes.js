const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const courseChapterController = require("../controllers/Admin/CourseChapterController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

const fileUploadPath = "public/uploads/course-chapters/";
const fileUploadPathStorage = setupStorage(fileUploadPath);
const fileUploadPathStorageMulter = multer({ storage: fileUploadPathStorage });

router.get(
  "/admin/course-chapter-list/:postId",
  adminauthenticateCustomer,
  courseChapterController.List
);
router.get(
  "/admin/course-chapter-create/:postId",
  adminauthenticateCustomer,
  courseChapterController.Create
);

router.get(
  "/admin/course-chapter-edit/:postId?",
  adminauthenticateCustomer,
  courseChapterController.Edit
);

router.post(
  "/admin/course-chapter-update/:postId?",
  adminauthenticateCustomer,
  fileUploadPathStorageMulter.fields([{ name: "course-chapter", maxCount: 1 }]),
  courseChapterController.Update
);

router.get(
  "/admin/course-chapter-delete/:postId",
  adminauthenticateCustomer,
  courseChapterController.Delete
);
router.get(
  "/admin/course-chapter-restore/:chapterId",
  adminauthenticateCustomer,
  courseChapterController.Restore
);

router.get(
  "/admin/course-chapter-permanent-delete/:chapterId",
  adminauthenticateCustomer,
  courseChapterController.PermanentDelete
);

router.get(
  "/admin/course-chapter-show/:postId",
  adminauthenticateCustomer,
  courseChapterController.Show
);


module.exports = router;
