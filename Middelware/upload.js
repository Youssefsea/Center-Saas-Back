const multer = require('multer');
const os = require('os');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, os.tmpdir());
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ext || '.jpg';
        cb(null, `upload_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
});

const imageFileFilter = (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 2
    }
});

module.exports = upload;