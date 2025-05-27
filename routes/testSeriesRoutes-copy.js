const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const TestSeiesController = require("../controllers/Admin/TestSeriesController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

const TestSeiesUploadPath = "public/uploads/test-series/";
const TestSeiesUploadPathStorage = setupStorage(TestSeiesUploadPath);
const TestSeiesUploadMulter = multer({ storage: TestSeiesUploadPathStorage });

router.get(
  "/admin/test-series-list",
  adminauthenticateCustomer,
  TestSeiesController.List
);
router.get(
  "/admin/test-series-create",
  adminauthenticateCustomer,
  TestSeiesController.Create
);

router.get(
  "/admin/test-series-edit/:postId",
  adminauthenticateCustomer,
  TestSeiesController.Edit
);

router.post(
  "/admin/test-series-update/:postId?",
  adminauthenticateCustomer,
  TestSeiesUploadMulter.fields([
    { name: "image", maxCount: 1 },
    { name: "details_image", maxCount: 1 },
  ]),
  TestSeiesController.Update
);

router.get(
  "/admin/test-series-delete/:postId",
  adminauthenticateCustomer,
  TestSeiesController.Delete
);
router.get(
  "/admin/test-series-restore",
  adminauthenticateCustomer,
  TestSeiesController.Restore
);
router.get(
  "/admin/test-series-permanent-delete",
  adminauthenticateCustomer,
  TestSeiesController.PermanentDelete
);
router.get(
  "/admin/test-series-show/:postId",
  adminauthenticateCustomer,
  TestSeiesController.Show
);

module.exports = router;
