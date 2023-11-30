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

import {
   followUser,
   getFollowingUsers,
   getPublicUser,
   getPublicUsers,
   unfollowUser,
} from "../controllers/profile.controller.js";

import { decodeToken } from "../middleware/auth/decodeToken.js";

import imageUpload from "../middleware/users/imageUpload.js";
import { followLimiter, signUpSignInLimiter } from "../middleware/limiter/limiter.js";
import { sendVerificationEmail } from "../middleware/users/verifyEmail.js";
import { sendLoginVerificationEmail } from "../middleware/users/verifyLogin.js";
import {
   addUserValidator,
   addUserValidatorHandler,
} from "../middleware/users/userValidator.js";

const router = express.Router();

const requireAuth = passport.authenticate(
   "jwt",
   {
      session: false,
   },
   null
);

router.get("/public-users/:id", requireAuth, decodeToken, getPublicUser);
router.get("/:id", requireAuth, decodeToken, getUser);
router.get("/public-users", requireAuth, decodeToken, getPublicUsers);
router.get("/following", requireAuth, decodeToken, getFollowingUsers);
router.get("/moderator", requireAuth, decodeToken, getModProfile);

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

router.put("/update/:id", requireAuth, decodeToken, updateInfo);

router.use(followLimiter())
router.patch("/:id/follow", requireAuth, decodeToken, followUser);
router.patch("/:id/unfollow", requireAuth, decodeToken, unfollowUser);

export default router;
