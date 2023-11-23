import express from "express";
import { addUser } from "../controllers/user.controller.js";
import { signUpSignInLimiter } from "../middleware/limiter/limiter.js";
import imageUpload from "../middleware/users/imageUpload.js";

import {
   addUserValidator,
   addUserValidatorHandler,
} from "../middleware/users/userValidator.js";

const router = express.Router();

router.post(
   "/sign-up",
   signUpSignInLimiter,
   imageUpload,
   addUserValidator,
   addUserValidatorHandler,
   addUser
);

export default router;
