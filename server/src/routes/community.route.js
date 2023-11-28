import { Router } from "express";
import passport from "passport";

import {
   banUser,
   addRules,
   unbanUser,
   reportPost,
   getCommunity,
   joinCommunity,
   leaveCommunity,
   getCommunities,
   createCommunity,
   getCommunityMods,
   getReportedPosts,
   addModToCommunity,
   removeReportedPost,
   addRulesToCommunity,
   getCommunityMembers,
   getMemberCommunities,
   getNotMemberCommunities,
} from "../controllers/community.controller.js";

import { decodeToken } from "../middleware/auth/decodeToken.js";

const router = Router();

router.use(passport.authenticate("jwt", { session: false }, null), decodeToken);

router.get("/", getCommunities);
router.get("/:name", getCommunity);
router.get("/member", getMemberCommunities);
router.get("/:name/moderators", getCommunityMods);
router.get("/notmember", getNotMemberCommunities);
router.get("/:name/members", getCommunityMembers);
router.get("/:name/reported-posts", getReportedPosts);

router.post("/report", reportPost);
router.post("/rules", addRules);
router.post("/:name/ban/:id", banUser);
router.post("/:name/unban/:id", unbanUser);
router.post("/:name/join", joinCommunity);
router.post("/:name/leave", leaveCommunity);
router.post("/:name/add-all-rules", addRulesToCommunity);
router.post("/", createCommunity);

router.delete("/:reported-posts/:postId", removeReportedPost);
router.patch("/:name/add-moderators", addModToCommunity);

export default router;