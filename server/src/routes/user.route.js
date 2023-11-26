import express from "express";
import requestIp from "request-ip";
import userAgent from "express-useragent";
import passport from "passport";
import "../config/passport.js";

import {
   addUser,
   getModProfile,
   getUser,
   logout,
   refreshToken,
   signIn,
   updateInfo,
} from "../controllers/user.controller.js";

import { signUpSignInLimiter } from "../middleware/limiter/limiter.js";
import imageUpload from "../middleware/users/imageUpload.js";

import {
   addUserValidator,
   addUserValidatorHandler,
} from "../middleware/users/userValidator.js";

import { sendVerificationEmail } from "../middleware/users/verifyEmail.js";
import { sendLoginVerificationEmail } from "../middleware/users/verifyLogin.js";
import { decodeToken } from "../middleware/auth/decodeToken.js";

const router = express.Router();

const requireAuth = passport.authenticate(
   "jwt",
   {
      session: false,
   },
   null
);

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
   signIn,
   sendLoginVerificationEmail
);

router.post("/refresh-token", refreshToken);

router.post("/logout", decodeToken, logout);

router.get("/moderator", requireAuth, decodeToken, getModProfile);

router.put("/user/:id", requireAuth, decodeToken, updateInfo);
router.get("/user/:id", requireAuth, decodeToken, getUser);

export default router;
