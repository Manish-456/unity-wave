import express from "express";

import {
   getLogInfo,
   deleteLogInfo,
   signIn,
   getCommunity,
   getModerators,
   addModerator,
   removeModerator,
   getCommunities,
} from "../controllers/admin.controller.js";

import {
   logLimiter,
   signUpSignInLimiter,
} from "../middleware/limiter/limiter.js";
import { requireAdminAuth } from "../middleware/auth/adminAuth.js";

const router = express.Router();

router.post("/signin", signUpSignInLimiter, signIn);

router.use(requireAdminAuth);

router.get("/community/:communityId", getCommunity);
router.get("/communities", getCommunities);
router.get("/moderators", getModerators);

router.patch("/add-moderators", addModerator);
router.patch("/remove-moderators", removeModerator);

router
   .route("/logs")
   .get(logLimiter, getLogInfo)
   .delete(logLimiter, deleteLogInfo);

export default router;
