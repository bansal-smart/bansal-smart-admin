const pool = require("../db/database"); // Ensure this is your configured MySQL pool
const { format } = require("date-fns"); // For date formatting
const { BASE_URL, PUBLIC_PATH } = require("../config/constants");
// Helper function to format dates as "MM/dd/yyyy hh:mm AM/PM"
function formatDate(dateString) {
  const date = new Date(dateString);
  return format(date, "MM/dd/yyyy hh:mm a");
}

// Fetch active categories by type with optional selected columns
async function getActiveCategoriesByType(type = "course", columns = []) {
  try {
    const selectFields = columns.length > 0 ? columns.join(", ") : "*";
    const query = `SELECT ${selectFields} FROM categories WHERE status = 1 AND deleted_at IS NULL AND category_type = ?`;
    const [rows] = await pool.promise().execute(query, [type]);
    return rows;
  } catch (error) {
    console.error("Error fetching active categories by type:", error);
    throw error;
  }
}

// Fetch all active course classes
async function getActiveCourseClasses(category_id = null) {
  try {
    let query = `SELECT * FROM course_classes WHERE status = 1 AND deleted_at IS NULL`;
    const params = [];

    if (category_id) {
      query += ` AND category_id = ?`;
      params.push(category_id);
    }

    const [rows] = await pool.promise().execute(query, params);
    return rows;
  } catch (error) {
    console.error("Error fetching active course classes:", error);
    throw error;
  }
}

// Fetch all active faculties
async function getActiveFaculties() {
  try {
    const query = `SELECT * FROM faculties WHERE status = 1 AND deleted_at IS NULL`;
    const [rows] = await pool.promise().execute(query);
    return rows;
  } catch (error) {
    console.error("Error fetching active faculties:", error);
    throw error;
  }
}

// Fetch all active test series
async function getActiveTestSeries() {
  try {
    const query = `
      SELECT 
        ts.*, 
        c.category_name 
      FROM 
        test_series ts
      JOIN 
        categories c ON ts.category_id = c.id
      WHERE 
        ts.status = 1 
        AND ts.deleted_at IS NULL
    `;
    const [rows] = await pool.promise().execute(query);
    return rows;
  } catch (error) {
    console.error("Error fetching active test series with category:", error);
    throw error;
  }
}

async function getActiveLiveTest() {
  try {
    const query = `
      SELECT 
        ts.*, 
        c.category_name 
      FROM 
        live_test ts
      JOIN 
        categories c ON ts.category_id = c.id
      WHERE 
        ts.status = 1 
        AND ts.test_location = "live-test"
        AND ts.deleted_at IS NULL
    `;
    const [rows] = await pool.promise().execute(query);
    return rows;
  } catch (error) {
    console.error("Error fetching active test series with category:", error);
    throw error;
  }
}

const getLiveTestDetails = async (id) => {
  try {
    // Step 1: Get the live test details with category name
    const [rows] = await pool.promise().execute(
      `
      SELECT 
        ts.*, 
        c.category_name 
      FROM 
        live_test ts
      LEFT JOIN 
        categories c ON ts.category_id = c.id
      WHERE 
        ts.id = ? 
        AND ts.status = 1 
        AND ts.deleted_at IS NULL
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) return null;

    const liveTest = rows[0];

    // Step 2: Calculate pricing, GST, discount if applicable
    const discountAmount = 0; // Modify this if you have discount logic
    const gstPercentage = 18;
    const gstAmount = Math.round((liveTest.offer_price * gstPercentage) / 100);
    const totalAmount = liveTest.offer_price + gstAmount;

    liveTest.discount_amount = discountAmount;
    liveTest.gst_percentage = gstPercentage;
    liveTest.gst_amount = gstAmount;
    liveTest.total_amount = totalAmount;

    // Step 3: Fetch total number of questions in the test
    const [questionCountRows] = await pool.promise().query(
      `
      SELECT COUNT(*) as no_of_questions 
      FROM live_test_questions 
      WHERE test_id = ?
      `,
      [id]
    );

    liveTest.no_of_questions =
      questionCountRows.length > 0 ? questionCountRows[0].no_of_questions : 0;

    return liveTest;
  } catch (error) {
    console.error("Error fetching live test details:", error);
    throw error;
  }
};


const getTestSeriesBySlug = async (slug) => {
  try {
    const [rows] = await pool.promise().execute(
      `
      SELECT 
        ts.*, 
        c.category_name 
      FROM 
        test_series ts
      LEFT JOIN 
        categories c ON ts.category_id = c.id
      WHERE 
        ts.slug = ? 
        AND ts.status = 1 
      LIMIT 1
      `,
      [slug]
    );

    if (rows.length === 0) return null;

    const course = rows[0];

    // 💰 Apply discount and GST calculations
    const discountAmount = 0; // Adjust logic as needed
    const gstPercentage = 18;
    const gstAmount = Math.round((course.offer_price * gstPercentage) / 100);
    const totalAmountWithGST = course.offer_price + gstAmount;

    course.discount_amount = discountAmount;
    course.gst_per = gstPercentage;
    course.gst_amount = gstAmount;
    course.total_amount = totalAmountWithGST;

    const [exams] = await pool.promise().execute(
      `
  SELECT 
    tst.*,
    COUNT(ltq.id) AS total_active_questions
  FROM 
    test_series_test tst
  LEFT JOIN 
    live_test_questions ltq 
    ON ltq.test_id = tst.id AND ltq.status = 1
  WHERE 
    tst.test_series_id = ?
  GROUP BY 
    tst.id
  ORDER BY 
    tst.id ASC
  `,
      [course.id]
    );
    
    // ✅ Extract exam IDs
    const examIds = exams.map((exam) => exam.id);

    if (examIds.length > 0) {
      const [questionCountRows] = await pool.promise().query(
        `SELECT test_id, COUNT(*) as no_of_questions 
         FROM live_test_questions 
         WHERE test_id IN (?) 
         GROUP BY test_id`,
        [examIds]
      );

      // ✅ Convert to a map for easy access
      const questionCounts = questionCountRows.reduce((acc, row) => {
        acc[row.test_id] = row.no_of_questions;
        return acc;
      }, {});

      // ✅ Add question count to each exam
      exams.forEach((exam) => {
        exam.no_of_question = questionCounts[exam.id] || 0;
      });
    }

    course.exams = exams;
   

    return course;
  } catch (error) {
    console.error("Error fetching test series by slug:", error);
    throw error;
  }
};

async function getOtherActiveTestSeries(slug) {
  try {
    const query = `
      SELECT 
        ts.*, 
        c.category_name 
      FROM 
        test_series ts
      JOIN 
        categories c ON ts.category_id = c.id
      WHERE 
        ts.status = 1 
        AND ts.deleted_at IS NULL
        AND ts.slug != ?
    `;
    const [rows] = await pool.promise().execute(query, [slug]);
    return rows;
  } catch (error) {
    console.error("Error fetching active test series with category:", error);
    throw error;
  }
}
const getCoursesByCategoryId = async (categoryId, columns = []) => {
  try {
    // Select only requested columns or all
    const courseFields =
      columns.length > 0
        ? columns.map((col) => `c.\`${col}\``).join(", ")
        : "c.*";

    const selectFields = `${courseFields}, cat.category_name`;

    const query = `
      SELECT ${selectFields}
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.category_id = ? AND c.status = 1 AND c.deleted_at IS NULL
      ORDER BY c.id DESC
    `;

    const [courses] = await pool.promise().query(query, [categoryId]);
    return courses;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};

const getTestSeriesByCategoryId = async (categoryId, columns = []) => {
  try {
    // Always select course fields plus category name
    const courseFields =
      columns.length > 0
        ? columns.map((col) => `c.\`${col}\``).join(", ")
        : "c.*";

    // Add category name field
    const selectFields = `${courseFields}, cat.category_name`;

    const query = `
      SELECT ${selectFields}
      FROM test_series c
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.category_id = ? AND c.status = 1 AND c.deleted_at IS NULL
    `;

    const [courses] = await pool.promise().query(query, [categoryId]);
    return courses;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};


const getLiveTestByCategoryId = async (categoryId, columns = []) => {
  try {
    const courseFields =
      columns.length > 0
        ? columns.map((col) => `c.\`${col}\``).join(", ")
        : "c.*";

    const selectFields = `${courseFields}, cat.category_name`;

    const query = `
      SELECT ${selectFields}
      FROM live_test c
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.category_id = ? 
        AND c.status = 1 
        AND c.test_location = "live-test"
        AND c.deleted_at IS NULL
    `;

    const [courses] = await pool.promise().query(query, [categoryId]);
    return courses;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};

const getServicableCities = async (columns = []) => {
  try {
    const selectFields =
      columns.length > 0 ? "sc.id, " + columns.join(", ") : "sc.*";
    const query = `
      SELECT 
        ${selectFields},
        COUNT(c.id) AS total_centers
      FROM servicable_cities AS sc
      LEFT JOIN centers AS c ON c.city_id = sc.id AND c.status = 1 AND c.deleted_at IS NULL
      WHERE sc.status = 1
      AND sc.deleted_at IS NULL
      GROUP BY sc.id
    `;
    const [cities] = await pool.promise().query(query);
    return cities;
  } catch (error) {
    console.error("Error fetching servicable cities:", error);
    throw error;
  }
};

// Fetch all testimonials with optional selected columns
const getTestimonials = async (columns = []) => {
  try {
    const selectFields = columns.length > 0 ? columns.join(", ") : "*";
    const query = `SELECT ${selectFields} FROM testimonials WHERE 1`; // Add conditions if needed
    const [testimonials] = await pool.promise().query(query);
    return testimonials;
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    throw error;
  }
};

// Fetch all FAQs with optional selected columns
const getFaqs = async (columns = []) => {
  try {
    const selectFields = columns.length > 0 ? columns.join(", ") : "*";
    const query = `SELECT ${selectFields} FROM faqs WHERE status = 1 AND (deleted_at IS NULL OR deleted_at = '0')`;
    const [faqs] = await pool.promise().query(query);
    return faqs;
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    throw error;
  }
};

// Fetch all banners with optional selected columns
const getBanners = async (columns = [], filters = {}) => {
  try {
    const selectFields = columns.length > 0 ? columns.join(", ") : "*";
    let query = `SELECT ${selectFields} FROM banners WHERE status = 1 AND (deleted_at IS NULL OR deleted_at = '0')`;

    const filterKeys = Object.keys(filters);
    const values = [];

    filterKeys.forEach(key => {
      query += ` AND \`${key}\` = ?`;
      values.push(filters[key]);
    });

    const [banners] = await pool.promise().query(query, values);
    return banners;
  } catch (error) {
    console.error("Error fetching banners:", error);
    throw error;
  }
};
const getCourseBySlug = async (slug, columns = ["c.*"]) => {
  try {
    // Step 1: Get main course info
    const [courseRows] = await pool.promise().query(
      `SELECT ${columns.join(", ")}, 
                cat.category_name AS category_name, 
                cls.name AS class_name
         FROM courses c
         LEFT JOIN categories cat ON cat.id = c.category_id
         LEFT JOIN course_classes cls ON cls.id = c.course_class_id
         WHERE c.slug = ? 
         LIMIT 1`,
      [slug]
    );

    if (courseRows.length === 0) return null;

    const course = courseRows[0];
    
    // Step 2: Get subject names and count
    const [subjectData] = await pool.promise().query(
      `SELECT 
           GROUP_CONCAT(subject_name ORDER BY id ASC SEPARATOR ', ') AS subject_names,
           COUNT(*) AS subject_count
         FROM course_subjects 
         WHERE course_id = ?`,
      [course.id]
    );

    course.subject_names = subjectData[0].subject_names || "";

   
    course.subject_count = subjectData[0].subject_count || 0;

    // Step 3: Get video count
    const [videoData] = await pool
      .promise()
      .query(
        `SELECT COUNT(*) AS video_count FROM course_video WHERE course_id = ?`,
        [course.id]
      );

    course.video_count = videoData[0].video_count || 0;

    // Step 4: Get pdf count
    const [pdfData] = await pool
      .promise()
      .query(
        `SELECT COUNT(*) AS pdf_count FROM course_pdf WHERE course_id = ?`,
        [course.id]
      );

    course.pdf_count = pdfData[0].pdf_count || 0;

    return course;
  } catch (error) {
    console.error("Error in getCourseBySlug:", error);
    throw error;
  }
};

const getCourseDetails = async (id, columns = ["*"]) => {
  try {
    const [rows] = await pool
      .promise()
      .query(`SELECT ${columns.join(", ")} FROM courses WHERE id = ? LIMIT 1`, [
        id,
      ]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error in getCourseBySlug:", error);
    throw error;
  }
};

const getCenters = async (columns = [], citySlug) => {
  try {
    // Ensure columns is an array
    columns = Array.isArray(columns) ? columns : [];

    const selectFields = columns.length > 0 ? columns.join(", ") : "*";

    let query = `SELECT ${selectFields} FROM centers WHERE status = 1 AND (deleted_at IS NULL OR deleted_at = '0')`;
    let queryParams = [];

    if (citySlug) {
      // Step 1: Get city_id from slug
      const [cities] = await pool
        .promise()
        .query(
          `SELECT id FROM servicable_cities WHERE slug = ? AND (deleted_at IS NULL OR deleted_at = '0')`,
          [citySlug]
        );

      if (cities.length === 0) {
        throw new Error("City not found for the provided slug");
      }

      const city_id = cities[0].id;

      // Add filter by city_id
      query += ` AND city_id = ?`;
      queryParams.push(city_id);
    }

    const [centers] = await pool.promise().query(query, queryParams);
    return centers;
  } catch (error) {
    console.error("Error fetching centers:", error.message);
    throw error;
  }
};

const getCenterDetails = async (centerId, columns = []) => {
  try {
    // Ensure columns is an array
    columns = Array.isArray(columns) ? columns : [];

    const selectFields = columns.length > 0 ? columns.join(", ") : "*";

    const query = `
      SELECT ${selectFields} 
      FROM centers 
      WHERE id = ? AND status = 1 AND (deleted_at IS NULL OR deleted_at = '0')
      LIMIT 1
    `;

    const [results] = await pool.promise().query(query, [centerId]);

    if (results.length === 0) {
      return null; // Center not found or deleted/inactive
    }

    return results[0];
  } catch (error) {
    console.error("Error fetching center details:", error.message);
    throw error;
  }
};

const getCenterCourses = async (center_id) => {
  try {
    if (!center_id) throw new Error("Center ID is required");

    const query = `
      SELECT 
        c.*, 
        cat.category_name 
      FROM courses c
      LEFT JOIN categories cat ON c.category_id = cat.id
      WHERE 
        c.created_by = ? 
        AND (c.deleted_at IS NULL OR c.deleted_at = '0') 
        AND c.status = 1
      ORDER BY c.id DESC
    `;

    const [courses] = await pool.promise().query(query, [center_id]);

    return courses;
  } catch (error) {
    console.error("Error fetching center courses:", error.message);
    throw error;
  }
};

// const getCenters = async (columns = [], citySlug) => {
//   try {

//     // if (!citySlug) {
//     //   throw new Error("City slug is required");
//     // }

//     // Ensure columns is an array
//     columns = Array.isArray(columns) ? columns : [];

//     const selectFields = columns.length > 0 ? columns.join(", ") : "*";

//     // Step 1: Get city_id from slug
//     const [cities] = await pool.promise().query(
//       `SELECT id FROM servicable_cities WHERE slug = ? AND (deleted_at IS NULL OR deleted_at = '0')`,
//       [citySlug]
//     );

//     if (cities.length === 0) {
//       throw new Error("City not found for the provided slug");
//     }

//     const city_id = cities[0].id;

//     // Step 2: Get centers by city_id
//     let query = `SELECT ${selectFields} FROM centers WHERE status = 1 AND (deleted_at IS NULL OR deleted_at = '0') AND city_id = ?`;
//     const [centers] = await pool.promise().query(query, [city_id]);

//     return centers;
//   } catch (error) {
//     console.error("Error fetching centers:", error.message);
//     throw error;
//   }
// };

const getCategoryDetailsById = async (categoryId, columns = []) => {
  try {
    const selectFields = columns.length > 0 ? columns.join(", ") : "*";
    const query = `SELECT ${selectFields} FROM categories WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '0')`;
    const [categoryDetails] = await pool.promise().query(query, [categoryId]);
    return categoryDetails[0] || null;
  } catch (error) {
    console.error("Error fetching category details:", error);
    throw error;
  }
};

const getCourseClassDetailsById = async (categoryId, columns = []) => {
  try {
    const selectFields = columns.length > 0 ? columns.join(", ") : "*";
    const query = `SELECT ${selectFields} FROM course_classes WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '0')`;
    const [categoryDetails] = await pool.promise().query(query, [categoryId]);
    return categoryDetails[0] || null;
  } catch (error) {
    console.error("Error fetching category details:", error);
    throw error;
  }
};

// Get Center Details by ID
const getCenterDetailsById = async (centerId, columns = []) => {
  try {
    const selectFields =
      columns.length > 0
        ? `c.${columns.join(", c.")}`
        : "c.*";

    const query = `
      SELECT ${selectFields}
      FROM centers c
      WHERE c.id = ? AND (c.deleted_at IS NULL OR c.deleted_at = '0')
    `;

    const [centerDetails] = await pool.promise().query(query, [centerId]);
    return centerDetails[0] || null;
  } catch (error) {
    console.error("Error fetching center details:", error);
    throw error;
  }
};


const getCMSContentBySlug = async (slug) => {
  try {
    const query = `SELECT * FROM cms WHERE slug = ? LIMIT 1`;
    const [results] = await pool.promise().query(query, [slug]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error("Error fetching CMS content:", error);
    throw error;
  }
};

const checkImagePath = (relativePath) => {
  if (!relativePath) return false;
  const fullPath = path.join(
    __dirname,
    "..",
    "public",
    path.normalize(relativePath)
  );
  return fs.existsSync(fullPath);
};

const getActiveCouponList = async (type) => {
  try {
    const query = `
      SELECT * FROM coupons
      WHERE coupon_for = ? 
        AND status = '1' 
        AND deleted_at IS NULL 
        AND visibility = 'public'
        AND (end_date IS NULL OR end_date >= CURDATE())
      ORDER BY created_at DESC
    `;
    const [results] = await pool.promise().query(query, [type]);
    return results;
  } catch (error) {
    console.error("Error fetching active coupons:", error);
    throw error;
  }
};

const sendSuccess = (res, message, data = [], statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    base_url: BASE_URL,
    public_path: PUBLIC_PATH,
    data,
  });
};

const sendError = (res, message, error = null, statusCode = 500) => {
  const errorResponse = error
    ? typeof error === "string"
      ? { message: error }
      : { message: error.message || error, stack: error.stack || null }
    : null;

  return res.status(statusCode).json({
    success: false,
    message,
    error: errorResponse,
  });
};

async function getActiveCourses() {
  try {
    const query = `
      SELECT c.*
      FROM courses c
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.status = 1
        AND c.deleted_at IS NULL
        AND cat.status = 1
        AND cat.category_type = 'course'
        AND (cat.deleted_at IS NULL)
    `;

    const [rows] = await pool.promise().execute(query);
    return rows;
  } catch (error) {
    console.error(
      "Error fetching active courses with category_type 'course':",
      error
    );
    throw error;
  }
}
const getSubjectCountByCourseId = async (courseId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) AS count 
      FROM course_subjects 
      WHERE course_id = ? AND deleted_at IS NULL
    `;
    pool.query(query, [courseId], (err, results) => {
      if (err) return reject(err);
      resolve(results[0].count);
    });
  });
};

// Get chapter count by course ID
const getChapterCountByCourseId = async (courseId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) AS count 
      FROM course_chapters 
      WHERE course_id = ? AND deleted_at IS NULL
    `;
    pool.query(query, [courseId], (err, results) => {
      if (err) return reject(err);
      resolve(results[0].count);
    });
  });
};
const getPdfCountByCourseId = async (courseId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) AS count 
      FROM course_pdf 
      WHERE course_id = ? AND deleted_at IS NULL
    `;
    pool.query(query, [courseId], (err, results) => {
      if (err) return reject(err);
      resolve(results[0].count);
    });
  });
};
const getVideoCountByCourseId = async (courseId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) AS count 
      FROM course_video 
      WHERE course_id = ? AND deleted_at IS NULL
    `;
    pool.query(query, [courseId], (err, results) => {
      if (err) return reject(err);
      resolve(results[0].count);
    });
  });
};

const getBookingCountByCourseId = async (courseId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) AS count 
      FROM course_orders
      WHERE course_id = ?`;
    pool.query(query, [courseId], (err, results) => {
      if (err) return reject(err);
      resolve(results[0].count);
    });
  });
};


const getTestCountByCourseId = async (courseId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COUNT(*) AS count 
      FROM live_test
      WHERE course_id = ?`;
    pool.query(query, [courseId], (err, results) => {
      if (err) return reject(err);
      resolve(results[0].count);
    });
  });
};
const getBlogs = async () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        id,
        title,
        description,
        status,
        image,
        slug,
        DATE_FORMAT(created_at, '%d %b %Y') AS formatted_date
      FROM blogs 
      WHERE status = 1 
      ORDER BY created_at DESC
    `;
    pool.query(query, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const getBlogDetails = async (slug) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * 
      FROM blogs 
      WHERE slug = ? AND status = 1 
      LIMIT 1
    `;
    pool.query(query, [slug], (err, results) => {
      if (err) return reject(err);
      resolve(results.length ? results[0] : null);
    });
  });


};
  const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-') // Replace spaces & special chars with hyphen
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
};


 const getActiveGallery = async (type) => {
  try {
    const query = `
      SELECT * FROM galleries
      WHERE status = '1' 
        AND deleted_at IS NULL 
      
        
      ORDER BY created_at DESC
    `;
    const [results] = await pool.promise().query(query, [type]);
    return results;
  } catch (error) {
    console.error("Error fetching active coupons:", error);
    throw error;
  }
};


module.exports = {
  formatDate,
  getActiveCategoriesByType,
  getActiveCourseClasses,
  getActiveFaculties,
  getActiveTestSeries,
  getOtherActiveTestSeries,
  getTestSeriesBySlug,
  getCoursesByCategoryId,
  getServicableCities,
  getTestimonials,
  getFaqs,
  getBanners,
  getCourseBySlug,
  getCenters,
  getCategoryDetailsById,
  getCenterDetailsById,
  getCourseClassDetailsById,
  getCMSContentBySlug,
  checkImagePath,
  getActiveCouponList,
  sendSuccess,
  sendError,
  getActiveCourses,
  getCourseDetails,
  getSubjectCountByCourseId,
  getChapterCountByCourseId,
  getPdfCountByCourseId,
  getVideoCountByCourseId,
  getBookingCountByCourseId,
  getCenterDetails,
  getCenterCourses,
  getBlogs,
  getBlogDetails,
  getActiveLiveTest,
  generateSlug,
  getTestSeriesByCategoryId,
  getTestCountByCourseId,
  getActiveGallery,
  getLiveTestByCategoryId,
  getLiveTestDetails
};
