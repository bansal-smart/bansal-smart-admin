// Full CRUD Module for Live Class Management

const pool = require("../../db/database");
const randomstring = require("randomstring");
const Helper = require("../../helpers/Helper");
const jwt = require("jsonwebtoken");
const { validateRequiredFields } = require("../../helpers/validationsHelper");

const handleError = (res, error, context = "Unknown") => {
  console.error(`Error in ${context}:`, error);
  res.status(500).render("admin/error", {
    title: "Server Error",
    page_name: `${module_name} - ${context}`,
    error_message: error.message,
    stack: error.stack,
    full_error: error,
  });
};

const table_name = "live_classes";
const folder_path = "live-class";
const module_name = "Live Class";
const module_title = "Live Class";
const route = "live-class";
const actions_url = `/admin/${folder_path}`;

const List = async (req, res) => {
  try {
    const status = req.query.status || "active";
    const courseId = req.params.courseId || null;

    let where = `WHERE ch.deleted_at IS NULL`;
    const params = [];

    if (status === "trashed") {
      where = `WHERE ch.deleted_at IS NOT NULL`;
    }

    if (courseId) {
      where += ` AND ch.course_id = ?`;
      params.push(courseId);
    }

    const query = `
      SELECT 
        ch.*, 
        c.course_name, 
        s.subject_name, 
        cc.chapter_name
      FROM ${table_name} ch
      LEFT JOIN courses c ON ch.course_id = c.id
      LEFT JOIN course_subjects s ON ch.subject_id = s.id
      LEFT JOIN course_chapters cc ON ch.chapter_id = cc.id
      ${where}
      ORDER BY ch.id DESC
    `;

    const items = await new Promise((resolve, reject) => {
      pool.query(query, params, (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        resolve(result);
      });
    });

    // Optional course-related stats
    let course = null,
      subjectCount = 0,
      chapterCount = 0,
      pdfCount = 0,
      videoCount = 0,
      bookingCount = 0,
      testCount = 0;
      liveClassCount = 0;

    if (courseId) {
      course = await Helper.getCourseDetails(courseId);
      subjectCount = await Helper.getSubjectCountByCourseId(courseId);
      chapterCount = await Helper.getChapterCountByCourseId(courseId);
      pdfCount = await Helper.getPdfCountByCourseId(courseId);
      videoCount = await Helper.getVideoCountByCourseId(courseId);
      bookingCount = await Helper.getBookingCountByCourseId(courseId);
      testCount = await Helper.getTestCountByCourseId(courseId);
      liveClassCount  = await Helper.getLiveClassCountByCourseId(courseId);
    }

    res.render(`admin/${folder_path}/list`, {
      success: req.flash("success"),
      error: req.flash("error"),
      page_name: `${module_name} List`,
      title: `${module_name} List`,
      req,
      items, // ✅ fixed: passing data as 'items'
      course,
      subjectCount,
      chapterCount,
      pdfCount,
      videoCount,
      bookingCount,
      testCount,
      liveClassCount,
      route,
      status,
      showTrash: status === "trashed",
      create_url: courseId ? `/admin/${route}-create/${courseId}` : `/admin/${route}-create`,
      list_url: courseId ? `/admin/${route}-list/${courseId}` : `/admin/${route}-list`,
      trashed_list_url: courseId
        ? `/admin/${route}-list/${courseId}?status=trashed`
        : `/admin/${route}-list?status=trashed`,
    });
  } catch (error) {
    handleError(res, error, "List");
  }
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
const Create = async (req, res) => {
  try {
    const courseId = req.params.courseId;

    const categories = await getCategoriesFromTable();
    const courses = await getCourseFromTable();
    const subjects = await getSubjectFromTable(courseId);
    const chapters = []; // optional: await getChapterDataFromTable(courseId);
    const topics = await getTopicFromTable();
    const course = await Helper.getCourseDetails(courseId);

    const post = {};

    res.render(`admin/${folder_path}/create`, {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: `${actions_url}-update`, // 🔁 dynamic form action
      page_name: `Create ${module_name}`,
      action: "Create",
      title: `${module_name} Form`,
      post,
      course,
      categories,
      courses,
      subjects,
      chapters,
      topics,
    });
  } catch (error) {
    handleError(res, error, "Create");
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

const getTopicFromTable = async () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM course_topics WHERE status = 1 AND deleted_at IS NULL`;
    pool.query(query, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};
const getChapterDataFromTable = async (course_id) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM course_chapters WHERE status = 1 AND course_id = ? AND deleted_at IS NULL`;
    pool.query(query, [course_id], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const getChapterDataBySubject = async (subject_id) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM course_chapters WHERE status = 1 AND subject_id = ? AND deleted_at IS NULL`;
    pool.query(query, [subject_id], (err, result) => {
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

    const getLiveClassQuery = `SELECT * FROM ${table_name} WHERE id = ?`;

    const post = await new Promise((resolve, reject) => {
      pool.query(getLiveClassQuery, [postId], (error, result) => {
        if (error) {
          req.flash("error", error.message);
          return reject(error);
        }
        if (result.length === 0) {
          req.flash("error", `${module_name} not found.`);
          return reject(new Error(`${module_name} not found.`));
        }
        resolve(result[0]);
      });
    });

    // Fetch all courses for dropdown
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

    const chapters = await getChapterDataBySubject(post.subject_id);

    const topics = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT id, topic_name FROM course_topics WHERE deleted_at IS NULL",
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    const categories = await new Promise((resolve, reject) => {
      pool.query(
        "SELECT id, category_name FROM categories WHERE deleted_at IS NULL",
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    const course = await Helper.getCourseDetails(post.course_id);

    res.render(`admin/${folder_path}/create`, {
      success: req.flash("success"),
      error: req.flash("error"),
      post,
      form_url: `${actions_url}-update/${postId}`,
      page_name: `Edit ${module_name}`,
      action: "Update",
      title: module_name,
      course,
      categories,
      courses,
      subjects,
      topics,
      chapters,
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || `${actions_url}/list`);
  }
};

const Update = async (req, res) => {
  const postId = req.params.postId;
  const isInsert = !postId || postId === "null" || postId === "0";

  const { course_id, subject_id, chapter_id, title, class_time, link, status } =
    req.body;

  const imageFile = req?.files?.image?.[0];
  const errors = {};

  // ✅ Basic validation
  if (!course_id?.trim()) errors.course_id = ["Course is required"];
  if (!subject_id?.trim()) errors.subject_id = ["Subject is required"];
  if (!chapter_id?.trim()) errors.chapter_id = ["Chapter is required"];
  if (!title?.trim()) errors.title = ["Title is required"];
  if (!class_time?.trim()) errors.class_time = ["Class time is required"];
  if (!link?.trim()) errors.link = ["Class link is required"];
  if (!["0", "1"].includes(status)) errors.status = ["Status must be 0 or 1"];

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  try {
    if (isInsert) {
      // INSERT
      const imagePath = imageFile
        ? `/uploads/${folder_path}/${imageFile.filename}`
        : null;

      const insertQuery = `
        INSERT INTO ${table_name} (
          course_id, subject_id, chapter_id,
          title, class_time, link, status, image
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      pool.query(
        insertQuery,
        [
          course_id.trim(),
          subject_id.trim(),
          chapter_id.trim(),
          title.trim(),
          class_time.trim(),
          link.trim(),
          status,
          imagePath,
        ],
        (err) => {
          if (err) {
            console.error("Insert Error:", err);
            return res
              .status(500)
              .json({ success: false, message: "Insert failed" });
          }

          return res.json({
            success: true,
            redirect_url: `${actions_url}-list/${course_id}`,
            message: `${module_name} added successfully`,
          });
        }
      );
    } else {
      // UPDATE
      const updateFields = [
        "course_id",
        "subject_id",
        "chapter_id",
        "title",
        "class_time",
        "link",
        "status",
      ];
      const values = [
        course_id.trim(),
        subject_id.trim(),
        chapter_id.trim(),
        title.trim(),
        class_time.trim(),
        link.trim(),
        status,
      ];

      if (imageFile) {
        updateFields.push("image");
        values.push(`/uploads/${folder_path}/${imageFile.filename}`);
      }

      values.push(postId);

      const setClause = updateFields.map((field) => `${field} = ?`).join(", ");
      const updateQuery = `UPDATE ${table_name} SET ${setClause} WHERE id = ?`;

      pool.query(updateQuery, values, (err) => {
        if (err) {
          console.error("Update Error:", err);
          return res
            .status(500)
            .json({ success: false, message: "Update failed" });
        }

        return res.json({
          success: true,
          redirect_url: `${actions_url}-list/${course_id}`,
          message: `${module_name} updated successfully`,
        });
      });
    }
  } catch (err) {
    console.error("Catch Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const Show = async (req, res) => {
  const postId = req.params.postId;

  try {
    const query = `
  SELECT 
    ${table_name}.*, 
    courses.course_name,
    course_subjects.subject_name,
    course_chapters.chapter_name
  FROM ${table_name}
  LEFT JOIN courses ON ${table_name}.course_id = courses.id
  LEFT JOIN course_subjects ON ${table_name}.subject_id = course_subjects.id
  LEFT JOIN course_chapters ON ${table_name}.chapter_id = course_chapters.id
  WHERE ${table_name}.id = ?
  LIMIT 1
`;

    const post = await new Promise((resolve, reject) => {
      pool.query(query, [postId], (err, result) => {
        if (err) {
          req.flash("error", err.message);
          return reject(err);
        }
        if (result.length === 0) {
          req.flash("error", `${module_name} not found`);
          return reject(new Error(`${module_name} not found`));
        }
        resolve(result[0]);
      });
    });

    res.render(`admin/${folder_path}/show`, {
      success: req.flash("success"),
      error: req.flash("error"),
      post,
      req,
      page_name: `${module_name} Details`,
      back_url: `${actions_url}/list`,
      title: `${module_name} Details`,
    });
  } catch (error) {
    console.error(`${module_name} Show Error:`, error);
    req.flash("error", error.message);
    res.redirect(`${actions_url}/list`);
  }
};
const Delete = async (req, res) => {
  try {
    const postId = req.params.postId;
    const liveClass = await Helper.getLiveClassDetails(postId); // updated method name
    const courseId = liveClass?.course_id || 0;

    await Helper.handleTableAction({
      req,
      res,
      action: "soft-delete",
      table_name,
      redirectUrl: `${actions_url}-list/${courseId}`,
      title: module_name,
    });
  } catch (error) {
    handleError(res, error, "Delete");
  }
};

// ♻️ Restore
const Restore = async (req, res) => {
  try {
    const postId = req.params.postId;
    const liveClass = await Helper.getLiveClassDetails(postId); // updated method name
    const courseId = liveClass?.course_id || 0;

    await Helper.handleTableAction({
      req,
      res,
      action: "restore",
      table_name,
      redirectUrl: `${actions_url}-list/${courseId}`,
      title: module_name,
    });
  } catch (error) {
    handleError(res, error, "Restore");
  }
};

// ❌ Permanent Delete
const PermanentDelete = async (req, res) => {
  try {
    const postId = req.params.postId;
    const liveClass = await Helper.getLiveClassDetails(postId); // updated method name
    const courseId = liveClass?.course_id || 0;

    await Helper.handleTableAction({
      req,
      res,
      action: "delete",
      table_name,
      redirectUrl: `${actions_url}-list/${courseId}`,
      title: module_name,
    });
  } catch (error) {
    handleError(res, error, "Permanent Delete");
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
