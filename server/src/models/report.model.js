import mongoose, { Schema } from "mongoose";

const reportSchema = Schema({
   post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
   },
   community: {
      type: Schema.Types.ObjectId,
      ref: "Community",
      required: true,
   },
   reportedBy: [
      {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
   ],
   reportReason: {
      type: String,
      required: true,
   },
   reportDate: {
    type : Date,
    default : Date.now
   },
});

export default mongoose.model("Report", reportSchema);