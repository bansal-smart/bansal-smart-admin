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

    return course;
  } catch (error) {
    console.error("Error fetching test series by slug:", error);
    throw error;
  }
};

// Fetch courses by category ID with optional selected columns
const getCoursesByCategoryId = async (categoryId, columns = []) => {
  try {
    const selectFields = columns.length > 0 ? columns.join(", ") : "*";
    const query = `SELECT ${selectFields} FROM courses WHERE category_id = ? AND status = 1 AND deleted_at IS NULL`;
    const [courses] = await pool.promise().query(query, [categoryId]);
    return courses;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};

const getServicableCities = async (columns = []) => {
  try {
    const selectFields = columns.length > 0 ? "sc.id, " + columns.join(", ") : "sc.*";
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
const getBanners = async (columns = []) => {
  try {
    const selectFields = columns.length > 0 ? columns.join(", ") : "*";
    const query = `SELECT ${selectFields} FROM banners WHERE status = 1 AND (deleted_at IS NULL OR deleted_at = '0')`;
    const [banners] = await pool.promise().query(query);
    return banners;
  } catch (error) {
    console.error("Error fetching banners:", error);
    throw error;
  }
};

const getCourseBySlug = async (slug, columns = ["*"]) => {
  try {
    const [rows] = await pool
      .promise()
      .query(
        `SELECT ${columns.join(", ")} FROM courses WHERE slug = ? LIMIT 1`,
        [slug]
      );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error in getCourseBySlug:", error);
    throw error;
  }
};


const getCourseDetails = async (id, columns = ["*"]) => {
  try {
    const [rows] = await pool
      .promise()
      .query(
        `SELECT ${columns.join(", ")} FROM courses WHERE id = ? LIMIT 1`,
        [id]
      );
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
      const [cities] = await pool.promise().query(
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
    if (!center_id) throw new Error('Center ID is required');

    const query = `
      SELECT c.* 
      FROM courses c
      WHERE c.created_by = ? AND (c.deleted_at IS NULL OR c.deleted_at = '0') AND c.status = 1
      ORDER BY c.id DESC
    `;

    const [courses] = await pool.promise().query(query, [center_id]);

    return courses; // returns array of courses
  } catch (error) {
    console.error('Error fetching center courses:', error.message);
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
    const selectFields = columns.length > 0 ? columns.join(", ") : "*";
    const query = `SELECT ${selectFields} FROM centers WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '0')`;
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

module.exports = {
  formatDate,
  getActiveCategoriesByType,
  getActiveCourseClasses,
  getActiveFaculties,
  getActiveTestSeries,
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
};
