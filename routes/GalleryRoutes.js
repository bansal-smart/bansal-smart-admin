const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const Controller = require("../controllers/Admin/GalleryController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

const fileUploadPath = "public/uploads/gallery/";
const fileUploadPathStorage = setupStorage(fileUploadPath);
const fileUploadPathStorageMulter = multer({ storage: fileUploadPathStorage });

router.get(
  "/admin/gallery-list",
  adminauthenticateCustomer,
  Controller.List
);
router.get(
  "/admin/gallery-create",
  adminauthenticateCustomer,
  Controller.Create
);



router.post(
  "/admin/gallery-store",
  adminauthenticateCustomer,
  fileUploadPathStorageMulter.array("gallery", 10), // 10 = max number of files
  Controller.Store
);


router.get(
  "/admin/gallery-delete/:postId",
  adminauthenticateCustomer,
  Controller.Delete
);
router.get(
  "/admin/gallery-restore",
  adminauthenticateCustomer,
  Controller.Restore
);
router.get(
  "/admin/gallery-permanent-delete",
  adminauthenticateCustomer,
  Controller.PermanentDelete
);

module.exports = router;
