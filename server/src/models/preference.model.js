import mongoose, {Schema} from "mongoose";

const preferenceSchema = Schema({
    user : {
        type : Schema.Types.ObjectId,
        ref : 'User'
    },
    enableContextBasedAuth : {
        type : Boolean,
        default : false
    }
}, {
    timestamps : true
});

export default mongoose.model("Preference", preferenceSchema);