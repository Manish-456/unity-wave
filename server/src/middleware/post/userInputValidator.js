import { body, validationResult } from "express-validator";

const MAX_LENGTH = 3000;

export const postValidator = [
   body("content")
      .isLength({ min: 10 })
      .withMessage("Your post is too short. Share more of your thoughts!")
      .isLength({ max: MAX_LENGTH })
      .withMessage("Post cannot exceed 3000 characters")
      .trim(),
];

export const commentValidator = [
   body("content")
   .isLength({min : 1})
   .withMessage("Your comment is too short. Share more of your thoughts!")
   .isLength({max : MAX_LENGTH})
   .withMessage("Comment cannot exceed 3000 characters")
   .trim()
]

export function validatorHandler(req, res, next) {
   const errors = validationResult(req);

   if (!errors.isEmpty()) {
      const errorMessages = errors
         .array()
         .map((error) => error.msg)
         .join(" ");

      return res.status(400).json({
         message: errorMessages,
      });
   }

   next();
}
