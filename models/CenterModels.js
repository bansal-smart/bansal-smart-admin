const pool = require("../db/database");

class CenterModel {


static async list(status = "active") {
  const query = `
    SELECT centers.*, servicable_cities.title
    FROM centers
    LEFT JOIN servicable_cities ON centers.city_id = servicable_cities.id
    WHERE centers.deleted_at IS NULL
    ORDER BY centers.id DESC
  `;

  return new Promise((resolve, reject) => {
    pool.query(query, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

static async findById(id) {
  const query = `SELECT * FROM centers WHERE id = ?`;
  return new Promise((resolve, reject) => {
    pool.query(query, [id], (err, results) => {
      if (err) return reject(err);
      resolve(results.length > 0 ? results[0] : null);
    });
  });
}


 static async checkDuplicate(city, name, email, excludeId = null) {
  const query = `
    SELECT id FROM centers 
    WHERE city_id = ? AND name = ? AND email = ?
    ${excludeId ? "AND id != ?" : ""}
  `;
  const params = excludeId
    ? [city, name, email, excludeId]
    : [city, name, email];

  return new Promise((resolve, reject) => {
    pool.query(query, params, (err, results) => {
      if (err) return reject(err);
      resolve(results.length > 0);
    });
  });
}

static async create(data, logoFile) {
  if (!logoFile) {
    throw new Error("Center Logo is required");
  }

  const query = `
    INSERT INTO centers 
    (city_id, name, email, mobile, roles, address, map_url, status, logo, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.city_id,
    data.name,
    data.email,
    data.mobile,
    data.roles,
    data.address,
    data.map_url,
    data.status,
    `/uploads/centers/${logoFile.filename}`, // logo path stored here
    data.created_at || new Date(),
  ];

  return new Promise((resolve, reject) => {
    pool.query(query, params, (err, results) => {
      if (err) return reject(err);
      resolve(results.insertId);
    });
  });
}
static async UserCreate(userData) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO users 
      (name, email, mobile, password, original_password, created_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      'ddd',
      userData.email,
      userData.mobile,
      userData.password,
      userData.original_password,
      new Date(),
    ];

    pool.query(query, params, (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
}

static async update(id, data, logoFile) {

  
  const query = `
    UPDATE centers SET 
      city_id = ?, 
      name = ?, 
      email = ?, 
      mobile = ?, 
      roles = ?, 
      address = ?, 
      map_url = ?, 
      status = ?, 
      logo = COALESCE(?, logo), 
      updated_at = ?
    WHERE id = ?
  `;

  const logoPath = logoFile ? `/uploads/centers/${logoFile.filename}` : null;

  const params = [
    data.city_id,
    data.name,
    data.email,
    data.mobile,
    data.roles,
    data.address,
    data.map_url,
    data.status,
    logoPath,
    data.updated_at || new Date(),
    id,
  ];

  return new Promise((resolve, reject) => {
    pool.query(query, params, (err, result) => {
      if (err) return reject(err);
      resolve(result.affectedRows);
    });
  });
}


  static async softDelete(id) {
    const query = "UPDATE test_series_test SET deleted_at = ? WHERE id = ?";
    return new Promise((resolve, reject) => {
      pool.query(query, [new Date(), id], (err, results) => {
        if (err) return reject(err);
        resolve(results.affectedRows);
      });
    });
  }

  static async restore(id) {
    const query = "UPDATE test_series_test SET deleted_at = NULL WHERE id = ?";
    return new Promise((resolve, reject) => {
      pool.query(query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results.affectedRows);
      });
    });
  }

  static async permanentDelete(id) {
    const query = "DELETE FROM test_series_test WHERE id = ?";
    return new Promise((resolve, reject) => {
      pool.query(query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results.affectedRows);
      });
    });
  }
}

module.exports = CenterModel;
