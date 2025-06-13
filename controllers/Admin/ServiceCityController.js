const pool = require("../../db/database");
const randomstring = require("randomstring");
const Helper = require("../../helpers/Helper");
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");

const table_name = "servicable_cities"; // Change this dynamically as needed
const folder_path = "service-city"; // Change this dynamically as needed
const module_name = "service City"; // Change this dynamically as needed

// Helper query runner
const runQuery = (query, params = []) =>
  new Promise((resolve, reject) => {
    pool.query(query, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });

const List = async (req, res) => {
  try {
    let query = '';
    if (req.query.status === 'trashed') {
      query = `SELECT * FROM ${table_name} WHERE deleted_at IS NOT NULL ORDER BY id DESC`;
    } else {
      query = `SELECT * FROM ${table_name} WHERE deleted_at IS NULL ORDER BY id DESC`;
    }

    const items = await runQuery(query);

    const page_name =
      req.query.status === "trashed"
        ? `Trashed ${module_name} List`
        : `${module_name} List`;

    res.render(`admin/${folder_path}/list`, {
      success: req.flash("success"),
      error: req.flash("error"),
      items,
      req,
      page_name,
      list_url: `/admin/${folder_path}-list`,
      trashed_list_url: `/admin/${folder_path}-list?status=trashed`,
      create_url: `/admin/${folder_path}-create`,
    });
  } catch (error) {
    console.error("List Function Error:", error);
    req.flash("error", `Server error in listing ${module_name}`);
    res.redirect("back");
  }
};


const Create = async (req, res) => {
  try {
    res.render(`admin/${folder_path}/create`, {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: `/admin/${folder_path}-update`,
      page_name: `Create ${module_name} Page`,
      post: {},
      image: "",
    });
  } catch (error) {
    console.error("Create Error:", error.message);
    req.flash("error", `Error loading ${module_name} creation page`);
    res.redirect("back");
  }
};

const Edit = async (req, res) => {
  try {
    const postId = req.params.postId;

    const result = await runQuery(`SELECT * FROM ${table_name} WHERE id = ?`, [
      postId,
    ]);

    if (result.length === 0) {
      req.flash("error", `${module_name} not found`);
      return res.redirect(`/admin/${folder_path}-list`);
    }

    const post = result[0];

  
    const imageExists = checkImagePath(post.image);
    const image = post.image ? post.image : "admin/images/default-featured-image.png";

    res.render(`admin/${folder_path}/create`, {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: `/admin/${folder_path}-update/${postId}`,
      page_name: `Edit ${module_name}`,
      post,
     image, // uncomment if using
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", `Error editing ${module_name}`);
    res.redirect(req.get("referer") || `/admin/${folder_path}-list`);
  }
};
const path = require("path");
const fs = require("fs");
const checkImagePath = (relativePath) => {
  const normalizedPath = path.normalize(relativePath);

  const fullPath = path.join(__dirname, "..", "public", normalizedPath);

  console.log("Server checking for file at:", fullPath);

  return fs.existsSync(fullPath);
};
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")   // Replace spaces and special chars with -
    .replace(/^-+|-+$/g, "");    // Trim - from start/end
};

const Update = async (req, res) => {
  const postId = req.params.postId;
  const isInsert = !postId || postId === "null" || postId === "0";

  const { title, status } = req.body;
  const imageFile = req?.files?.image?.[0];
  const errors = {};

  if (!title?.trim()) errors.title = ["Title is required"];
  if (isInsert && !imageFile) errors.image = ["Image is required"];

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  const slug = slugify(title);
  const data = {
    title: title.trim(),
    slug,
    status: status || 0,
  };

  try {
    if (imageFile) {
      const imagePath = `/uploads/service-city/${imageFile.filename}`;
      data.image = imagePath;
    }

    const fields = Object.keys(data);
    const values = Object.values(data);

    if (isInsert) {
      const insertQuery = `INSERT INTO ${table_name} (${fields.join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`;
      await runQuery(insertQuery, values);

      return res.json({
        success: true,
        redirect_url: `/admin/${folder_path}-list`,
        message: `${module_name} created successfully`,
      });
    } else {
      const updateQuery = `UPDATE ${table_name} SET ${fields.map(f => `${f} = ?`).join(", ")} WHERE id = ?`;
      values.push(postId);

      await runQuery(updateQuery, values);

      return res.json({
        success: true,
        redirect_url: `/admin/${folder_path}-list`,
        message: `${module_name} updated successfully`,
      });
    }
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const Delete = async (req, res) => {
  try {
    const postId = req.params.postId;
    console.log(postId);
    const softDeleteQuery = `UPDATE ${table_name} SET deleted_at = NOW() WHERE id = ?`;

    pool.query(softDeleteQuery, [postId], (error, result) => {
      if (error) {
        console.error("Soft delete error:", error);
        req.flash("error", "Internal server error");
        //return res.redirect(`/admin/${folder_path}-list`);
      }

      req.flash("success", `${module_name} soft deleted successfully`);
      return res.redirect(`/admin/${folder_path}-list`);
    });
  } catch (error) {
    console.error("Delete route error:", error.message);
    req.flash("error", "Unexpected error occurred");
    return res.redirect(`/admin/${folder_path}-list`);
  }
};

const Restore = async (req, res) => {
  try {
    const postId = req.params.postId;

    const restoreQuery = `UPDATE ${table_name} SET deleted_at = NULL WHERE id = ?`;

    pool.query(restoreQuery, [postId], (error, result) => {
      if (error) {
        console.error("Restore error:", error);
        req.flash("error", "Internal server error");
        return res.redirect(`/admin/${folder_path}-list`);
      }

      req.flash("success", `${module_name} restored successfully`);
      return res.redirect(`/admin/${folder_path}-list`);
    });
  } catch (error) {
    console.error("Restore route error:", error.message);
    req.flash("error", error.message);
    return res.redirect(`/admin/${folder_path}-list`);
  }
};

const PermanentDelete = async (req, res) => {
  try {
    const postId = req.params.postId;

    const deleteQuery = `DELETE FROM ${table_name} WHERE id = ?`;

    pool.query(deleteQuery, [postId], (error, result) => {
      if (error) {
        console.error("Permanent delete error:", error);
        req.flash("error", "Internal server error");
        return res.redirect(`/admin/${folder_path}-list`);
      }

      req.flash("success", `${module_name} permanently deleted successfully`);
      return res.redirect(`/admin/${folder_path}-list`);
    });
  } catch (error) {
    console.error("Permanent delete route error:", error.message);
    req.flash("error", error.message);
    return res.redirect(`/admin/${folder_path}-list`);
  }
};

const Show = async (req, res) => {
  try {
    const postId = req.params.postId;

    const getQuery = `SELECT * FROM ${table_name} WHERE id = ?`;
    const post = await runQuery(getQuery, [postId]);

    if (post.length === 0) {
      req.flash("error", `${module_name} not found`);
      return res.redirect(`/admin/${folder_path}-list`);
    }

    res.render(`admin/${folder_path}/show`, {
      success: req.flash("success"),
      error: req.flash("error"),
      post: post[0],
      list_url: `/admin/${folder_path}-list`,
      page_name: `${module_name} Details`,
    });
  } catch (error) {
    console.error("Show route error:", error.message);
    req.flash("error", "Something went wrong");
    return res.redirect(`/admin/${folder_path}-list`);
  }
};

module.exports = {
  List,
  Create,
  Edit,
  Update,
  Delete,
  Restore,
  PermanentDelete,
  Show,
};
