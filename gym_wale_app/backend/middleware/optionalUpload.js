const multer = require('multer');
const path = require('path');

// Storage configuration for gym photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/gymPhotos'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/**
 * Optional upload middleware - allows both file uploads and JSON requests
 * If a file is provided, it will be processed
 * If no file is provided (JSON with imageUrl), the request continues normally
 */
const optionalSingleUpload = (fieldName) => {
  return (req, res, next) => {
    const uploadMiddleware = upload.single(fieldName);
    
    uploadMiddleware(req, res, (err) => {
      // If error is "Unexpected field" or similar multer error, it might be JSON request
      if (err instanceof multer.MulterError) {
        // Check if this is just a missing file (not an error for our use case)
        if (err.code === 'UNEXPECTED_FIELD' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          // Treat as JSON request, continue
          return next();
        }
      }
      // File uploaded successfully or no file (both are OK)
      if (err) {
        // Real upload error
        return next(err);
      }
      // Continue normally
      next();
    });
  };
};

module.exports = {
  upload,
  optionalSingleUpload
};
