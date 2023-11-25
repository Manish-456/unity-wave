import mongoose, { Schema } from "mongoose";
import { decryptField, encryptField } from "../utils/encryption.js";

const contextSchema = Schema({
    user : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    email : {
        type : String,
        required : true,
        trim : true
    },
    ip : {
        type : String,
        required : true,
        set : encryptField,
        get : decryptField
    },
    country : {
        type : String,
        required : true,
        set : encryptField,
        get : decryptField
    },
    city : {
        type : String,
        required : true,
        set : encryptField,
        get : decryptField
    },
    browser : {
        type : String,
        required : true,
        set : encryptField,
        get : decryptField
    },
    os : {
        type : String,
        required : true,
        set : encryptField,
        get : decryptField
    },
    platform : {
        type : String,
        required : true,
        set : encryptField,
        get : decryptField
    },
    device : {
        type : String,
        required : true,
        set : encryptField,
        get : decryptField
    },
    deviceType : {
        type : String,
        required : true,
        set : encryptField,
        get : decryptField
    },
    isTrusted : {
        type : Boolean,
        required : true,
        default : true
    },
})

export default mongoose.model("Context", contextSchema);