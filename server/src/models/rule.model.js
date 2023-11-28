import { Schema, model } from "mongoose";

const ruleSchema = Schema({
    rule : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required  :true
    }
});

export default model("Rule", ruleSchema);