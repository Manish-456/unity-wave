import fs from "fs";
import multer from "multer";
import { dirname, extname, join } from "path";
import { fileURLToPath } from "url";

export function uploadFile(req, res, next) {
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   const up_folder = join(__dirname, "../../../assets/userFiles");

   const storage = multer.diskStorage({
      destination: (req, file, cb) => {
         if (!fs.existsSync(up_folder)) {
            fs.mkdirSync(up_folder, { recursive: true });
         }
         cb(null, up_folder);
      },
      filename: (req, file, cb) => {
         const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
         const ext = extname(file.originalname);
         cb(null, file.fieldname + "-" + suffix + ext);
      },
   });

   const upload = multer({
      storage,
      limits: {
         fieldSize: 50 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
         if (
            file.mimetype.startsWith("image/") ||
            file.mimetype.startsWith("video/")
         ) {
            cb(null, true);
         } else {
            cb(null, false);
         }
      },
   });

   upload.any()(req, res, (err) => {
      if (err) {
         return res.status(500).json({
            success: false,
            message: "Error uploading file",
            error: err.message,
         });
      }

      if (!req.files || req.files.length === 0) {
         return next();
      }

      const file = req.files[0];
      const fileUrl = `${req.protocol}://${req.get("host")}/assets/userFiles/${
         file.filename
      }`;

      req.file = file;
      req.fileUrl = fileUrl;
      req.fileType = file.mimetype.split("/")[0];

      next();
   });
}
