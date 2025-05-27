const pool = require('../db/database'); // Your MySQL pool

const TestModel = {
  async update(id, data) {
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);

    const query = `UPDATE live_test SET ${fields} WHERE id = ?`;
    values.push(id);

    return await pool.promise().execute(query, values);
  },

  async create(data) {
    const keys = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const query = `INSERT INTO live_test (${keys}) VALUES (${placeholders})`;
    return await pool.promise().execute(query, values);
  },

  async checkDuplicate(course_id, test_name, excludeId = null) {
    let query = `SELECT COUNT(*) as count FROM live_test WHERE course_id = ? AND test_name = ?`;
    const params = [course_id, test_name];

    if (excludeId) {
      query += ` AND id != ?`;
      params.push(excludeId);
    }

    const [rows] = await pool.promise().execute(query, params);
    return rows[0].count > 0;
  }
};

module.exports = TestModel;
