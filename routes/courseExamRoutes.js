const express = require("express");
const router = express.Router();
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");
const { setupStorage } = require("../storage");
const controller = require("../controllers/Admin/CourseExamController");

// Define file upload path and multer storage
const FileUploadPath = "public/uploads/course-exam/";
const storage = setupStorage(FileUploadPath);
const upload = multer({ storage });

// Routes

// List all exams (active or trashed via query)
router.get(
  "/admin/course-exam-list/:postId",
  adminauthenticateCustomer,
  controller.List
);

// Show form to create a new exam
router.get(
  "/admin/course-exam-create/:postId",
  adminauthenticateCustomer,
  controller.Create
);

// Show form to edit an existing exam
router.get(
  "/admin/course-exam-edit/:postId",
  adminauthenticateCustomer,
  controller.Edit
);

// Handle form submit for creating or updating exam
// Accepts optional :postId param to update existing exam
// Supports image upload (single image with field name 'image')
router.post(
  "/admin/course-exam-update/:postId?",
  adminauthenticateCustomer,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.Update
);


router.post(
  "/admin/course-exam-store/:courseId?",
  adminauthenticateCustomer,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.Store
);
// Soft delete an exam (move to trash)
router.get(
  "/admin/course-exam-delete/:postId",
  adminauthenticateCustomer,
  controller.Delete
);

// Restore a soft-deleted exam from trash
router.get(
  "/admin/course-exam-restore/:postId",
  adminauthenticateCustomer,
  controller.Restore
);

// Permanently delete an exam
router.get(
  "/admin/course-exam-permanent-delete/:postId",
  adminauthenticateCustomer,
  controller.PermanentDelete
);

// Show exam details page
router.get(
  "/admin/course-exam-show/:postId",
  adminauthenticateCustomer,
  controller.Show
);

// Upload questions document (expects single file with field name 'docFile')
router.post(
  "/admin/course-exam-question-upload",
  adminauthenticateCustomer,
  upload.single("docFile"),
  controller.QuestionUpload
);

router.post(
  "/admin/course-exam-upload",
  adminauthenticateCustomer,
  upload.single("docFile"),
  controller.QuestionUpload
);
// List uploaded questions (assuming implemented in controller)
router.get(
  "/admin/course-exam-question-list/:postId?",
  adminauthenticateCustomer,
  controller.QuestionList
);
// router.get(
//   "/admin/exam-question/edit/:questionId",
//   adminauthenticateCustomer,
//   controller.editQuestion
// );
// router.post(
//   "/admin/exam-question/update/:questionId",
//   adminauthenticateCustomer,
//   controller.updateQuestion
// );
// router.get(
//   "/admin/exam-question/show/:questionId",
//   adminauthenticateCustomer,
//   controller.showQuestion
// );
// router.get(
//   "/admin/exam-question/delete/:questionId",
//   adminauthenticateCustomer,
//   controller.deleteQuestion
// );

router.get(
  "/admin/course-exam-result-analysis/:postId?",
  adminauthenticateCustomer,
  controller.ExamAnalysis
);


module.exports = router;
