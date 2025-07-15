const pool = require("../../db/database");
const path = require("path");
const fs = require("fs");
const Helper = require("../../helpers/Helper");

// ✅ List Achievements
const List = async (req, res) => {
  try {
    const table_name = "achievements";
    const status = req.query.status;

    let where =
      status === "trashed"
        ? `WHERE ${table_name}.deleted_at IS NOT NULL`
        : `WHERE ${table_name}.deleted_at IS NULL`;

    const query = `
      SELECT ${table_name}.*
      FROM ${table_name}
      ${where}
      ORDER BY ${table_name}.id DESC
    `;

    const page_name =
      status === "trashed" ? "Trashed Achievements List" : "Achievements List";

    const achievements = await pool.promise().query(query);
    res.render("admin/achievement/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      data: achievements[0],
      req,
      page_name,
      list_url: "/admin/achievement-list",
      trashed_list_url: "/admin/achievement-list/?status=trashed",
      create_url: "/admin/achievement-create",
    });
  } catch (error) {
    console.error("Achievement List Error:", error);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || "/admin/achievement-list");
  }
};

// ✅ Create Achievement View
const Create = async (req, res) => {
  try {
    let post = {};
    res.render("admin/achievement/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/achievement-store",
      page_name: "Achievement",
      action: "Create",
      title: "Achievement",
      post,
    });
  } catch (error) {
    console.error(error.message);
    req.flash("error", "An error occurred while fetching data.");
    res.redirect("/admin/achievement-list");
  }
};

// ✅ Store Achievement
const Store = async (req, res) => {
  try {
    const { title, status } = req.body;
    const files = req.files || [];

    const errors = {};
    const created_by = req.user.id;

    if (!title?.trim()) errors.title = ["Title is required"];
    if (!files || files.length === 0)
      errors.gallery = ["At least one image is required"];

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
        `INSERT INTO achievements (title, gallery, extension, status, created_by, created_by_role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, filePath, ext, status || 1, created_by, "Super Admin"]
      );
    }

    return res.json({
      success: true,
      redirect_url: `/admin/achievement-list`,
      message: "Achievement(s) uploaded successfully",
    });
  } catch (error) {
    console.error("Achievement Store Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Soft Delete
const Delete = async (req, res) => {
  try {
    const id = req.params.postId;
    await pool.promise().query(
      "UPDATE achievements SET deleted_at = NOW() WHERE id = ?",
      [id]
    );
    req.flash("success", "Achievement deleted successfully");
    res.redirect("/admin/achievement-list");
  } catch (error) {
    req.flash("error", error.message);
    res.redirect("/admin/achievement-list");
  }
};

// ✅ Restore
const Restore = async (req, res) => {
  try {
    const id = req.query.id;
    await pool.promise().query(
      "UPDATE achievements SET deleted_at = NULL WHERE id = ?",
      [id]
    );
    req.flash("success", "Achievement restored successfully");
    res.redirect("/admin/achievement-list?status=trashed");
  } catch (error) {
    req.flash("error", error.message);
    res.redirect("/admin/achievement-list?status=trashed");
  }
};

// ✅ Permanent Delete
const PermanentDelete = async (req, res) => {
  try {
    const id = req.query.id;
    await pool.promise().query("DELETE FROM achievements WHERE id = ?", [id]);
    req.flash("success", "Achievement permanently deleted");
    res.redirect("/admin/achievement-list?status=trashed");
  } catch (error) {
    req.flash("error", error.message);
    res.redirect("/admin/achievement-list?status=trashed");
  }
};

module.exports = {
  List,
  Create,
  Store,
  Delete,
  Restore,
  PermanentDelete,
};
