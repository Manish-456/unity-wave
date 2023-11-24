import fs from "fs";
import { check, validationResult } from "express-validator";
import userModel from "../../models/user.model.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const addUserValidator = [
   check("name")
      .isLength({ min: 2, max: 20 })
      .withMessage("Name must be between 2 and 20 characters")
      .isAlpha("en-US", { ignore: " -" })
      .withMessage("Name must not contain anything other than alphabet")
      .trim(),

   check("email")
      .isEmail()
      .withMessage("Invalid email address")
      .custom(async (value) => {
         try {
            const user = await userModel.findOne({
               email: value,
            });

            if (user) {
               throw new Error(
                  "There is already an account associated with this email address"
               );
            }
         } catch (err) {
            console.log(err);
            throw err;
         }
      }),

   check("password")
      .isLength({ min: 6 })
      .withMessage("Please enter a password with 6 or more characters"),

   check("role").default("general"),
];

const addUserValidatorHandler = (req, res, next) => {
   const errors = validationResult(req);
   const mappedErrors = errors.mapped();

   if (Object.keys(mappedErrors).length === 0) {
      next();
   } else {
      const { filename } = req.files?.[0];
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      const filePath = join(
         __dirname,
         `../../../assets/userAvatars/${filename}`
      );

      fs.unlink(filePath, (err) => {
         if (err) {
            console.error(err);
         }
         console.log(`${filePath} was deleted`);
      });
      return res.status(400).json({
         errors: Object.values(mappedErrors).map((error) => error.msg),
      });
   }
};

export { addUserValidator, addUserValidatorHandler };
