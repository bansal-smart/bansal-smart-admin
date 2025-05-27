const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");

// List course_topics
const List = async (req, res) => {
  try {
    const where =
      req.query.status === "trashed"
        ? "WHERE course_topics.deleted_at IS NOT NULL"
        : "WHERE course_topics.deleted_at IS NULL";

    const page_name =
      req.query.status === "trashed"
        ? "Trashed Course Topic List"
        : "Course Topic List";

    // Join with courses, subjects, and chapters
    const query = `
      SELECT 
        course_topics.id,
        course_topics.topic_name,
        course_topics.status,
        course_topics.created_at,
        course_topics.deleted_at,
        courses.course_name,
        course_subjects.subject_name,
        course_chapters.chapter_name
      FROM course_topics
      LEFT JOIN courses ON courses.id = course_topics.course_id
      LEFT JOIN course_subjects ON course_subjects.id = course_topics.subject_id
      LEFT JOIN course_chapters ON course_chapters.id = course_topics.chapter_id
      ${where}
      ORDER BY course_topics.created_at DESC
    `;

    const course_topics = await new Promise((resolve, reject) => {
      pool.query(query, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    res.render("admin/course-topic/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      course_topics,
      req,
      page_name,
      title: "Course Topic",
      list_url: '/admin/course-topic-list',
      trashed_list_url: '/admin/course-topic-list/?status=trashed',
      create_url: '/admin/course-topic-create'
    });
  } catch (error) {
    console.error("Course Topic List Error:", error);
    req.flash("error", error.message);
    res.redirect("back");
  }
};


// Create Course Topic
const Create = async (req, res) => {
  try {
     const categories = await getCategoriesFromTable();
    const courses = await getCourseFromTable();
    const subjects = await getSubjectFromTable();
    const chapters = await getChapterFromTable();
    let post = {};

    const course_topicId = "";
    res.render("admin/course-topic/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/course-topic-update/" + course_topicId, // URL for the update form
      page_name: "Create",
      title: "Course Topic",
      post: post,
      categories: categories,
      courses: courses,
      subjects: subjects,
      chapters: chapters,
    });
  } catch (error) {
    console.log(error.message);
  }
};

// Edit Course Topic
const Edit = async (req, res) => {
  try {
    const course_topicId = req.params.course_topicId; // Changed name for clarity

    const post = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT * FROM course_topics WHERE id = ?",
        [course_topicId],
        (error, result) => {
          if (error) {
            req.flash("error", error.message);
            return reject(error);
          }
          if (result.length === 0) {
            req.flash("error", "Course Topic not found");
            return reject(new Error("Course Topic not found"));
          }
          resolve(result[0]); // Ensure result[0] contains course_topic data
        }
      );
    });

      const categories = await new Promise((resolve, reject) => {
        pool.query("SELECT id, category_name FROM categories WHERE status = 1 AND deleted_at IS NULL", (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
      const courses = await new Promise((resolve, reject) => {
        pool.query("SELECT id, course_name FROM courses WHERE status = 1 AND deleted_at IS NULL", (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
      const subjects = await new Promise((resolve, reject) => {
        pool.query("SELECT id, subject_name FROM course_subjects WHERE status = 1 AND deleted_at IS NULL", (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
      const chapters = await new Promise((resolve, reject) => {
        pool.query("SELECT id, chapter_name FROM course_chapters WHERE status = 1 AND deleted_at IS NULL", (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });
      
    res.render("admin/course-topic/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      post: post,
      form_url: "/admin/course-topic-update/" + course_topicId, // URL for the update form
      page_name: "Edit",
      title: "Course Topic",
      categories: categories,
      courses: courses,
      subjects: subjects,
      chapters: chapters,
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect("back");
  }
};

// Update or Create Course Topic
const Update = async (req, res) => {
  const course_topicId = req.params.course_topicId;
  let { course_id, subject_id, chapter_id, topic_name, status } = req.body;

  // Trim inputs
  topic_name = topic_name?.trim();

  const errors = {};

  // Validation
  if (!course_id) {
    errors.course_id = ["Course is required"];
  }

  if (!subject_id) {
    errors.subject_id = ["Subject is required"];
  }

  if (!chapter_id) {
    errors.chapter_id = ["Chapter is required"];
  }

  if (!topic_name) {
    errors.topic_name = ["Topic Name is required"];
  }

  if (status !== undefined && status !== null && status !== "") {
    if (!["0", "1"].includes(status.toString())) {
      errors.status = ["Status must be 0 or 1"];
    }
  } else {
    status = "1"; // Default if not provided
  }

  // If there are validation errors
  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  try {
    const data = { course_id, subject_id, chapter_id, topic_name, status };
    const setClauses = [];
    const values = [];

    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        setClauses.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided",
      });
    }

    if (course_topicId) {
      // UPDATE
      values.push(course_topicId);
      const query = `UPDATE course_topics SET ${setClauses.join(", ")} WHERE id = ?`;

      pool.query(query, values, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "Course Topic update failed",
          });
        }

        return res.status(200).json({
          success: true,
          redirect_url: "/admin/course-topic-list",
          message: "Course Topic updated successfully",
        });
      });
    } else {
      // INSERT
      const insertQuery = `INSERT INTO course_topics (${Object.keys(data).join(", ")}) VALUES (${Object.keys(data).map(() => "?").join(", ")})`;

      pool.query(insertQuery, values, (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            success: false,
            message: "Course Topic creation failed",
          });
        }

        return res.status(200).json({
          success: true,
          redirect_url: "/admin/course-topic-list",
          message: "Course Topic created successfully",
        });
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      errors: [{ message: err.message || 'Unexpected server error' }],
    });
  }
};


// Soft Delete Course Topic
const Delete = async (req, res) => {
  try {
    const course_topicId = req.params.course_topicId;

    const softDeleteQuery =
      "UPDATE course_topics SET deleted_at = NOW() WHERE id = ?";

    pool.query(softDeleteQuery, [course_topicId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/course-topic-list");
      }
    });

    req.flash("success", "Course Topic soft deleted successfully");
    return res.redirect("/admin/course-topic-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/course-topic-list`);
  }
};

// Restore Course Topic
const Restore = async (req, res) => {
  try {
    const course_topicId = req.params.course_topicId;

    const restoreQuery = "UPDATE course_topics SET deleted_at = null WHERE id = ?";

    pool.query(restoreQuery, [course_topicId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/course-topic-list");
      }
    });

    req.flash("success", "Course Topic restored successfully");
    return res.redirect("/admin/course-topic-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/course-topic-list`);
  }
};

// Permanent Delete Course Topic
const PermanentDelete = async (req, res) => {
  try {
    const course_topicId = req.params.course_topicId;

    const deleteQuery = "DELETE FROM course_topics WHERE id = ?";

    pool.query(deleteQuery, [course_topicId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/course-topic-list");
      }
    });

    req.flash("success", "Course Topic deleted successfully");
    return res.redirect("/admin/course-topic-list");
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect(`/admin/course-topic-list`);
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
const getSubjectFromTable = async () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM course_subjects WHERE status = 1 AND deleted_at IS NULL`;
    pool.query(query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const getChapterFromTable = async () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM course_chapters WHERE status = 1 AND deleted_at IS NULL`;
    pool.query(query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};


module.exports = {
  Create,
  List,
  Edit,
  Update,
  Delete,
  Restore,
  PermanentDelete,
};
