import { Router } from "express";
import passport from "passport";
import useragent from "express-useragent";

import { decodeToken } from "../middleware/auth/decodeToken.js";

import {
   blockContextAuthData,
   deleteContextAuthData,
   getAuthContextdata,
   getBlockedAuthContextData,
   getTrustedAuthContextData,
   getUserPreference,
   unblockContextAuthData,
} from "../controllers/auth.controller.js";
import { verifyEmailValidation } from "../middleware/users/verifyEmail.js";

const router = Router();

const requireAuth = passport.authenticate("jwt", { session: false }, null);

router.get(
   "/context-data/primary",
   requireAuth,
   decodeToken,
   getAuthContextdata
);
router.get(
   "/context-data/trusted",
   requireAuth,
   decodeToken,
   getTrustedAuthContextData
);
router.get(
   "/context-data/blocked",
   requireAuth,
   decodeToken,
   getBlockedAuthContextData
);

router.get("/user-preferences", requireAuth, decodeToken, getUserPreference);

router.delete("/context-data/:contextId", requireAuth, deleteContextAuthData);

router.patch("/context-data/block/:contextId", blockContextAuthData);

router.patch("/context-data/unblock/:contextId", requireAuth, unblockContextAuthData);

router.use(useragent.express());

router.get("/verify", verifyEmailValidation, verifyEmail)

export default router;
