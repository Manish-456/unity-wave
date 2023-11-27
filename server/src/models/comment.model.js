import mongoose, { Schema } from "mongoose";

const commentSchema = Schema(
   {
      content: {
         type: String,
         required: true,
         trim: true,
      },
      user: {
         type: Schema.Types.ObjectId,
         ref: "User",
      },
      post: {
         type: Schema.Types.ObjectId,
         ref: "Post",
      },
   },
   {
      timestamps: true,
   }
);

export default mongoose.model("Comment", commentSchema);
