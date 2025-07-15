const pool = require("../../db/database");
const randomstring = require("randomstring");
const jwt = require("jsonwebtoken");
const Helper = require('../../helpers/Helper')
const { validateRequiredFields } = require("../../helpers/validationsHelper");

const List = async (req, res) => {
  try {
    const status = req.query.status;
  const courseId = req.params.courseId;
  let where = `WHERE ch.course_id = ?`;

  if (status === "trashed") {
    where += ` AND ch.deleted_at IS NOT NULL`;
  } else {
    where += ` AND ch.deleted_at IS NULL`;
  }

  const query = `
  SELECT 
    ch.*, 
    c.course_name, 
    s.subject_name, 
    cc.chapter_name  -- or any other field from course_chapters
  FROM course_pdf ch
  LEFT JOIN courses c ON ch.course_id = c.id
  LEFT JOIN course_subjects s ON ch.subject_id = s.id
  LEFT JOIN course_chapters cc ON ch.chapter_id = cc.id
  ${where}
  ORDER BY ch.id DESC
`;

  const page_name =
    status === "trashed" ? "Trashed PDF List" : "Course PDF List";

  const chapters = await new Promise((resolve, reject) => {
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

        const  liveClassCount  = await Helper.getLiveClassCountByCourseId(courseId);
       
    res.render("admin/course-pdf/list", {
      success: req.flash("success"),
      error: req.flash("error"),
      chapters, // This matches your EJS template variable
      showTrash: status === "trashed",
      req,
      page_name,
      course,
      subjectCount,
      chapterCount,
         pdfCount,
      videoCount,
       bookingCount,
       testCount,
       liveClassCount,
      title : "Chapter PDF List",
      list_url: "/admin/course-pdf-list",
      trashed_list_url: "/admin/course-pdf-list/?status=trashed",
      create_url: `/admin/course-pdf-create/${courseId}`,
    });
  } catch (error) {
    console.error("Chapter List Error:", error);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || "/admin/course-pdf-list");
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

    console.log(courseId);
    const categories = await getCategoriesFromTable();
    const courses = await getCourseFromTable();
    const subjects = await getSubjectFromTable(courseId);
    
   // const chapters = await getChapterDataFromTable(courseId);

        const chapters = [];
    const topics = await getTopicFromTable();
   

    let post = {};
     const course = await Helper.getCourseDetails(courseId);

     console.log(courseId);

    res.render("admin/course-pdf/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      form_url: "/admin/course-pdf-update",
      page_name: "Create Chapter PDF",
      action: "Create",
      title: "Chapter PDF",
      post: post,
      course,
      categories: categories,
      courses: courses,
      subjects: subjects,
      chapters: chapters,
      topics: topics,
    });
  } catch (error) {
    console.log(error.message);
    req.flash("error", "An error occurred while fetching data.");
    res.redirect("/admin/course-pdf-list");
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
     
    const getCourseSubjectQuery = "SELECT * FROM course_pdf WHERE id = ?";

    const post = await new Promise((resolve, reject) => {
      pool.query(getCourseSubjectQuery, [postId], (error, result) => {
        if (error) {
          req.flash("error", error.message);
          return reject(error);
        }
        if (result.length === 0) {
          req.flash("error", "Chapter PDF not found.");
          return reject(new Error("Chapter PDF not found"));
        }
        resolve(result[0]);
      });
    });
   
    // Also fetch all courses for dropdown
    const courses = await new Promise((resolve, reject) => {
      pool.query("SELECT id, course_name FROM courses WHERE deleted_at IS NULL", (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
   const subjects = await new Promise((resolve, reject) => {
  pool.query(
    "SELECT id, subject_name FROM course_subjects WHERE course_id = ? AND deleted_at IS NULL",
    [post.course_id], // parameterized query to prevent SQL injection
    (err, result) => {
      if (err) return reject(err);
      resolve(result);
    }
  );
});
    const topics = await new Promise((resolve, reject) => {
      pool.query("SELECT id, topic_name FROM course_topics WHERE deleted_at IS NULL", (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
       const chapters = await getChapterDataBySubject(post.subject_id);
    const categories = await new Promise((resolve, reject) => {
      pool.query("SELECT id, category_name FROM categories WHERE deleted_at IS NULL", (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
     const course = await Helper.getCourseDetails(post.course_id);

     console.log(course); 
    res.render("admin/course-pdf/create", {
      success: req.flash("success"),
      error: req.flash("error"),
      post,
      courses,
      form_url: "/admin/course-pdf-update/" + postId,
      page_name: "Edit",
      action: "Update",
      title: "Chapter PDF",
      course,
      categories: categories,
      courses: courses,
      subjects: subjects,
      topics: topics,
      chapters
    });
  } catch (error) {
    console.error("Edit Error:", error.message);
    req.flash("error", error.message);
    res.redirect(req.get("Referrer") || "/admin/course-pdf-list");
  }
};

const Update = async (req, res) => {
  const chapter_pdfId = req.params.postId;
  const isInsert = !chapter_pdfId || chapter_pdfId === "null" || chapter_pdfId === "0";

  const { course_id, subject_id, chapter_id, title,  status } = req.body;
  const pdfFile = req?.files?.pdf?.[0];

  const errors = {};

  // ✅ Basic validation
  if (!course_id?.trim()) errors.course_id = ["Course is required"];
  if (!subject_id?.trim()) errors.subject_id = ["Subject is required"];
  if (!chapter_id?.trim()) errors.chapter_id = ["Chapter is required"];
  if (!["0", "1"].includes(status)) errors.status = ["Status must be '0' or '1'"];
  if (isInsert && !pdfFile) errors.pdf = ["PDF file is required"];

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      success: false,
      errors,
      message: Object.values(errors)[0][0],
    });
  }

  try {
    if (isInsert) {
      // INSERT mode
      const pdfPath = pdfFile ? `/uploads/course-pdf/${pdfFile.filename}` : null;

      const insertQuery = `
        INSERT INTO course_pdf (course_id, subject_id, chapter_id, title,status, pdf)
        VALUES (?, ?, ?, ?, ?,?)
      `;

      pool.query(
        insertQuery,
        [course_id.trim(), subject_id.trim(), chapter_id.trim(), title,status, pdfPath],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Insert failed" });
          }
          const courseId = req.params.course_id || req.body.course_id; // or wherever you get it from
          return res.json({
            success: true,

              redirect_url: `/admin/course-pdf-list/${courseId}`,
            message: "Chapter PDF added successfully",
          });
        }
      );
    } else {
      // UPDATE mode
      const updateFields = ["course_id", "subject_id", "chapter_id", "status"];
      const values = [
        course_id.trim(),
        subject_id.trim(),
        chapter_id.trim(),
        status
      ];

      if (pdfFile) {
        updateFields.push("pdf");
        values.push(`/uploads/course-pdf/${pdfFile.filename}`);
      }

      values.push(chapter_pdfId); // ID for WHERE clause

      const setClause = updateFields.map(field => `${field} = ?`).join(", ");
      const updateQuery = `UPDATE course_pdf SET ${setClause} WHERE id = ?`;

      pool.query(updateQuery, values, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false, message: "Update failed" });
        }
         const courseId = req.params.course_id || req.body.course_id; // or wherever you get it from
        return res.json({
          success: true,
                   redirect_url: `/admin/course-pdf-list/${courseId}`,
          message: "Chapter PDF updated successfully",
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
    const pdfId = req.params.postId;

    // Get course_id from course_pdf table
    const getCourseQuery = "SELECT course_id FROM course_pdf WHERE id = ?";
    const courseResult = await new Promise((resolve, reject) => {
      pool.query(getCourseQuery, [pdfId], (error, result) => {
        if (error) return reject(error);
        resolve(result[0]); // assuming one row
      });
    });

    const courseId = courseResult?.course_id || null;

    // Soft delete the course_pdf entry
    const softDeleteQuery = "UPDATE course_pdf SET deleted_at = NOW() WHERE id = ?";
    await new Promise((resolve, reject) => {
      pool.query(softDeleteQuery, [pdfId], (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });

    req.flash("success", "Chapter PDF soft deleted successfully");
    return res.redirect(`/admin/course-pdf-list/${courseId}`);
  } catch (error) {
    console.error(error);
    req.flash("error", "Internal server error");
    return res.redirect(`/admin/course-pdf-list`);
  }
};

const Restore = async (req, res) => {
  try {
    const chapterId = req.params.chapterId;

    const restoreQuery = "UPDATE course_pdf SET deleted_at = NULL WHERE id = ?";

    pool.query(restoreQuery, [chapterId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/course-pdf-list");
      }

      req.flash("success", "Chapter restored successfully");
      return res.redirect("/admin/course-pdf-list");
    });
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect("/admin/course-pdf-list");
  }
};

const PermanentDelete = async (req, res) => {
  try {
    const chapterId = req.params.chapterId;

    const deleteQuery = "DELETE FROM course_pdf WHERE id = ?";

    pool.query(deleteQuery, [chapterId], (error, result) => {
      if (error) {
        console.error(error);
        req.flash("error", "Internal server error");
        return res.redirect("/admin/course-pdf-list");
      }

      req.flash("success", "Chapter permanently deleted");
      return res.redirect("/admin/course-pdf-list");
    });
  } catch (error) {
    req.flash("error", error.message);
    return res.redirect("/admin/course-pdf-list");
  }
};



const Show = async (req, res) => {
  const chapterId = req.params.chapterId;

  try {
    const query = `
      SELECT 
        course_pdf.*, 
        courses.course_name,
        subjects.subject_name
      FROM course_pdf
      LEFT JOIN courses ON course_pdf.course_id = courses.id
      LEFT JOIN subjects ON course_pdf.subject_id = course_subjects.id
      WHERE course_pdf.id = ?
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

    res.render("admin/course-pdf/show", {
      success: req.flash("success"),
      error: req.flash("error"),
      chapter,
      req,
      page_name: "Chapter Details",
      back_url: "/admin/course-pdf-list",
    });
  } catch (error) {
    console.error("Chapter Show Error:", error);
    req.flash("error", error.message);
    res.redirect("/admin/course-pdf-list");
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
