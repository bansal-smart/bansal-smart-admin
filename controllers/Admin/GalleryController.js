const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const Helper = require('../../helpers/Helper')
const { validateRequiredFields } = require("../../helpers/validationsHelper");

const List = async (req, res) => {
  try {
    const table_name = "galleries";
    const status = req.query.status;

    let where =
      status === "trashed"
        ? `WHERE ${table_name}.deleted_at IS NOT NULL`
        : `WHERE ${table_name}.deleted_at IS NULL`;

    // Filter by center_id if user is a Center
    if (req.session.userRole?.[0] === "Center") {
      const center_id = req.user.id;
      where += ` AND ${table_name}.center_id = ${pool.escape(center_id)}`;
    }

    const query = `
      SELECT ${table_name}.*, users.name AS center_name
      FROM ${table_name}
      LEFT JOIN users ON ${table_name}.center_id = users.id
      ${where}
      ORDER BY ${table_name}.id DESC
    `;

    const page_name =
      status === "trashed" ? "Trashed Galleries List" : "Galleries List";

    const galleries = await new Promise((resolve, reject) => {
      pool.query(query, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    res.render("admin/gallery/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      data: galleries,
      req,
      page_name,
      list_url: "/admin/gallery-list",
      trashed_list_url: "/admin/gallery-list/?status=trashed",
      create_url: "/admin/gallery-create",
    });

  } catch (error) {
    console.error("Gallery List Error:", error);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || "/admin/gallery-list");
  }
};


const Create = async (req, res) => {
  try {
    

    let post = {};

 const centers = await Helper.getCenters();

    res.render("admin/gallery/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/gallery-store",
      page_name: "Create Gallery",
      action: "Create",
      title: "Gallery",
      post: post,
      centers,

      
    });
  } catch (error) {
    console.log(error.message);
    req.flash("error", "An error occurred while fetching data.");
    res.redirect("/admin/gallery-list");
  }
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
const Store = async (req, res) => {
  try {
    const { title, status } = req.body;
    const files = req.files || [];

    const errors = {};

    const created_by = req.user.id;
   // const userRole = req.user?.listrole || []; // ✅ Prevent undefined
    console.log()
    let center_id = null;

    if (req.session.userRole['0'] === 'Center') {
      center_id = req.user.id;
    } else {
      center_id = req.body.center_id;
      if (!center_id?.trim()) {
        errors.center_id = ["Center is required"];
      }
    }

    // Validations
    if (!title?.trim()) errors.title = ["Title is required"];
    if (!files || files.length === 0) errors.gallery = ["At least one file is required"];

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({
        success: false,
        errors,
        message: Object.values(errors)[0][0],
      });
    }

    for (const file of files) {
      const ext = path.extname(file.originalname).slice(1);
      const filePath = `/uploads/gallery/${file.filename}`;

      await pool.promise().query(
        `INSERT INTO galleries (title, status, gallery, extension, created_by, center_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, status, filePath, ext, created_by, center_id]
      );
    }

    return res.json({
      success: true,
      redirect_url: `/admin/gallery-list/`,
      message: "Gallery uploaded successfully",
    });

  } catch (error) {
    console.error("Gallery Store Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


const Delete = async (req, res) => {
  try {
    const categorieId = req.params.postId;

    const softDeleteQuery =
      "UPDATE galleries SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Gall soft deleted successfully");
    return res.redirect("/admin/gallery-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/gallery-list`);
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

module.exports = {
  Create,
  List,
  Delete,
  Restore,
  PermanentDelete,
  Store,
};
