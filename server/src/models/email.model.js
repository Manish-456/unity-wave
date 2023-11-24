import mongoose, { Schema } from "mongoose";

const emailSchema = Schema({
    email : {
        type : String,
        required : true
    },
    verificationCode : {
        type : String,
        required : true,
        unique : true
    },
    messageId : {
        type : String,
        required : true,
    },
    for : {
        type : String,
        required : true
    },
    createdAt : {
        type : Date,
        default : Date.now,
        expires : 1800
    }
});

export default mongoose.model("Email", emailSchema);