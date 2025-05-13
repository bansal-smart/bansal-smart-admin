// const mysql = require("mysql");

// const pool = mysql.createPool({
//   connectionLimit: 10,
//   host: "localhost",
//   user: "root", // corrected from "customer"
//   password: "55AIViZznakaDjIS",
//   database: "bansal",
//   port: 3306,
// });

// pool.getConnection((err, connection) => {
//   if (err) {
//     console.error("Database connection failed:", err);
//     return;
//   }
//   console.log("Connected to MySQL database");
//   connection.release(); // release connection back to pool
// });

// module.exports = pool;



const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // Replace with your MySQL username
  password: '55AIViZznakaDjIS', // Replace with your MySQL password
  database: 'bansal', // Replace with your database name
  waitForConnections: true, // Optional: to allow waiting for connections if the pool is full
  connectionLimit: 10, // Max number of simultaneous connections
  queueLimit: 0 // No limit to the waiting queue
});

// Export the pool for use in your controllers
module.exports = pool;
