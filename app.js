const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/apiRoutes');
const path = require('path');
const cookieParser = require('cookie-parser');
const checkPermission = require('./middlewares/checkPermission')
const session = require('express-session');
const flash = require('connect-flash');
const app = express();
const PORT = process.env.PORT || 5000;
const base_url = 'http://localhost:5000/';
const { getLogoutUrl,getDashboardUrl } = require('./helpers/validationsHelper'); // Import helper
require('dotenv').config();
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));

const multer = require('multer');

// Set storage options
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify the upload directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Set the filename format
  }
});

// Create multer upload middleware with specific field name
const uploaded = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5MB
}).single('image'); // This means the input field name should be 'image'

// app.use(session({
//   secret: 'secret',
//   cookie: {maxAge:6000},
//   resave: false,
//   saveUninitialized: false
// }));

app.use(session({
  secret: 'your_secret_key',  // Change to a secure random string
  resave: false,
  saveUninitialized: true,  
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

app.use(flash());


app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, 'views'));


app.use((req, res, next) => {
    res.locals.base_url = base_url;
    next();
});


// Make helper functions available in all EJS templates via res.locals
// app.use((req, res, next) => {
//   res.locals.getLogoutUrl = getLogoutUrl;
//   res.locals.getDashboardUrl = getDashboardUrl;
//   userRole = req.session.userRole;
//   next();
// });

app.use("/public", express.static(path.join(__dirname, "public")));
// Make helper functions available in all EJS templates via res.locals
app.use((req, res, next) => {
  res.locals.getLogoutUrl = getLogoutUrl;
  res.locals.getDashboardUrl = getDashboardUrl;
  userRole = req.session.userRole;
  res.locals.public_url = `${req.protocol}://${req.get("host")}/public`;
  next();
});

app.use(express.static(path.join(__dirname, 'public')));


app.use('/uploads', express.static('uploads'));


app.use('/api/v1', apiRoutes);
app.use('/', webRoutes);







app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});