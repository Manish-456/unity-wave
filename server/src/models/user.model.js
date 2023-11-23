import mongoose, {Schema} from "mongoose";

const userSchema = Schema({
    name : {
        type : String,
        required : true,
        trim : true
    },

    email : {
        type : String,
        unique : true,
        required : true,
        trim : true
    },

    password : {
        type : String,
        required : true
    },

    avatar : {
        type : String,
        default : ""
    },

    bio : {
        type : String,
        default : ""
    },

    interest : {
        type : String,
        default : ""
    },

    location : {
        type : String,
        default : ""
    },

    role : {
        type : String,
        enum : ["general", "moderator", "admin"],
        default : "general"
    },

    savedPosts : [
        {
            type : Schema.Types.ObjectId,
            ref : "Post",
            default : []
        }
    ],

    followers : [
        {
            type : Schema.Types.ObjectId,
            ref : "User"
        }
    ],

    following : [
        {
            type : Schema.Types.ObjectId,
            ref : "User"
        }
    ],

    isEmailVerified : {
        type : Boolean,
        default : false
    }
}, {
    timestamps : true
})

userSchema.index({name : "text"});

export default mongoose.model("User", userSchema);