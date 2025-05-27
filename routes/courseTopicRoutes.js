const express = require('express');
const router = express.Router();
const multer = require('multer');
const CourseTopicController = require('../controllers/Admin/CourseTopicController');
const adminauthenticateCustomer = require('../middlewares/adminauthenticateCustomer');

const upload = multer();  // No storage configuration needed for `upload.none()`

router.get(
  "/admin/course-topic-list",
  adminauthenticateCustomer,
  CourseTopicController.List
);

router.get(
  "/admin/course-topic-create",
  adminauthenticateCustomer,
  upload.none(),
  CourseTopicController.Create
);

router.get(
  "/admin/course-topic-edit/:course-topicId", // Use course-topicId instead of courseId
  adminauthenticateCustomer,
  CourseTopicController.Edit
);


router.post(
  "/admin/course-topic-update/:course-topicId?", // Use course-topicId instead of courseId
  adminauthenticateCustomer,
  upload.none(), // use .none() if you're not uploading files
  CourseTopicController.Update
);

router.get(
  "/admin/course-topic-delete/:course-topicId", // Use course-topicId instead of courseId
  adminauthenticateCustomer,
  CourseTopicController.Delete
);

router.get(
  "/admin/course-topic-restore/:course-topicId", // Optionally, include the course-topicId
  adminauthenticateCustomer,
  CourseTopicController.Restore
);

router.get(
  "/admin/course-topic-permanent-delete",
  adminauthenticateCustomer,
  CourseTopicController.PermanentDelete
);


module.exports = router;
