import express from "express";
import requestIp from "request-ip";
import userAgent from "express-useragent";

import { addUser, signIn } from "../controllers/user.controller.js";
import { signUpSignInLimiter } from "../middleware/limiter/limiter.js";
import imageUpload from "../middleware/users/imageUpload.js";

import {
   addUserValidator,
   addUserValidatorHandler,
} from "../middleware/users/userValidator.js";

import { sendVerificationEmail } from "../middleware/users/verifyEmail.js";

const router = express.Router();

router.post(
   "/sign-up",
   signUpSignInLimiter,
   imageUpload,
   addUserValidator,
   addUserValidatorHandler,
   addUser,
   sendVerificationEmail
);

router.post(
   "/sign-in",
   signUpSignInLimiter,
   requestIp.mw(),
   userAgent.express(),
   signIn
);

export default router;
