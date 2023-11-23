import mongoose, { Schema } from "mongoose";

const postSchema = Schema({
   content: {
      type: String,
      trim: true,
   },

   fileUrl: {
      type: String,
      trim : true
   },

   fileType : {
    type :String
   },

   user : {
    type : Schema.Types.ObjectId,
    ref : "User"
   }
}, {
    timestamps : true
});

postSchema.index({content : "text"});
export default mongoose.model("Post", postSchema);