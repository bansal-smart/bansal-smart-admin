const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const FileUploadPath = "public/uploads/live-test/";
const storage = setupStorage(FileUploadPath);
const upload = multer({ storage });

const controller = require("../controllers/Admin/LiveTestController");

// List
router.get("/admin/live-test-list", adminauthenticateCustomer, controller.List);

// Create form
router.get(
  "/admin/live-test-create",
  adminauthenticateCustomer,
  controller.Create
);

// Edit form
router.get(
  "/admin/live-test-edit/:postId",
  adminauthenticateCustomer,
  controller.Edit
);

// Update or Create post
router.post(
  "/admin/live-test-update/:postId?",
  adminauthenticateCustomer,
  upload.fields([{ name: "banner", maxCount: 1 }]),
  controller.Update
);

// Soft Delete
router.get(
  "/admin/live-test-delete/:postId",
  adminauthenticateCustomer,
  controller.Delete
);

// Restore (undo soft delete)
router.get(
  "/admin/live-test-restore/:postId",
  adminauthenticateCustomer,
  controller.Restore
);

// Permanent Delete (hard delete)
router.get(
  "/admin/live-test-permanent-delete/:postId",
  adminauthenticateCustomer,
  controller.PermanentDelete
);

// Show details
router.get(
  "/admin/live-test-show/:postId",
  adminauthenticateCustomer,
  controller.Show
);

router.get(
  "/admin/live-test-question-list/:postId?",
  adminauthenticateCustomer,
  controller.QuestionList
);

router.get(
  "/admin/live-test-result-analysis/:postId?",
  adminauthenticateCustomer,
  controller.ExamAnalysis
);


// router.post(
//   "/admin/live-test-question-upload",
//   adminauthenticateCustomer,
//   upload.single('docFile'),
//   controller.QuestionUpload
// );
module.exports = router;
