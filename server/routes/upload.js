import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const mime = file.mimetype.toLowerCase();

  if (allowedMimeTypes.includes(mime)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPG, JPEG, PNG, and WEBP image files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3 MB per file
  }
}).array('images', 3); // Max 3 images per listing

const router = express.Router();

// POST /api/upload/images - Upload up to 3 book images (Authenticated Student/User)
router.post('/images', authenticateToken, (req, res) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds 3MB limit. Please upload smaller images.' });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: 'Maximum 3 images allowed per book listing.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files uploaded.' });
    }

    // Convert uploaded files to persistent Base64 Data URLs so they are never lost on Render container restarts
    const imageUrls = req.files.map((file) => {
      const mime = file.mimetype || 'image/webp';
      const base64 = file.buffer.toString('base64');
      return `data:${mime};base64,${base64}`;
    });

    return res.status(201).json({
      message: 'Images uploaded successfully!',
      urls: imageUrls
    });
  });
});

export default router;
