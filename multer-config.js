const multer = require('multer');

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'uploads/customer/document/'); 
	},
	filename: function (req, file, cb) {
		cb(null, file.fieldname + '-' + Date.now() + '.png'); 
	},
});

const fileFilter = (req, file, cb) => {
	if (file.mimetype.startsWith('image/')) {
		cb(null, true);
	} else {
		cb(new Error('Invalid file type. Only images are allowed.'), false);
	}
};

const upload = multer({
	storage: storage,
	fileFilter: fileFilter,
}).fields([
	{ name: 'front_image', maxCount: 1 },
	{ name: 'back_image', maxCount: 1 },
]);

module.exports = upload;
