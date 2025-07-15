const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const FileUploadPath = "public/uploads/live-class/";
const storage = setupStorage(FileUploadPath);
const upload = multer({ storage });

const controller = require("../controllers/Admin/LiveClassController");

const route = "live-class";

router.get(
  `/admin/live-class-list/:courseId?`,
  adminauthenticateCustomer,
  controller.List
);

router.get(
  `/admin/${route}-create/:courseId`,
  adminauthenticateCustomer,
  controller.Create
);

router.get(
  `/admin/${route}-edit/:postId`,
  adminauthenticateCustomer,
  controller.Edit
);

router.post(
  `/admin/${route}-update/:postId?`,
  adminauthenticateCustomer,
  upload.fields([{ name: "image", maxCount: 1 }]),
  controller.Update
);

router.get(
  `/admin/${route}-delete/:postId`,
  adminauthenticateCustomer,
  controller.Delete
);

router.get(
  `/admin/${route}-restore/:postId`,
  adminauthenticateCustomer,
  controller.Restore
);

router.get(
  `/admin/${route}-permanent-delete/:postId`,
  adminauthenticateCustomer,
  controller.PermanentDelete
);

router.get(
  `/admin/${route}-show/:postId`,
  adminauthenticateCustomer,
  controller.Show
);

module.exports = router;
