const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const courseSubjectController = require("../controllers/Admin/CourseSubjectController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

const fileUploadPath = "public/uploads/course-subjects/";
const fileUploadPathStorage = setupStorage(fileUploadPath);
const fileUploadPathStorageMulter = multer({ storage: fileUploadPathStorage });

router.get(
  "/admin/course-subject-list/:postId",
  adminauthenticateCustomer,
  courseSubjectController.List
);
router.get(
  "/admin/course-subject-create/:postId",
  adminauthenticateCustomer,
  courseSubjectController.Create
);

router.get(
  "/admin/course-subject-edit/:postId?",
  adminauthenticateCustomer,
  courseSubjectController.Edit
);

router.post(
  "/admin/course-subject-update/:postId?",
  adminauthenticateCustomer,
  fileUploadPathStorageMulter.fields([{ name: "course_subject", maxCount: 1 }]),
  courseSubjectController.Update
);

router.get(
  "/admin/course-subject-delete/:postId",
  adminauthenticateCustomer,
  courseSubjectController.Delete
);

router.get(
  "/admin/course-subject-restore/:chapterId",
  adminauthenticateCustomer,
  courseSubjectController.Restore
);

router.get(
  "/admin/course-subject-permanent-delete/:chapterId",
  adminauthenticateCustomer,
  courseSubjectController.PermanentDelete
);

router.get(
  "/admin/course-subject-show/:postId",
  adminauthenticateCustomer,
  courseSubjectController.Show
);

router.get(
  "/admin/course-subject-get-chapters/:postId",
  adminauthenticateCustomer,
  courseSubjectController.getChapters
);

module.exports = router;
