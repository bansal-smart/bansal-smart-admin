const express = require("express");
const router = express.Router();
const { setupStorage } = require("../storage");
const multer = require("multer");
const adminauthenticateCustomer = require("../middlewares/adminauthenticateCustomer");

const upload = multer(); // No storage configuration needed for `upload.none()`


const routeLink = "cms"; // This could be dynamically assigned
const controllerName = 'CMSController'; // Similarly, this can be dynamic if needed

const controller = require(`../controllers/Admin/${controllerName}`); // Import the controller dynamically
//const controller = require("../controllers/Admin/TestSeriesTestController"); // Import the controller dynamically
// Routes for test series
router.get(
  `/admin/${routeLink}-list`,
  adminauthenticateCustomer,
  controller.List
);


router.get('/get-classes-by-category/:categoryId', async (req, res) => {
  const categoryId = req.params.categoryId;
  console.log(categoryId); 
  try {
    const classes = await db.Class.findAll({ where: { category_id: categoryId } });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

router.get(
  `/admin/${routeLink}-create`,
  adminauthenticateCustomer,
  controller.Create
);

router.get(
  `/admin/${routeLink}-edit/:postId`,
  adminauthenticateCustomer,
  controller.Edit
);

router.post(
  `/admin/${routeLink}-update/:postId?`,
  adminauthenticateCustomer,
  upload.none(),
  controller.Update
);

router.get(
  `/admin/${routeLink}-delete/:postId`,
  adminauthenticateCustomer,
  controller.Delete
);

router.get(
  `/admin/${routeLink}-restore`,
  adminauthenticateCustomer,
  controller.Restore
);

router.get(
  `/admin/${routeLink}-permanent-delete`,
  adminauthenticateCustomer,
  controller.PermanentDelete
);

router.get(
  `/admin/${routeLink}-show/:postId`,
  adminauthenticateCustomer,
  controller.Show
);

module.exports = router;
