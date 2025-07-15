const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");
const List = async (req, res) => {
  try {
    const table_name = "banners";
    const status = req.query.status;

    let where =
      status === "trashed"
        ? `WHERE ${table_name}.deleted_at IS NOT NULL`
        : `WHERE ${table_name}.deleted_at IS NULL`;

    const query = `
      SELECT * FROM ${table_name}
      ${where}
      ORDER BY ${table_name}.id DESC
    `;

    
    const page_name =
      status === "trashed" ? "Trashed Banners List" : "Banners List";

    const banners = await new Promise((resolve, reject) => {
      pool.query(query, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    res.render("admin/banner/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      data: banners,
      req,
      page_name,
      list_url: "/admin/banner-list",
      trashed_list_url: "/admin/banner-list/?status=trashed",
      create_url: "/admin/banner-create",
    });
  } catch (error) {
    console.error("Banner List Error:", error);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || "/admin/banner-list");
  }
};

const Create = async (req, res) => {
  try {
    const categories = await getCategoriesFromTable();

    let post = {};

    res.render("admin/banner/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/banner-update",
      page_name: "Create Banner",
      action: "Create",
      title: "Banner",
      post: post,
      categories: categories,
    });
  } catch (error) {
    console.log(error.message);
    req.flash("error", "An error occurred while fetching data.");
    res.redirect("/admin/banner-list");
  }
};

const getCategoriesFromTable = async () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM categories WHERE status = 1 AND deleted_at IS NULL AND category_type = 'course'`;
    pool.query(query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const fs = require("fs");
const path = require("path");
const checkImagePath = (relativePath) => {
  const normalizedPath = path.normalize(relativePath);

  // Get the absolute path from the project root (where the 'public' folder is located)
  const fullPath = path.join(__dirname, "..", "public", normalizedPath);

  //console.log("Server checking for file at:", fullPath); // For debugging

  // Check if the file exists on the server
  return fs.existsSync(fullPath);
};

const Edit = async (req, res) => {
  try {
    const postId = req.params.postId; // Renamed for clarity (was 'customerId')

    // Fetch the course based on the provided courseId
    const getCourseQuery = "SELECT * FROM banners WHERE id = ?";

    // Fetch the course details from the database
    const post = await new Promise((resolve, reject) => {
      pool.query(getCourseQuery, [postId], function (error, result) {
        if (error) {
          req.flash("error", error.message);
          return reject(error);
        }
        // if (result.length === 0) {
        //   req.flash("error", "Faculty not found");
        //   return reject(new Error("Faculty not found"));
        // }
        resolve(result[0]); // Ensure result[0] contains course data
      });
    });

    // Fetch course classes from the database

    const imageExists = checkImagePath(post.banner);

    res.render("admin/banner/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      post: post, // Pass the course details to the view
      form_url: "/admin/banner-update/" + postId, // URL for the update form
      page_name: "Edit",
      action: "Update",
      title: "Banner",
      image: imageExists
        ? `${post.banner}`
        : "admin/images/default-featured-image.png",
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect("back");
  }
};
const Update = async (req, res) => {
  const bannerId = req.params.postId;

  const isInsert = !bannerId || bannerId === "null" || bannerId === "0";

  const { title, banner_type, banner_link, position, status } = req.body;

  const bannerFile = req?.files?.banner?.[0];

  // Validation
  const errors = {};
  if (!title?.trim()) errors.title = ["Title is required"];
  if (!banner_type?.trim()) errors.banner_type = ["Banner Type is required"];
  if (!banner_link?.trim()) errors.banner_link = ["Banner Link is required"];
  if (!position?.trim()) errors.position = ["Banner position is required"];
  if (!["0", "1"].includes(status))
    errors.status = ["Status must be '0' or '1'"];
  if (isInsert && !bannerFile) {
    errors.banner = ["Banner image is required"];
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  const data = {
    title: title.trim(),
    banner_type: banner_type.trim(),
    banner_link: banner_link.trim(),
    position: position.trim(),
    status: status,
  };

  if (bannerFile) {
    data.banner = `/uploads/banners/${bannerFile.filename}`;
  }

  try {
    if (isInsert) {
      // INSERT
      const fields = Object.keys(data);
      const placeholders = fields.map(() => "?").join(", ");
      const values = Object.values(data);

      const insertQuery = `INSERT INTO banners (${fields.join(
        ", "
      )}) VALUES (${placeholders})`;

      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Insert failed" });
        }
        return res.json({
          success: true,
          redirect_url: "/admin/banner-list",
          message: "Banner created successfully",
        });
      });
    } else {
      const fields = Object.keys(data);
      const setClause = fields.map((key) => `${key} = ?`).join(", ");
      const values = Object.values(data);
      values.push(bannerId);

      const updateQuery = `UPDATE banners SET ${setClause} WHERE id = ?`;

      pool.query(updateQuery, values, (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Update failed" });
        }
        return res.json({
          success: true,
          redirect_url: "/admin/banner-list",
          message: "Banner updated successfully",
        });
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
const Delete = async (req, res) => {
  try {
    const categorieId = req.params.postId;

    const softDeleteQuery =
      "UPDATE banners SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Banner soft deleted successfully");
    return res.redirect("/admin/banner-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/banner-list`);
  }
};

const Restore = async (req, res) => {
  try {
    const categorieId = req.params.categorieId;

    const RestoreQuery = "UPDATE customers SET deleted_at = null WHERE id = ?";

    pool.query(RestoreQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Customer Restored successfully");
    return res.redirect("/admin/categorie-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/categorie-list`);
  }
};

const PermanentDelete = async (req, res) => {
  try {
    const categorieId = req.params.categorieId;

    const DeleteQuery = "DELETE FROM customers WHERE id = ?";

    pool.query(DeleteQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Customer deleted successfully");
    return res.redirect("/admin/categorie-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/categorie-list`);
  }
};

const Show = async (req, res) => {
  const facultyId = req.params.postId;

  try {
    const query = `
      SELECT 
        faculties.*, 
        categories.category_name 
      FROM faculties 
      LEFT JOIN categories ON faculties.category_id = categories.id 
      WHERE faculties.id = ? 
      LIMIT 1
    `;

    const faculty = await new Promise((resolve, reject) => {
      pool.query(query, [facultyId], (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        if (result.length === 0) {
          req.flash("error", "Faculty not found");
          return reject(new Error("Faculty not found"));
        }
        resolve(result[0]);
      });
    });

    res.render("admin/faculty/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      faculty,
      req,
      page_name: "Faculty Details",
      back_url: "/admin/faculty-list",
    });
  } catch (error) {
    console.error("Faculty Show Error:", error);
    req.flash("error", error.message);
    res.redirect("/admin/faculty-list");
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
