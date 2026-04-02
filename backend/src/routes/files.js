const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticate } = require('../middleware/auth');

// Configure Cloudinary (reads CLOUDINARY_* env vars automatically)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, documents
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/avi',
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip', 'application/x-zip-compressed',
      'text/plain', 'text/csv',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

// Determine resource type and attachment type for Cloudinary
const getResourceType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'video'; // Cloudinary uses 'video' for audio
  return 'raw';
};

const getAttachmentType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

// POST /api/files/upload
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { mimetype, originalname, size, buffer } = req.file;
    const resourceType = getResourceType(mimetype);
    const attachmentType = getAttachmentType(mimetype);

    // If Cloudinary is not configured, return a useful error
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Fallback: return a mock for local dev without Cloudinary
      return res.json({
        url: `https://picsum.photos/seed/${Date.now()}/800/600`,
        publicId: `unichat/dev/${Date.now()}`,
        name: originalname,
        mimeType: mimetype,
        size,
        type: attachmentType,
        width: attachmentType === 'image' ? 800 : undefined,
        height: attachmentType === 'image' ? 600 : undefined,
        thumbnail: attachmentType === 'image' || attachmentType === 'video'
          ? `https://picsum.photos/seed/${Date.now()}/400/300`
          : undefined,
        duration: attachmentType === 'video' || attachmentType === 'audio' ? 0 : undefined,
      });
    }

    // Upload to Cloudinary from buffer
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: 'unichat',
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
      };

      // For images: auto quality + format
      if (attachmentType === 'image') {
        uploadOptions.quality = 'auto';
        uploadOptions.fetch_format = 'auto';
      }

      // For videos: generate a thumbnail
      if (attachmentType === 'video') {
        uploadOptions.eager = [{ width: 400, height: 300, crop: 'fill', format: 'jpg' }];
        uploadOptions.eager_async = false;
      }

      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      stream.end(buffer);
    });

    const result = uploadResult;

    res.json({
      url: result.secure_url,
      publicId: result.public_id,
      name: originalname,
      mimeType: mimetype,
      size,
      type: attachmentType,
      width: result.width,
      height: result.height,
      duration: result.duration || undefined,
      thumbnail: result.eager?.[0]?.secure_url || (attachmentType === 'image' ? result.secure_url : undefined),
    });
  } catch (err) {
    console.error('Upload error:', err);
    if (err.message?.includes('not allowed')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE /api/files/:publicId — clean up when message deleted (optional)
router.delete('/:publicId', authenticate, async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) return res.json({ success: true });
    const { resourceType = 'image' } = req.query;
    await cloudinary.uploader.destroy(req.params.publicId, { resource_type: resourceType });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
