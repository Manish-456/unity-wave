import mongoose, { Schema } from "mongoose";

const adminTokenSchema = Schema({
    user : {
        type : Schema.Types.ObjectId,
        ref : "Admin",
        required : true
    },
    accessToken : {
        type : String,
        required : true
    }
});

export default mongoose.model("AdminToken", adminTokenSchema);