import mongoose, { Schema } from "mongoose";

const relationshipSchema = Schema(
   {
      follower: {
         type: Schema.Types.ObjectId,
         ref: "User",
      },
      following: {
         type: Schema.Types.ObjectId,
         ref: "User",
      },
   },
   {
      timestamps: true,
   }
);

export default mongoose.model("Relationship", relationshipSchema);