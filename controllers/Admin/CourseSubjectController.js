const pool = require("../../db/database");
const randomstring = require("randomstring");
const Helper = require('../../helpers/Helper')
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");
const List = async (req, res) => {
  try {
    const status = req.query.status;
    const courseId = req.params.postId;
    console.log(courseId);
    // Build WHERE clause safely
    let deletedCondition = status === 'trashed' ? 'IS NOT NULL' : 'IS NULL';

    const query = `
      SELECT cs.*, c.course_name
      FROM course_subjects cs
      LEFT JOIN courses c ON cs.course_id = c.id
      WHERE cs.deleted_at ${deletedCondition} AND cs.course_id = ?
      ORDER BY cs.id DESC
    `;

    const page_name =
      status === "trashed" ? "Trashed Course Subjects List" : "Course Subjects List";

    // Use prepared statement with parameter for courseId
    const course_subjects = await new Promise((resolve, reject) => {
      pool.query(query, [courseId], (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    const course = await Helper.getCourseDetails(courseId);
    const subjectCount = await Helper.getSubjectCountByCourseId(courseId);
    const chapterCount = await Helper.getChapterCountByCourseId(courseId);
     const pdfCount = await Helper.getPdfCountByCourseId(courseId);
     const videoCount = await Helper.getVideoCountByCourseId(courseId);
         const bookingCount = await Helper.getBookingCountByCourseId(courseId);
         const testCount = await Helper.getTestCountByCourseId(courseId);
    res.render("admin/course-subject/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      data: course_subjects,
      req,
      page_name,
      course,
      subjectCount,
      chapterCount,
       pdfCount,
      videoCount,
       bookingCount,
       testCount,
      list_url: `/admin/course-subject-list/${courseId}`,
      trashed_list_url: `/admin/course-subject-list/${courseId}?status=trashed`,
      create_url: `/admin/course-subject-create/${courseId}`,
    });

  } catch (error) {
    console.error("Course Subject List Error:", error);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || `/admin/course-subject-list/${req.params.postId}`);
  }
};

const Create = async (req, res) => {
  try {
    const courseId = req.params.postId;
    const categories = await getCategoriesFromTable();
    const courses = await getCourseFromTable();
    let post = {};
       const course = await Helper.getCourseDetails(courseId);
       
    res.render("admin/course-subject/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/course-subject-update",
      page_name: "Create Course Subject",
      action: "Create",
      title: "Course Subject",
      post: post,
      course,
      categories: categories,
      courses: courses,
    });
  } catch (error) {
    console.log(error.message);
    req.flash("error", "An error occurred while fetching data.");
    res.redirect("/admin/course-subject-list");
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

const getCourseFromTable = async () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM courses WHERE status = 1 AND deleted_at IS NULL`;
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
    const postId = req.params.postId;

    const getCourseSubjectQuery = "SELECT * FROM course_subjects WHERE id = ?";

    const post = await new Promise((resolve, reject) => {
      pool.query(getCourseSubjectQuery, [postId], (error, result) => {
        if (error) {
          req.flash("error", error.message);
          return reject(error);
        }
        if (result.length === 0) {
          req.flash("error", "Course subject not found.");
          return reject(new Error("Course subject not found"));
        }
        resolve(result[0]);
      });
    });
 const course = await Helper.getCourseDetails(post.course_id);
   
    // Also fetch all courses for dropdown
    const courses = await new Promise((resolve, reject) => {
      pool.query("SELECT id, course_name FROM courses WHERE deleted_at IS NULL", (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    res.render("admin/course-subject/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      post,
      course,
      courses,
      form_url: "/admin/course-subject-update/" + postId,
      page_name: "Edit",
      action: "Update",
      title: "Course Subject",
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || "/admin/course-subject-list");
  }
};

const Update = async (req, res) => {
  const course_subjectId = req.params.postId;

  const isInsert = !course_subjectId || course_subjectId === "null" || course_subjectId === "0";

  const { course_id, subject_name, status } = req.body;

  const errors = {};

  if (!course_id?.trim()) errors.course_id = ["Course is required"];
  if (isInsert) {
    // Validate all subject names if inserting
    if (!Array.isArray(subject_name) || subject_name.some(name => !name.trim())) {
      errors.subject_name = ["All subject names are required"];
    }
  } else {
    // Validate only one subject name when updating
    if (!subject_name?.trim()) errors.subject_name = ["Subject name is required"];
  }
  if (!["0", "1"].includes(status)) {
    errors.status = ["Status must be '0' or '1'"];
  }

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  try {
    if (isInsert) {
      // Insert multiple subjects
      const values = subject_name.map(name => [course_id, name.trim(), status]);
      const insertQuery = `INSERT INTO course_subjects (course_id, subject_name, status) VALUES ?`;

const courseId = req.params.course_id || req.body.course_id; // or wherever you get it from



      pool.query(insertQuery, [values], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Insert failed" });
        }
        return res.json({
          success: true,
          redirect_url: `/admin/course-subject-list/${courseId}`,
          message: "Subjects added successfully",
        });
      });
    } else {
      // Update one subject
      const updateQuery = `UPDATE course_subjects SET course_id = ?, subject_name = ?, status = ? WHERE id = ?`;
      const values = [course_id, subject_name.trim(), status, course_subjectId];

      pool.query(updateQuery, values, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Update failed" });
        }
        const courseId = req.params.course_id || req.body.course_id; // or wherever you get it from
        return res.json({
          success: true,
             redirect_url: `/admin/course-subject-list/${courseId}`,
          message: "Subject updated successfully",
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

    const softDeleteQuery = "UPDATE course_subjects SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [categorieId], (error, result) => {
      if (error) {
        console.error(error);
        return req.flash("success", "Internal server error");
      }
    });

    req.flash("success", "Course Subject soft deleted successfully");
    return res.redirect("/admin/course-subject-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/course-subject-list`);
  }
};

const Restore = async (req, res) => {
  try {
    const subjectId = req.params.subjectId;

    const restoreQuery = "UPDATE course_subjects SET deleted_at = NULL WHERE id = ?";

    await new Promise((resolve, reject) => {
      pool.query(restoreQuery, [subjectId], (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });

    req.flash("success", "Subject restored successfully");
    return res.redirect("/admin/course-subject-list");
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal server error");
    return res.redirect("/admin/course-subject-list");
  }
};


const PermanentDelete = async (req, res) => {
  try {
    const subjectId = req.params.subjectId;

    const deleteQuery = "DELETE FROM course_subjects WHERE id = ?";

    await new Promise((resolve, reject) => {
      pool.query(deleteQuery, [subjectId], (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });

    req.flash("success", "Subject permanently deleted");
    return res.redirect("/admin/course-subject-list");
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal server error");
    return res.redirect("/admin/course-subject-list");
  }
};
const Show = async (req, res) => {
  const subjectId = req.params.subjectId;

  try {
    const query = `
      SELECT 
        course_subjects.*, 
        courses.course_name,
        subjects.subject_name
      FROM course_subjects
      LEFT JOIN courses ON course_subjects.course_id = courses.id
      LEFT JOIN subjects ON course_subjects.subject_id = subjects.id
      WHERE course_subjects.id = ?
      LIMIT 1
    `;

    const subject = await new Promise((resolve, reject) => {
      pool.query(query, [subjectId], (err, result) => {
        if (err) return reject(err);
        if (result.length === 0) return reject(new Error("Subject not found"));
        resolve(result[0]);
      });
    });

    return res.render("admin/course-subject/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      subject,
      req,
      page_name: "Subject Details",
      back_url: "/admin/course-subject-list",
    });
  } catch (error) {
    console.error("Subject Show Error:", error);
    req.flash("error", error.message);
    return res.redirect("/admin/course-subject-list");
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
