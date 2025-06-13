const pool = require("../../db/database");
const randomstring = require("randomstring");
const Helper = require("../../helpers/Helper");
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");

const table_name = "cms";
const folder_path = "cms";
const module_mane = "cms";
const List = async (req, res) => {
  try {
    const where =
      req.query.status === "trashed"
        ? "WHERE cms.deleted_at IS NOT NULL"
        : "WHERE cms.deleted_at IS NULL";

    const page_name =
      req.query.status === "trashed"
        ? "Trashed CMS Page List"
        : "CMS Page List";

    const query = `
      SELECT * FROM cms
      ${where}
      ORDER BY cms.id DESC
    `;

    const customers = await new Promise((resolve, reject) => {
      pool.query(query, (err, result) => {
        if (err) {
          console.error("SQL Error:", err);
          return reject(err);
        }
        resolve(result);
      });
    });

    res.render("admin/cms/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      customers,
      req,
      page_name,
      list_url: "/admin/cms",
      trashed_list_url: "/admin/cms?status=trashed",
      create_url: "/admin/cms-create",
    });
  } catch (error) {
    console.error("List Function Error:", error);
    req.flash("error", "Server error in listing data");
    res.redirect("back");
  }
};


const runQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    pool.query(query, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
const Create = async (req, res) => {
  try {
   
    
    res.render("admin/cms/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/cms-update",
      page_name: "Create CMS Page",

      post: [],
      
    });
  } catch (error) {
    console.log(error.message);
  }
};



const Edit = async (req, res) => {
  try {
    const courseId = req.params.postId;
   

    // Fetch course
    const courseResult = await runQuery(
      "SELECT * FROM `cms` WHERE id = ?",
      [courseId]
    );
    if (courseResult.length === 0) {
      req.flash("error", "cmd not found");
      return res.redirect("/admin/cms-list");
    }
    const post = courseResult[0];

 

    // Check image existence
    // const imageExists = checkImagePath(course.image);
    // const detailsImageExists = checkImagePath(course.details_image);

    res.render("admin/cms/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      post,
    
  
      form_url: `/admin/cms-update/${courseId}`,
      page_name: "Edit",
      // image: imageExists
      //   ? course.image
      //   : "admin/images/default-featured-image.png",
    
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
   // res.redirect(req.get("referer") || "/admin/cms-list");
  }
};
// Assuming you have something like:
// const { pool } = require('./db');  // Your mysql pool
// const util = require('util');
// const query = util.promisify(pool.query).bind(pool);
const path = require("path"); // if you use images in CMS later

const Update = async (req, res) => {
  const cmsId = req.params.postId;
  const isInsert = !cmsId || cmsId === "null" || cmsId === "0";
  
  
  
  const {
    title,
    slug: inputSlug,
    description,
    status,
  } = req.body;

  // If you want to handle image upload for CMS later, uncomment and modify accordingly
  // const imageFile = req?.files?.image?.[0];

  // Generate slug if not provided
  let slug = inputSlug?.trim();
  if (!slug && title) {
    slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // Validate inputs
  const errors = {};
  if (!title?.trim()) errors.title = ["Title is required"];
  if (!description?.trim()) errors.description = ["Description is required"];
  if (!slug) errors.slug = ["Slug is required"];

  // For insert, you might want to require an image, add here if needed
  // if (isInsert && !imageFile) errors.image = ["Image is required"];

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  // Prepare data to save
  const data = {
    title: title.trim(),
    slug,
    description: description.trim(),
    status: status || 0,  // default 0 if not provided
  };

  // If image handling is needed, add here
  // if (imageFile) {
  //   data.image = path.join("/uploads/cms", imageFile.filename);
  // }

  try {
    const fields = Object.keys(data);
    const values = Object.values(data);

    if (isInsert) {
      const insertQuery = `INSERT INTO \`cms\` (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`;
      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error("Insert error:", err);
          return res.status(500).json({ success: false, message: "Insert failed" });
        }
        return res.json({
          success: true,
          redirect_url: "/admin/cms-list",
          message: "CMS Page created successfully",
        });
      });
    } else {
      const updateQuery = `UPDATE \`cms\` SET ${fields.map(field => `${field} = ?`).join(", ")} WHERE id = ?`;
      values.push(cmsId);
      pool.query(updateQuery, values, (err, result) => {
        if (err) {
          console.error("Update error:", err);
          return res.status(500).json({ success: false, message: "Update failed" });
        }
        return res.json({
          success: true,
          redirect_url: "/admin/cms-list",
          message: "CMS Page updated successfully",
        });
      });
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


const Delete = async (req, res) => {
  try {
    const testSeriesId = req.params.postId;
    console.log(testSeriesId); 
    const softDeleteQuery =
      "UPDATE `cms` SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [testSeriesId], (error, result) => {
      if (error) {
        console.error("Soft delete error:", error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/cms-list");
      }

      req.flash("success", "CMS Page soft deleted successfully");
      return res.redirect("/admin/cms-list");
    });
  } catch (error) {
    console.error("Delete route error:", error.message);
    req.flash("error", "Unexpected error occurred");
    return res.redirect("/admin/cms-list");
  }
};

const Restore = async (req, res) => {
  try {
    const categorieId = req.params.postId;

    const RestoreQuery =
      "UPDATE cms SET deleted_at = null WHERE id = ?";

    pool.query(RestoreQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "CMS Page Restored successfully");
    return res.redirect("/admin/cms-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/cms-list`);
  }
};

const PermanentDelete = async (req, res) => {
  try {
    const categorieId = req.params.categorieId;

    const DeleteQuery = "DELETE FROM test_series WHERE id = ?";

    pool.query(DeleteQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Customer deleted successfully");
    return res.redirect("/admin/test-series-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/test-series-list`);
  }
};


const Show = async (req, res) => {
  try {
    const couponId = req.params.postId;

    const getCouponQuery = "SELECT * FROM cms WHERE id = ?";
    const post = await new Promise((resolve, reject) => {
      pool.query(getCouponQuery, [couponId], function (error, result) {
        if (error) {
          console.error(error);
          req.flash("error", error.message);
          return reject(error);
        }
        resolve(result.length > 0 ? result[0] : null);
      });
    });

    // If coupon image doesn't exist, use default image
    
    res.render("admin/cms/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      post,
      page_name: "CMS Page Details",
    });
  } catch (error) {
    console.error(error.message);
    req.flash("error", "Something went wrong");
    
  }
};

module.exports = {
  Create,
  List,
  Edit,
  Update,
  Delete,
  Restore,
  PermanentDelete,
  Show,
};
