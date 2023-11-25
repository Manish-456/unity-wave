import mongoose, { Schema } from "mongoose";

const tokenSchema = Schema({
    user : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    refreshToken : {
        type : String,
        required :true
    },
    accessToken : {
        type :String,
        required : true
    },
    createdAt : {
        type : Date,
        default : Date.now,
        expires : 6 * 60 * 60 // 6 hours
    }
});

export default mongoose.model("Token", tokenSchema);