import mongoose, { Schema } from "mongoose";

const suspiciousLoginSchema = Schema(
   {
      user: {
         type: Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      email: {
         type: String,
         required: true,
      },
      ip: {
         type: String,
         required: true,
      },
      country: {
         type: String,
         required: true,
      },
      city: {
         type: String,
         required: true,
      },
      browser: {
         type: String,
         required: true,
      },
      platform: {
         type: String,
         required: true,
      },
      os: {
         type: String,
         required: true,
      },
      device: {
         type: String,
         required: true,
      },
      deviceType: {
         type: String,
         required: true,
      },
      unVerifiedAttempts : {
        type : Number,
        default : 0
      },
      isTrusted: {
         type: Boolean,
         default: false,
      },
      isBlocked: {
         type: Boolean,
         default: false,
      },
   },
   {
      timestamps: true,
   }
);

export default mongoose.model("SuspiciousLogin", suspiciousLoginSchema);
