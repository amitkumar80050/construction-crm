const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = ['uploads/profiles', 'uploads/imports', 'uploads/documents'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/';
    if (file.fieldname === 'profilePicture') {
      uploadPath += 'profiles/';
    } else if (file.fieldname === 'importFile') {
      uploadPath += 'imports/';
    } else {
      uploadPath += 'documents/';
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and Office documents are allowed.'));
  }
};

// Upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: process.env.MAX_FILE_SIZE || 5242880, // 5MB default
  },
  fileFilter: fileFilter,
});

// Single file upload
const uploadSingle = (fieldName) => upload.single(fieldName);

// Multiple file upload
const uploadMultiple = (fieldName, maxCount) => upload.array(fieldName, maxCount);

module.exports = { uploadSingle, uploadMultiple, upload };