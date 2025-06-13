const express = require("express");
const router = express.Router();
const multer = require("multer");
const { setupStorage } = require("../storage");
const CouponController = require("../controllers/Admin/CouponController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

router.get(
  "/admin/coupon-list",
  adminauthenticateCustomer,
  CouponController.List
);

router.post(
  "/admin/coupon-list",
  adminauthenticateCustomer,
  CouponController.List
);


router.get(
  "/admin/coupon-create",
  adminauthenticateCustomer,
  CouponController.Create
);

router.get(
  "/admin/coupon-edit/:couponId?", // Use categoryId instead of courseId
  adminauthenticateCustomer,
  CouponController.Edit
);

const couponUploadPath = "public/uploads/coupons/";
const couponUploadStorage = setupStorage(couponUploadPath);
const cooponUploadMulter = multer({ storage: couponUploadStorage });

router.post(
  "/admin/coupon-update/:couponId?", // Use categoryId instead of courseId
  adminauthenticateCustomer,
  cooponUploadMulter.fields([{ name: "coupon_image", maxCount: 1 }]),
  CouponController.Update
);

router.get(
  "/admin/coupon-delete/:couponId", // Use categoryId instead of courseId
  adminauthenticateCustomer,
  CouponController.Delete
);

router.get(
  "/admin/coupon-restore/:couponId", // Optionally, include the categoryId
  adminauthenticateCustomer,
  CouponController.Restore
);

router.get(
  "/admin/coupon-permanent-delete",
  adminauthenticateCustomer,
  CouponController.PermanentDelete
);
router.get(
  "/admin/coupon-show/:couponId",
  adminauthenticateCustomer,
  CouponController.Show
);

module.exports = router;
