import mongoose, { Schema } from "mongoose";

const communitySchema = Schema({
   name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
   },

   description: {
      type: String,
      required: true,
      trim: true,
   },

   banner: {
      type: String,
   },

   moderators: [
      {
         type: Schema.Types.ObjectId,
         ref: "User",
         default: [],
      },
   ],

   members: [
      {
         type: Schema.Types.ObjectId,
         ref: "User",
         default: [],
      },
   ],

   bannedUsers: [
      {
         type: Schema.Types.ObjectId,
         ref: "User",
         default: [],
      },
   ],

   //    TODO : Add rules
}, {
    timestamps : true
});

communitySchema.index({ name: "text" });
export default mongoose.model("Community", communitySchema);
