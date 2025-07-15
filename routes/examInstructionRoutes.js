const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer(); // For non-file data
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const controller = require("../controllers/Admin/ExamInstruction");

const route = "exam-instruction";


router.get(`/admin/${route}-list`, adminauthenticateCustomer, controller.List);


router.get(`/admin/${route}-create`, adminauthenticateCustomer, controller.Create);


router.get(`/admin/${route}-edit/:postId`, adminauthenticateCustomer, controller.Edit);


router.post(`/admin/${route}-update/:postId?`, adminauthenticateCustomer, upload.none(), controller.Update);


router.get(`/admin/${route}-delete/:postId`, adminauthenticateCustomer, controller.Delete);


router.get(`/admin/${route}-restore/:postId`, adminauthenticateCustomer, controller.Restore);


router.get(`/admin/${route}-permanent-delete/:postId`, adminauthenticateCustomer, controller.PermanentDelete);


router.get(`/admin/${route}-show/:postId`, adminauthenticateCustomer, controller.Show);

module.exports = router;
