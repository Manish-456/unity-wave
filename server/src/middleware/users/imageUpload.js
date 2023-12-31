import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import { extname, join, dirname } from "path";

function imageUpload(req, res, next) {
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   const up_folder = join(__dirname, "../../../assets/userAvatars");

   const storage = multer.diskStorage({
      destination: (req, file, cb) => {
         if (!fs.existsSync(up_folder)) {
            fs.mkdirSync(up_folder, { recursive: true });
         }

         cb(null, up_folder);
      },
      filename: (req, file, cb) => {
         const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
         const ext = extname(file.originalname);

         cb(null, file.fieldname + "-" + uniqueSuffix + ext);
      },
   });

   const upload = multer({
      storage,
      limits: {
         fileSize: 20 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
         if (
            file.mimetype === "image/jpeg" ||
            file.mimetype === "image/jpg" ||
            file.mimetype === "image/png"
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
      } else {
         next();
      }
   });
}

export default imageUpload;
