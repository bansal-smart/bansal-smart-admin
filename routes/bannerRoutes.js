const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const BannerController = require("../controllers/Admin/BannerController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

const fileUploadPath = "public/uploads/banners/";
const fileUploadPathStorage = setupStorage(fileUploadPath);
const fileUploadPathStorageMulter = multer({ storage: fileUploadPathStorage });

router.get(
  "/admin/banner-list",
  adminauthenticateCustomer,
  BannerController.List
);


router.get(
  "/admin/banner-list3",
  adminauthenticateCustomer,
  BannerController.List
);
router.get(
  "/admin/banner-create",
  adminauthenticateCustomer,
  BannerController.Create
);

router.get(
  "/admin/banner-edit/:postId?",
  adminauthenticateCustomer,
  BannerController.Edit
);

router.post(
  "/admin/banner-update/:postId?",
  adminauthenticateCustomer,
  fileUploadPathStorageMulter.fields([{ name: "banner", maxCount: 1 }]),
  BannerController.Update
);

router.get(
  "/admin/banner-delete/:postId",
  adminauthenticateCustomer,
  BannerController.Delete
);
router.get(
  "/admin/banner-restore",
  adminauthenticateCustomer,
  BannerController.Restore
);
router.get(
  "/admin/banner-permanent-delete",
  adminauthenticateCustomer,
  BannerController.PermanentDelete
);
router.get(
  "/admin/banner-show/:postId",
  adminauthenticateCustomer,
  BannerController.Show
);

module.exports = router;
