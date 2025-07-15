const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const Helper = require("../../helpers/Helper");
const { validateRequiredFields } = require("../../helpers/validationsHelper");
const List = async (req, res) => {
  try {
    const status = req.query.status;
    const courseId = req.params.postId;
    console.log(courseId);
    // Build WHERE clause safely
    let deletedCondition = status === "trashed" ? "IS NOT NULL" : "IS NULL";
    const query = `
  SELECT cs.*, c.course_name, s.subject_name
  FROM course_chapters cs
  LEFT JOIN courses c ON cs.course_id = c.id
  LEFT JOIN course_subjects s ON cs.subject_id = s.id
  WHERE cs.deleted_at ${deletedCondition} AND cs.course_id = ?
  ORDER BY cs.id DESC
`;

    // Execute query using prepared statement
    const course_subjects = await new Promise((resolve, reject) => {
      pool.query(query, [courseId], (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });
  
    const page_name = "Course Chapter";
    const course = await Helper.getCourseDetails(courseId);
    const subjectCount = await Helper.getSubjectCountByCourseId(courseId);

    const chapterCount = await Helper.getChapterCountByCourseId(courseId);
    const pdfCount = await Helper.getPdfCountByCourseId(courseId);
    const videoCount = await Helper.getVideoCountByCourseId(courseId);
    const bookingCount = await Helper.getBookingCountByCourseId(courseId);
    const testCount = await Helper.getTestCountByCourseId(courseId);

    const liveClassCount  = await Helper.getLiveClassCountByCourseId(courseId);
    res.render("admin/course-chapter/list", {
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
      testCount,
      bookingCount,
      liveClassCount,
      list_url: `/admin/course-chapter-list/${courseId}`,
      trashed_list_url: `/course-chapter-list/${courseId}?status=trashed`,
      create_url: `/admin/course-chapter-create/${courseId}`,
    });
  } catch (error) {
    console.error("Course chapter List Error:", error);
    req.flash("error", error.message);
    res.redirect(
      req.get("Referrer") || `/admin/course-chapter-list/${req.params.postId}`
    );
  }
};

const Create = async (req, res) => {
  try {
    const courseId = req.params.postId;
    const categories = await getCategoriesFromTable();
    const courses = await getCourseFromTable();
    const subjects = await getSubjectFromTable(courseId);
    const course = await Helper.getCourseDetails(courseId);
    let post = {};

    res.render("admin/course-chapter/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/course-chapter-update",
      page_name: "Create Course Chapter",
      action: "Create",
      title: "Course Chapter",
      post: post,
      course,
      categories: categories,
      courses: courses,
      subjects: subjects,
    });
  } catch (error) {
    console.log(error.message);
    req.flash("error", "An error occurred while fetching data.");
    res.redirect("/admin/course-chapter-list");
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
const getSubjectFromTable = async (course_id) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM course_subjects 
      WHERE status = 1 AND course_id = ? AND deleted_at IS NULL
    `;
    pool.query(query, [course_id], (err, result) => {
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

    const getCourseSubjectQuery = "SELECT * FROM course_chapters WHERE id = ?";

    const post = await new Promise((resolve, reject) => {
      pool.query(getCourseSubjectQuery, [postId], (error, result) => {
        if (error) {
          req.flash("error", error.message);
          return reject(error);
        }
        if (result.length === 0) {
          req.flash("error", "Course Chapter not found.");
          return reject(new Error("Course Chapter not found"));
        }
        resolve(result[0]);
      });
    });

    // Also fetch all courses for dropdown
    const courses = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT id, course_name FROM courses WHERE deleted_at IS NULL",
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
    const subjects = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT id, subject_name FROM course_subjects WHERE course_id = ? AND deleted_at IS NULL",
        [post.course_id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });
    const course = await Helper.getCourseDetails(post.course_id);
    res.render("admin/course-chapter/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      post,
      courses,
      course,
      form_url: "/admin/course-chapter-update/" + postId,
      page_name: "Edit",
      action: "Update",
      title: "Course Chapter",
      courses: courses,
      subjects: subjects,
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || "/admin/course-chapter-list");
  }
};

const Update = async (req, res) => {
  const course_chapterId = req.params.postId;
  const isInsert =
    !course_chapterId ||
    course_chapterId === "null" ||
    course_chapterId === "0";

  const { course_id, subject_id, chapter_name, status } = req.body;

  const errors = {};

  if (!course_id?.trim()) errors.course_id = ["Course is required"];
  if (!subject_id?.trim()) errors.subject_id = ["Subject is required"];

  if (isInsert) {
    if (
      !Array.isArray(chapter_name) ||
      chapter_name.some((name) => !name.trim())
    ) {
      errors.chapter_name = ["All chapter names are required"];
    }
  } else {
    if (!chapter_name?.trim())
      errors.chapter_name = ["Chapter name is required"];
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
      const values = chapter_name.map((name) => [
        course_id,
        subject_id,
        name.trim(),
        status,
      ]);
      const insertQuery = `INSERT INTO course_chapters (course_id, subject_id, chapter_name, status) VALUES ?`;

      pool.query(insertQuery, [values], (err) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Insert failed" });
        }
        const courseId = req.params.course_id || req.body.course_id; // or wherever you get it from
        return res.json({
          success: true,
          redirect_url: `/admin/course-chapter-list/${courseId}`,
          message: "Chapters added successfully",
        });
      });
    } else {
      const updateQuery = `UPDATE course_chapters SET course_id = ?, subject_id = ?, chapter_name = ?, status = ? WHERE id = ?`;
      const values = [
        course_id,
        subject_id,
        chapter_name.trim(),
        status,
        course_chapterId,
      ];

      pool.query(updateQuery, values, (err) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ success: false, message: "Update failed" });
        }
        const courseId = req.params.course_id || req.body.course_id; // or wherever you get it from
        return res.json({
          success: true,

          // redirect_url: "/admin/course-chapter-list",
          redirect_url: `/admin/course-chapter-list/${courseId}`,
          message: "Chapter updated successfully",
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
    const chapterId = req.params.postId;

    // Step 1: Get course_id from the course_chapters table
    const getCourseQuery = "SELECT course_id FROM course_chapters WHERE id = ?";
    const courseResult = await new Promise((resolve, reject) => {
      pool.query(getCourseQuery, [chapterId], (error, result) => {
        if (error) return reject(error);
        resolve(result[0]); // assuming one record
      });
    });

    const courseId = courseResult?.course_id || null;

    // Step 2: Soft delete the chapter
    const softDeleteQuery =
      "UPDATE course_chapters SET deleted_at = NOW() WHERE id = ?";
    await new Promise((resolve, reject) => {
      pool.query(softDeleteQuery, [chapterId], (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });

    req.flash("success", "Course Chapter soft deleted successfully");
    return res.redirect(`/admin/course-chapter-list/${courseId}`);
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal server error");
    return res.redirect(`/admin/course-chapter-list`);
  }
};

const Restore = async (req, res) => {
  try {
    const chapterId = req.params.chapterId;

    const restoreQuery =
      "UPDATE course_chapters SET deleted_at = NULL WHERE id = ?";

    pool.query(restoreQuery, [chapterId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/course-chapter-list");
      }

      req.flash("success", "Chapter restored successfully");
      return res.redirect("/admin/course-chapter-list");
    });
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect("/admin/course-chapter-list");
  }
};

const PermanentDelete = async (req, res) => {
  try {
    const chapterId = req.params.chapterId;

    const deleteQuery = "DELETE FROM course_chapters WHERE id = ?";

    pool.query(deleteQuery, [chapterId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/course-chapter-list");
      }

      req.flash("success", "Chapter permanently deleted");
      return res.redirect("/admin/course-chapter-list");
    });
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect("/admin/course-chapter-list");
  }
};

const Show = async (req, res) => {
  const chapterId = req.params.chapterId;

  try {
    const query = `
      SELECT 
        course_chapters.*, 
        courses.course_name,
        subjects.subject_name
      FROM course_chapters
      LEFT JOIN courses ON course_chapters.course_id = courses.id
      LEFT JOIN subjects ON course_chapters.subject_id = subjects.id
      WHERE course_chapters.id = ?
      LIMIT 1
    `;

    const chapter = await new Promise((resolve, reject) => {
      pool.query(query, [chapterId], (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        if (result.length === 0) {
          req.flash("error", "Chapter not found");
          return reject(new Error("Chapter not found"));
        }
        resolve(result[0]);
      });
    });

    res.render("admin/course-chapter/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      chapter,
      req,
      page_name: "Chapter Details",
      back_url: "/admin/course-chapter-list",
    });
  } catch (error) {
    console.error("Chapter Show Error:", error);
    req.flash("error", error.message);
    res.redirect("/admin/course-chapter-list");
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
