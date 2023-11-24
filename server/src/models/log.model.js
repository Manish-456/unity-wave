import mongoose, { Schema } from "mongoose";

const logSchema = Schema({
   email: { type: String },
   context: { type: String, set: encryptField, get: decryptField },
   message: { type: String, required: true },
   type: { type: String, required: true },
   level: { type: String, required: true },
   timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      expires: 604800, // 1 week
   },
});

logSchema.methods.decryptContext = function () {
   return decryptData(this.context);
};

export default mongoose.model("log", logSchema);