import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

const regExp = new RegExp(/^[a-zA-Z0-9]+$/);

const adminSchema = Schema(
   {
      username: {
         type: String,
         required: true,
         unique: true,
         trim: true,
         minLength: 3,
         maxLength: 20,
         validate: {
            validator: function (value) {
               return regExp.test(value);
            },
            message: function (props) {
               return `${props.value} is not a valid username!`;
            },
         },
      },
      password: {
         type: String,
         required: true,
         trim: true,
         validate: {
            validator: function (value) {
               return value.length >= 6;
            },
            message: function (props) {
               return `Password must be atleast 6 characters long!`;
            },
         },
      },
   },
   {
      timestamps: true,
   }
);

adminSchema.pre("save", async function (next) {
   if (!this.isModified("password")) {
      return next();
   }

   try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);

      return next();
   } catch (error) {
      next(error);
   }
});

export default mongoose.model("Admin", adminSchema);