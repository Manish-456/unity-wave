import express from "express";
import passport from "passport";

import {
   createPost,
   getPosts,
   getPost,
   confirmPost,
   rejectPost,
   clearPendingPosts,
   deletePost,
   getFollowingUsersPosts,
   getCommunityPosts,
   likePost,
   unlikePost,
   addComment,
   getPublicPosts,
   getSavedPosts,
   savePost,
   unsavePost,
} from "../controllers/post.controller.js";

import {
   commentLimiter,
   createPostLimiter,
   likeSaveLimiter,
} from "../middleware/limiter/limiter.js";

import { uploadFile } from "../middleware/post/fileUpload.js";

import {
   commentValidator,
   postValidator,
   validatorHandler,
} from "../middleware/post/userInputValidator.js";

import { decodeToken } from "../middleware/auth/decodeToken.js";

const router = express.Router();

const requireAuth = passport.authenticate("jwt", { session: false }, null);

router.use(requireAuth, decodeToken);

router.get("/", getPosts);
router.get("/:id", getPost);
router.get("/saved", getSavedPosts);
router.get("/:id/following", getFollowingUsersPosts);
router.get("/community/:communityId", getCommunityPosts);
router.get("/:publicUserId/userPosts", getPublicPosts);

router.post("/confirm/:confirmationToken", confirmPost);
router.post("/reject/:confirmationToken", rejectPost);

//? Create post
router.post(
   "/",
   createPostLimiter,
   uploadFile,
   postValidator,
   validatorHandler,
   createPost
);

//? Add Comment
router.post(
   "/:id/comment",
   commentLimiter,
   commentValidator,
   validatorHandler,
   addComment
);

router.delete("/pending", clearPendingPosts);
router.delete("/:id", deletePost);

router.use(likeSaveLimiter);

router.patch("/:id/save", savePost);
router.patch("/:id/unsave", unsavePost);
router.patch("/:id/like", likePost);
router.patch("/:id/unlike", unlikePost);

export default router;
