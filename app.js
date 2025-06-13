const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const webRoutes = require("./routes/webRoutes");
const apiRoutes = require("./routes/apiRoutes");
const path = require("path");
require('dotenv').config();
const cookieParser = require("cookie-parser");
const checkPermission = require("./middlewares/checkPermission");
const session = require("express-session");
const flash = require("connect-flash");
const app = express();
const PORT = process.env.PORT || 3003;
const base_url = "https://project.bansalcalssadmin.aamoditsolutions.com/admin/public/";

const public_path  = "https://project.bansalcalssadmin.aamoditsolutions.com/public/";

const publicUrl = process.env.PUBLIC_URL || 'https://project.bansalcalssadmin.aamoditsolutions.com/admin/public/';

const {
  getLogoutUrl,
  getDashboardUrl,
} = require("./helpers/validationsHelper"); // Import helper

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));

const multer = require("multer");

// Set storage options
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Specify the upload directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Set the filename format
  },
});

// Create multer upload middleware with specific field name
const uploaded = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5MB
}).single("image"); // This means the input field name should be 'image'

// app.use(session({
//   secret: 'secret',
//   cookie: {maxAge:6000},
//   resave: false,
//   saveUninitialized: false
// }));

app.use(
  session({
    secret: "your_secret_key", // Change to a secure random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  })
);


app.use((req, res, next) => {
  // Provide default empty array if not set
  res.locals.permissions = Array.isArray(req.session.permissions) ? req.session.permissions : [];
  res.locals.userRole = req.session.userRole || null;

  next();
});
app.use(flash());

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use((req, res, next) => {
  res.locals.base_url = base_url;
  res.locals.public_path = public_path;
  res.locals.publicUrl = publicUrl;
  next();
});

// Make helper functions available in all EJS templates via res.locals
app.use((req, res, next) => {
  res.locals.getLogoutUrl = getLogoutUrl;
  res.locals.getDashboardUrl = getDashboardUrl;
  userRole = req.session.userRole;
  next();
});

app.use("/admin/public", express.static(path.join(__dirname, "public")));
// Make helper functions available in all EJS templates via res.locals
app.use((req, res, next) => {
  res.locals.getLogoutUrl = getLogoutUrl;
  res.locals.getDashboardUrl = getDashboardUrl;
  userRole = req.session.userRole;
  res.locals.role = req.roles || 'User'; // ✅ Properly define userRole
  res.locals.public_url = `${req.protocol}://${req.get("host")}/public`;
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads", express.static("uploads"));

app.use("/api/v1", apiRoutes);
app.use("/", webRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// Exam Upload Functionality

const fs = require('fs');
const { parseDocument, DomUtils } = require('htmlparser2');
const sanitizeHtml = require('sanitize-html');


const mysql = require('mysql2/promise');
const db = mysql.createPool({
 host: '193.203.162.34',
  user: 'bansal_user', // Replace with your MySQL username
  password: 'Bansal@@2000', // Replace with your MySQL password
  database: 'bansal_db', // Replace with your database name
  connectionLimit: 10, // Max number of simultaneous connection
  port:3306,
});
const mammoth = require('mammoth');
const upload = multer({ storage });

const mammothOptions = {
  convertImage: mammoth.images.inline(async image => {
    const buffer = await image.read('base64');
    return { src: `data:${image.contentType};base64,${buffer}` };
  })
};

const cleanHTML = html => sanitizeHtml(html, {
  allowedTags: [ 'p', 'b', 'i', 'u', 'em', 'strong', 'span', 'img', 'br' ],
  allowedAttributes: { '*': ['style'], img: ['src'] },
  allowedSchemes: ['data']
});

function extractKeyValuePairs(html) {
  const doc = parseDocument(html);
  const questions = [];

  function walk(nodes) {
    for (const node of nodes) {
      if (node.name === 'table') {
        const rows = DomUtils.findAll(el => el.name === 'tr', node);
        const q = {};
        for (const row of rows) {
          const cells = DomUtils.findAll(el => el.name === 'td', row);
          if (cells.length >= 2) {
            const key = DomUtils.getText(cells[0]).trim();
            const val = cleanHTML(DomUtils.getInnerHTML(cells[1]));
            q[key] = val;
          }
        }
        if (Object.keys(q).length > 0) questions.push(q);
      }
      if (node.children) walk(node.children);
    }
  }

  walk([doc]);
  return questions;
}

async function ensureTable(keys) {
  const [tables] = await db.query(`SHOW TABLES LIKE 'live_test_questions'`);
  
  if (tables.length === 0) {
    const columns = keys.map(k => `\`${k}\` LONGTEXT`).join(',');
    await db.execute(`CREATE TABLE live_test_questions (id INT AUTO_INCREMENT PRIMARY KEY, ${columns})`);
    return;
  }

  const [existingCols] = await db.query(`SHOW COLUMNS FROM live_test_questions`);
  const existingColNames = existingCols.map(col => col.Field);

  for (const key of keys) {
    if (!existingColNames.includes(key)) {
      await db.execute(`ALTER TABLE live_test_questions ADD COLUMN \`${key}\` TEXT`);
    }
  }
}
async function insertQuestion(data, testId) {
  const keys = [...Object.keys(data), 'test_id'];
  const fields = keys.map(k => `\`${k}\``).join(',');
  const placeholders = keys.map(() => '?').join(',');
  const values = [...Object.values(data), testId];
 
  await db.execute(`INSERT INTO live_test_questions (${fields}) VALUES (${placeholders})`, values);
}
app.get('/', (_, res) => {
  res.send(`
    <html>
      <head>
        <title>Upload DOCX</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light">
        <div class="container mt-5">
          <h2 class="text-primary">Upload Question DOCX</h2>
          <form method="POST" action="/upload" enctype="multipart/form-data">
            <div class="mb-3">
              <input type="file" class="form-control" name="docFile" accept=".docx" required>
            </div>
            <button type="submit" class="btn btn-success">Upload</button>
          </form>
        </div>
      </body>
    </html>
  `);
});



app.post('/admin/question-upload', upload.single('docFile'), async (req, res) => {
  try {
    const testId = req.body.test_id;
    const result = await mammoth.convertToHtml({ path: req.file.path }, mammothOptions);
    const questions = extractKeyValuePairs(result.value);
    if (questions.length === 0) return res.status(400).send('No valid data found');

    const allKeys = new Set();
    questions.forEach(q => Object.keys(q).forEach(k => allKeys.add(k)));

   // await ensureTable([...allKeys]);
  await db.execute('DELETE FROM live_test_questions WHERE test_id = ?', [testId]);
    for (const q of questions) await insertQuestion(q, testId);

    fs.unlinkSync(req.file.path);
      return res.status(200).json({
      success: true,
      message: "Questions uploaded successfully",
      redirect_url: `/admin/exam-question-list/${testId}`
    });
  } catch (err) {

    res.status(500).send('Error processing file.');
  }
});

// app.get('/questions', async (req, res) => {
//   const [columns] = await db.query('SHOW COLUMNS FROM questions');
//   const [rows] = await db.query('SELECT * FROM questions');
//   const headers = columns.map(col => col.Field);

//   let html = `
//   <html>
//   <head>
//     <title>Questions</title>
//     <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
//   </head>
//   <body class="bg-light">
//     <div class="container mt-5">
//       <h2 class="text-primary">Questions</h2>
//       <a href="/" class="btn btn-success mb-3">Upload More</a>
//       <div class="table-responsive">
//         <table class="table table-bordered bg-white shadow">
//           <thead class="table-secondary">
//             <tr>${headers.map(h => `<th>${h}</th>`).join('')}<th>Actions</th></tr>
//           </thead>
//           <tbody>`;

//   rows.forEach(row => {
//     html += `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}
//     <td>
//       <a class="btn btn-sm btn-warning" href="/edit/${row.id}">Edit</a>
//       <a class="btn btn-sm btn-danger ms-2" href="/delete/${row.id}">Delete</a>
//     </td></tr>`;
//   });

//   html += `</tbody></table></div></div></body></html>`;
//   res.send(html);
// });


// app.get('/questions', async (req, res) => {
//   const [columns] = await db.query('SHOW COLUMNS FROM live_test_questions');
//   const [rows] = await db.query('SELECT * FROM live_test_questions');
//   const headers = columns.map(col => col.Field);

//   let html = `
//   <html>
//   <head>
//     <meta charset="UTF-8">
//     <title>Questions</title>
//     <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
//     <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
//     <style>
//       td { vertical-align: top; }
//     </style>
//   </head>
//   <body class="bg-light">
//     <div class="container mt-5">
//       <h2 class="text-primary">Questions</h2>
//       <a href="/" class="btn btn-success mb-3">Upload More</a>
//       <div class="table-responsive">
//         <table class="table table-bordered bg-white shadow">
//           <thead class="table-secondary">
//             <tr>${headers.map(h => `<th>${h}</th>`).join('')}<th>Actions</th></tr>
//           </thead>
//           <tbody>`;

//   rows.forEach(row => {
//     html += `<tr>${
//       headers.map(h => `<td>${row[h] || ''}</td>`).join('')
//     }<td>
//       <a class="btn btn-sm btn-warning" href="/edit/${row.id}">Edit</a>
//       <a class="btn btn-sm btn-danger ms-2" href="/delete/${row.id}">Delete</a>
//     </td></tr>`;
//   });

//   html += `
//           </tbody>
//         </table>
//       </div>
//     </div>
//     <script>
//       // Re-render MathJax after DOM load
//       window.addEventListener('DOMContentLoaded', () => {
//         if (window.MathJax) MathJax.typeset();
//       });
//     </script>
//   </body>
//   </html>`;

//   res.send(html);
// });


app.get('/edit/:id', async (req, res) => {
  const [columns] = await db.query('SHOW COLUMNS FROM questions');
  const [data] = await db.query('SELECT * FROM questions WHERE id = ?', [req.params.id]);
  if (!data.length) return res.send('Not found');

  const q = data[0];
  const fields = columns.filter(r => r.Field !== 'id');

  let html = `
  <html>
  <head>
    <title>Edit</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.ckeditor.com/ckeditor5/39.0.1/classic/ckeditor.js"></script>
  </head>
  <body class="bg-light">
    <div class="container mt-5">
      <h3 class="mb-4">Edit Question</h3>
      <form method="POST" action="/edit/${q.id}" onsubmit="return submitEditors()">
  `;

  fields.forEach(f => {
    const content = q[f.Field] || '';
    html += `
      <div class="mb-3">
        <label class="form-label">${f.Field}</label>
        <textarea id="editor-${f.Field}" name="${f.Field}">${content}</textarea>
      </div>
    `;
  });

  html += `
        <button type="submit" class="btn btn-primary">Update</button>
        <a href="/questions" class="btn btn-secondary ms-2">Cancel</a>
      </form>
    </div>

    <script>
      const editors = {};

      class MyBase64UploadAdapter {
        constructor(loader) { this.loader = loader; }
        upload() {
          return this.loader.file.then(file => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve({ default: reader.result });
              reader.onerror = error => reject(error);
              reader.readAsDataURL(file);
            });
          });
        }
        abort() {}
      }

      function MyCustomUploadAdapterPlugin(editor) {
        editor.plugins.get('FileRepository').createUploadAdapter = loader => {
          return new MyBase64UploadAdapter(loader);
        };
      }

      document.querySelectorAll('textarea').forEach(textarea => {
        ClassicEditor.create(textarea, {
          extraPlugins: [MyCustomUploadAdapterPlugin],
          image: {
            toolbar: ['imageTextAlternative', '|', 'imageStyle:full', 'imageStyle:side', '|', 'imageUpload']
          },
          mediaEmbed: { previewsInData: true }
        }).then(editor => {
          editors[textarea.id] = editor;
        }).catch(console.error);
      });

      function submitEditors() {
        for (const id in editors) {
          const data = editors[id].getData();
          document.getElementById(id).value = data;
        }
        return true;
      }
    </script>
  </body>
  </html>
  `;

  res.send(html);
});

app.post('/edit/:id', async (req, res) => {
  const [columns] = await db.query('SHOW COLUMNS FROM questions');
  const fields = columns.filter(r => r.Field !== 'id');

  const updates = [];
  const values = [];

  fields.forEach(f => {
    if (req.body[f.Field] !== undefined) {
      updates.push(`\`${f.Field}\` = ?`);
      values.push(req.body[f.Field]);
    }
  });

  values.push(req.params.id);

  if (updates.length > 0) {
    await db.execute(`UPDATE questions SET ${updates.join(', ')} WHERE id = ?`, values);
  }

  res.redirect('/questions');
});


app.get('/delete/:id', async (req, res) => {
  try {
    const questionId = req.params.id;

    const [rows] = await db.execute(
      'SELECT test_id FROM live_test_questions WHERE id = ?',
      [questionId]
    );

    if (rows.length == 0) {
      return res.status(404).send('Question not found');
    }
  
    const testId = rows[0].test_id;
  
    await db.execute('DELETE FROM live_test_questions WHERE id = ?', [questionId]);

    res.redirect('/admin/exam-question-list/' + testId);

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}); // ✅ <-- this was missing