import mongoose, { Schema } from "mongoose";

import fs from "fs";
import { basename, dirname, join } from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";

const pendingPostSchema = Schema(
   {
      content: {
         type: String,
         trim: true,
      },
      fileUrl: {
         type: String,
         trim: true,
      },
      fileType: {
         type: String,
      },
      community: {
         type: Schema.Types.ObjectId,
         ref: "Community",
         required: true,
      },
      user: {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      status: {
         type: String,
         enum: ["pending"],
         default: "pending",
      },
   },
   {
      timestamps: true,
   }
);

pendingPostSchema.pre("remove", async function (next) {
   try {
      if (this.fileUrl) {
         const fileName = basename(this.fileUrl);
         const __filename = fileURLToPath(import.meta.url);
         const __dirname = dirname(__filename);
         const deleteFilePromise = promisify(fs.unlink)(
            join(__dirname, "../../assets/userFiles", fileName)
         );

         await deleteFilePromise;
      }
      next();
   } catch (error) {
      next(error);
   }
});

pendingPostSchema.pre("deleteMany", async function (next) {
   try {
      const pendingPosts = await this.model.find(this.getFilter());

      for (const post of pendingPosts) {
         const fileName = basename(post.fileUrl);
         const __filename = fileURLToPath(import.meta.url);
         const __dirname = dirname(__filename);
         const deleteFilePromise = promisify(fs.unlink)(
            join(__dirname, "../../assets/userFiles", fileName)
         );

         await deleteFilePromise;
      }
      next();
   } catch (error) {
      next(error);
   }
});

export default mongoose.model("PendingPost", pendingPostSchema)