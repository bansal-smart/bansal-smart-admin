const express = require('express');
const router = express.Router();
const multer = require('multer');
const { setupStorage } = require('../storage'); 
const ServiceController = require('../controllers/Admin/ServiceController');
const adminauthenticateCustomer = require('../middlewares/adminauthenticateCustomer');

const upload = multer();  // No storage configuration needed for `upload.none()`
const serviceUploadPath = 'public/uploads/service/';
const serviceUploadStorage = setupStorage(serviceUploadPath);
const serviceUploadMulter = multer({ storage: serviceUploadStorage });
router.get(
  "/admin/service-list",
  adminauthenticateCustomer,
  ServiceController.List
);

router.get(
  "/admin/service-create",
  adminauthenticateCustomer,
  ServiceController.Create
);

router.get(
  "/admin/service-edit/:serviceId?", // Use serviceId to edit specific service
  adminauthenticateCustomer,
  ServiceController.Edit
);



router.post(
  "/admin/service-update/:serviceId?", // Use serviceId to update specific service
  adminauthenticateCustomer,
  serviceUploadMulter.fields([
    { name: 'image', maxCount: 1 },
  ]),
  ServiceController.Update
);

router.get(
  "/admin/service-delete/:serviceId", // Use serviceId to delete specific service
  adminauthenticateCustomer,
  ServiceController.Delete
);

router.get(
  "/admin/service-restore/:serviceId", // Use serviceId to restore specific service
  adminauthenticateCustomer,
  ServiceController.Restore
);

router.get(
  "/admin/service-permanent-delete/:serviceId", // Use serviceId to permanently delete specific service
  adminauthenticateCustomer,
  ServiceController.PermanentDelete
);

module.exports = router;
