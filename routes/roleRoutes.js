const express = require("express");
const router = express.Router();
const multer = require("multer");
const RolePermissionController = require("../controllers/Admin/RolePermissionController");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`

router.get(
  "/admin/roles-list",
  adminauthenticateCustomer,
  RolePermissionController.List
);
router.get(
  "/admin/roles-edit/:roleId?",
  adminauthenticateCustomer,
  RolePermissionController.Edit
);
router.get(
  "/admin/roles-create/:roleId?",
  adminauthenticateCustomer,
  RolePermissionController.Create
);

router.post(
  "/admin/roles-update/:roleId?",
  adminauthenticateCustomer,
  upload.none(),
  RolePermissionController.Update
);
module.exports = router;
