// models/TestSeriesModel.js
const pool = require("../db/database");

const withCategory = () => `
  SELECT \`test_series\`.*, categories.category_name
  FROM \`test_series\`
  LEFT JOIN categories ON \`test_series\`.category_id = categories.id
`;

const getList = (status) => {
  const where =
    status === "trashed"
      ? "WHERE `test_series`.deleted_at IS NOT NULL"
      : "WHERE `test_series`.deleted_at IS NULL";

  const query = `${withCategory()} ${where} ORDER BY \`test_series\`.id DESC`;
  return new Promise((resolve, reject) => {
    pool.query(query, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const getById = (id) => {
  const query = `
    SELECT ts.*, c.category_name
    FROM \`test_series\` ts
    LEFT JOIN categories c ON ts.category_id = c.id
    WHERE ts.id = ?`;
  return new Promise((resolve, reject) => {
    pool.query(query, [id], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject(new Error("Not found"));
      resolve(results[0]);
    });
  });
};

const insert = (data) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const query = `INSERT INTO \`test_series\` (${fields.join(
    ", "
  )}) VALUES (${fields.map(() => "?").join(", ")})`;
  return new Promise((resolve, reject) => {
    pool.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const update = (id, data) => {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const query = `UPDATE \`test_series\` SET ${fields
    .map((f) => `${f} = ?`)
    .join(", ")} WHERE id = ?`;
  values.push(id);
  return new Promise((resolve, reject) => {
    pool.query(query, values, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const softDelete = (id) => {
  const query = "UPDATE `test_series` SET deleted_at = NOW() WHERE id = ?";
  return new Promise((resolve, reject) => {
    pool.query(query, [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const restore = (id) => {
  const query = "UPDATE `test_series` SET deleted_at = NULL WHERE id = ?";
  return new Promise((resolve, reject) => {
    pool.query(query, [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

const permanentDelete = (id) => {
  const query = "DELETE FROM `test_series` WHERE id = ?";
  return new Promise((resolve, reject) => {
    pool.query(query, [id], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

module.exports = {
  getList,
  getById,
  insert,
  update,
  softDelete,
  restore,
  permanentDelete,
};
