const express = require('express');
const router = express.Router();
const multer = require('multer');
const CategoryController = require('../controllers/Admin/CategoryController');
const adminauthenticateCustomer = require('../middlewares/adminauthenticateCustomer');

const upload = multer();  // No storage configuration needed for `upload.none()`

router.get(
  "/admin/category-list",
  adminauthenticateCustomer,
  CategoryController.List
);

router.get(
  "/admin/category-create",
  adminauthenticateCustomer,
  upload.none(),
  CategoryController.Create
);

router.get(
  "/admin/category-edit/:categoryId", // Use categoryId instead of courseId
  adminauthenticateCustomer,
  CategoryController.Edit
);


router.post(
  "/admin/category-update/:categoryId?", // Use categoryId instead of courseId
  adminauthenticateCustomer,
  upload.none(), // use .none() if you're not uploading files
  CategoryController.Update
);

router.get(
  "/admin/category-delete/:categoryId", // Use categoryId instead of courseId
  adminauthenticateCustomer,
  CategoryController.Delete
);

router.get(
  "/admin/category-restore/:categoryId", // Optionally, include the categoryId
  adminauthenticateCustomer,
  CategoryController.Restore
);

router.get(
  "/admin/category-permanent-delete",
  adminauthenticateCustomer,
  CategoryController.PermanentDelete
);


module.exports = router;
