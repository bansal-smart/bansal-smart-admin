
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const setupStorage = (uploadPath) => {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      // Ensure the directory exists
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
};

module.exports = { setupStorage };



// function setupStorage(uploadPath) {
//     const fullPath = path.join(__dirname, '..', uploadPath); // Absolute path
  
//     // Ensure directory exists
//     if (!fs.existsSync(fullPath)) {
//       fs.mkdirSync(fullPath, { recursive: true });
//     }
  
//     const storage = multer.diskStorage({
//       destination: function (req, file, cb) {
//         cb(null, fullPath);
//       },
//       filename: function (req, file, cb) {
//         const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
//         cb(null, uniqueName);
//       }
//     });
  
//     return storage;
//   }