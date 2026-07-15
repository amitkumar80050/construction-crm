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


// Deletes the uploaded file after the response is sent (success or error)
const cleanupTempFile = (req, res, next) => {
  res.on('finish', () => {
    if (req.file?.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete temp upload file:', err.message);
      });
    }
  });
  next();
};

// Single file upload
const uploadSingle = (fieldName) => upload.single(fieldName);

// Multiple file upload
const uploadMultiple = (fieldName, maxCount) => upload.array(fieldName, maxCount);

module.exports = { uploadSingle, uploadMultiple, upload, cleanupTempFile };



// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// const UPLOAD_DIR = path.join(__dirname, '..', 'temp-uploads');
// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// const ALLOWED_MIME_TYPES = [
//   'text/csv',
//   'application/vnd.ms-excel',
//   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
// ];
// const ALLOWED_EXTENSIONS = ['.csv', '.xls', '.xlsx'];
// const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, UPLOAD_DIR),
//   filename: (req, file, cb) => {
//     const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     const ext = path.extname(file.originalname).toLowerCase();
//     cb(null, `import-${uniqueSuffix}${ext}`);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const ext = path.extname(file.originalname).toLowerCase();

//   if (!ALLOWED_EXTENSIONS.includes(ext)) {
//     return cb(new Error('Invalid file extension. Only .csv, .xls, .xlsx are allowed.'));
//   }
//   if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
//     return cb(new Error('Invalid file MIME type.'));
//   }
//   cb(null, true);
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: MAX_FILE_SIZE },
// });

// // Deletes the temp file after the response is sent (success or error)
// const cleanupTempFile = (req, res, next) => {
//   res.on('finish', () => {
//     if (req.file?.path) {
//       fs.unlink(req.file.path, (err) => {
//         if (err) console.error('Failed to delete temp upload file:', err.message);
//       });
//     }
//   });
//   next();
// };

// module.exports = { upload, cleanupTempFile, UPLOAD_DIR };