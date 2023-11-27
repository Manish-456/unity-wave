import fs from "fs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";

import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Community from "../models/community.model.js";
import PendingPost from "../models/pendingPost.model.js";
import Comment from "../models/comment.model.js";
import Report from "../models/report.model.js";
import Relationship from "../models/relationShip.model.js";

import { formatCreatedAt } from "../utils/timeConverter.js";

dayjs.extend(relativeTime);

export async function createPost(req, res) {
   try {
      const { communityId, content } = req.body;

      const { userId, file, fileUrl, fileType } = req;

      const community = await Community.findOne({
         _id: {
            $eq: communityId,
         },
         members: {
            $in: [userId],
         },
      });

      if (!community) {
         if (file) {
            const filePath = `./assets/userFiles/${file.filename}`;

            fs.unlink(filePath, (err) => {
               if (err) {
                  console.error(err);
               }
            });
         }
         return res.status(401).json({
            message: "Unauthorized to post in this community",
         });
      }

      const newPost = new Post({
         user: userId,
         community: communityId,
         content,
         fileUrl: fileUrl ? fileUrl : null,
         fileType: fileType ? fileType : null,
      });

      const savedPost = await newPost.save();
      const postId = savedPost._id;

      const post = await Post.findById(postId)
         .populate("user", "name avatar")
         .populate("community", "name")
         .lean();

      res.json(post);
   } catch (error) {
      return res.status(500).json({
         message: "Something went wrong",
      });
   }
}

export async function getPosts(req, res) {
   try {
      const userId = req.userId;
      const { limit = 10, skip = 0 } = req.query;

      const communities = await Community.find({
         members: userId,
      });

      const communityIds = communities.map((community) => community._id);

      const posts = await Post.find({
         community: {
            $in: communityIds,
         },
      })
         .sort({
            createdAt: -1,
         })
         .populate("user", "name avatar")
         .populate("community", "name")
         .skip(parseInt(skip))
         .limit(parseInt(limit))
         .lean();

      const formattedPosts = posts.map((post) => ({
         ...post,
         createdAt: dayjs(post.createdAt).fromNow(),
      }));

      const totalPosts = await Post.countDocuments({
         community: {
            $in: communityIds,
         },
      });

      res.status(200).json({
         formattedPosts,
         totalPosts,
      });
   } catch (error) {
      return res.status(500).json({
         message: "Error retrieving posts",
      });
   }
}

export async function getPost(req, res) {
   try {
      const postId = req.params.id;
      const userId = req.userId;

      const post = await findPostById(postId);
      if (!post) {
         return res.status(404).json({
            message: "Post not found",
         });
      }
      const comments = await findCommentsByPostId(postId);

      post.comments = formatComments(comments);
      post.dateTime = formatCreatedAt(post.createdAt);
      post.createdAt = dayjs(post.createdAt).fromNow();
      post.savedByCount = await countSavedPosts(postId);

      const report = await findReportByPostAndUser(postId, userId);
      post.isReported = !!report;

      return res.status(200).json(post);
   } catch (error) {
      res.status(500).json({
         message: "Error retrieving post",
      });
   }
}

export async function confirmPost(req, res) {
   try {
      const { confirmationToken } = req.params;

      const userId = req.userId;
      const pendingPost = await PendingPost.findOne({
         confirmationToken: {
            $eq: confirmationToken,
         },
         status: "pending",
         user: userId,
      });

      if (!pendingPost)
         return res.status(404).json({
            message: "Post not found",
         });

      const { user, community, content, fileUrl, fileType } = pendingPost;

      const newPost = new Post({
         user,
         community,
         content,
         fileUrl,
         fileType,
      });

      await pendingPost.findOneAndDelete({
         confirmationToken: {
            $eq: confirmationToken,
         },
      });

      const savedPost = await newPost.save();
      const postId = savedPost._id;

      const post = await Post.findById(postId)
         .populate("user", "name avatar")
         .populate("community", "name")
         .lean();

      post.createdAt = dayjs(post.createdAt).fromNow();

      res.json(post);
   } catch (error) {
      res.status(500).json({
         message: "Error publishing post",
      });
   }
}

export async function rejectPost(req, res) {
   try {
      const { confirmationToken } = req.params;
      const userId = req.userId;

      const pendingPost = await PendingPost.findOne({
         confirmationToken: {
            $eq: confirmationToken,
         },
         status: "pending",
         user: userId,
      });

      if (!pendingPost)
         return res.status(404).json({
            message: "Post not found",
         });

      await pendingPost.remove();
      res.status(200).json({
         message: "Post rejected",
      });
   } catch (error) {
      res.status(500).json({
         message: "Error rejecting posts",
      });
   }
}

export async function clearPendingPosts(req, res) {
   try {
      const user = await User.findById(req.userId);

      if (user.role !== "moderator") {
         return res.status(401).json({
            message: "Unauthorized",
         });
      }

      const date = new Date();
      date.setHours(date.getHours() - 1);

      await PendingPost.deleteMany({
         createdAt: {
            $lte: date,
         },
      });

      res.status(200).json({
         message: "Pending posts cleared",
      });
   } catch (error) {
      res.status(500).json({
         message: "Error clearing pending posts",
      });
   }
}

export async function deletePost(req, res) {
   try {
      const id = req.params.id;
      const post = await Post.findById(id);

      if (!post)
         return res.status(404).json({
            message: `Post not found. It may have been deleted already`,
         });

      await post.remove();
      res.status(200).json({
         message: "Post deleted successfully",
      });
   } catch (error) {
      res.status(500).json({
         message: "An error occured while deleting the post",
      });
   }
}

export async function getFollowingUsersPosts(req, res) {
   try {
      const communityId = req.params.id;
      const userId = req.userId;

      const following = await Relationship.find({
         follower: userId,
      });

      const followingIds = following.map(
         (relationship) => relationship.following
      );

      const posts = await Post.find({
         user: {
            $in: followingIds,
         },
         community: communityId,
      })
         .sort({
            createdAt: -1,
         })
         .populate("user", "name avatar")
         .populate("community", "name")
         .limit(20)
         .lean();

      const formattedPosts = posts.map((post) => ({
         ...post,
         createdAt: dayjs(post.createdAt).fromNow(),
      }));

      res.status(200).json(formattedPosts);
   } catch (error) {
      res.status(500).json({
         message: "Server error",
      });
   }
}

export async function getCommunityPosts(req, res) {
   try {
      const communityId = req.params.communityId;
      const userId = req.userId;

      const { limit = 10, skip = 0 } = req.query;

      const isMember = await Community.findOne({
         _id: communityId,
         members: userId,
      });

      if (!isMember) {
         return res.status(401).json({
            message: "Unauthorized to view posts in this community",
         });
      }

      const posts = await Post.find({
         community: communityId,
      })
         .sort({
            createdAt: -1,
         })
         .populate("user", "name avatar")
         .populate("community", "name")
         .skip(parseInt(skip))
         .limit(parseInt(limit))
         .lean();

      const formattedPosts = posts.map((post) => ({
         ...post,
         createdAt: dayjs(post.createdAt).fromNow(),
      }));

      const totalCommunityPosts = await Post.countDocuments({
         community: communityId,
      });

      res.status(200).json({
         formattedPosts,
         totalCommunityPosts,
      });
   } catch (error) {
      res.status(500).json({
         message: "Error retrieving posts",
      });
   }
}

/**
 *
 * @param {string} req.params.id - The ID of the post to be liked.
 * @param {string} req.userId - The ID of ther user liking the post.
 */

export async function likePost(req, res) {
   try {
      const id = req.params.id;
      const userId = req.userId;

      const updatedPost = await Post.findOneAndUpdate(
         {
            _id: id,
            likes: {
               $ne: userId,
            },
         },
         {
            $addToSet: {
               likes: userId,
            },
         },
         {
            new: true,
         }
      )
         .populate("user", "name avatar")
         .populate("community", "name");

      if (!updatedPost) {
         return res.status(404).json({
            message: "Post not found. It may have been deleted already",
         });
      }

      const formattedPost = await populatePost(updatedPost);

      res.status(200).json(formattedPost);
   } catch (error) {
      res.status(500).json({
         message: "Error liking post",
      });
   }
}

export async function unlikePost(req, res) {
   try {
      const id = req.params.id;
      const userId = req.userId;

      const updatedPost = await Post.findOneAndUpdate(
         {
            _id: id,
            likes: userId,
         },
         {
            $pull: {
               likes: userId,
            },
         },
         {
            new: true,
         }
      )
         .populate("user", "name avatar")
         .populate("community", "name");

      if (!updatedPost) {
         return res.status(404).json({
            message: "Post not found. It may have been deleted already",
         });
      }

      const formattedPost = await populatePost(updatedPost);
      res.status(200).json(formattedPost);
   } catch (error) {
      return res.status(500).json({
         message: "Error liking post",
      });
   }
}

export async function addComment(req, res) {
   try {
      const { content, postId } = req.body;
      const userId = req.userId;

      const newComment = new Comment({
         user: userId,
         post: postId,
         content,
      });

      await newComment.save();

      await Post.findOneAndUpdate(
         {
            _id: {
               $eq: postId,
            },
         },
         {
            $addToSet: {
               comments: newComment._id,
            },
         },
         {
            new: true,
         }
      );

      res.status(200).json({
         message: "Comment added successfully",
      });
   } catch (error) {
      res.status(500).json({
         message: "Failed to add comment",
      });
   }
}

export async function savePost(req, res) {
   return await saveOrUnsavePost(req, res, "$addToSet");
}

export async function unsavePost(req, res) {
   return await saveOrUnsavePost(req, res, "$pull");
}

/**
 * Saves or unsaves a post for a given user by updating ther user's
 * savePosts array in the database. Uses $addToSet or $pull operation based on the value of the operation parameter.
 *
 * @param  req - The request object
 * @param  res - The response object
 * @param  {string} operation - The operation to perform, either "$addToSet" to save the post or "$pull" to unsave it.
 * @returns
 */

async function saveOrUnsavePost(req, res, operation) {
   try {
      /**
       * @type {string} id - The ID of the post to be saved or unsaved.
       */
      const id = req.params.id;
      const userId = req.userId;

      const update = {};
      update[operation === "$addToSet" ? "$addToSet" : "$pull"] = {
         savedPosts: id,
      };

      const updateUserPost = await User.findOneAndUpdate(
         {
            _id: userId,
         },
         update,
         {
            new: true,
         }
      )
         .select("savedPosts")
         .populate({
            path: "savedPosts",
            populate: {
               path: "community",
               select: "name",
            },
         });

      if (!updateUserPost) {
         return res.status(404).json({
            message: "User not found",
         });
      }

      const formattedPosts = updateUserPost.savedPosts.map((post) => ({
         ...post.toObject(),
         createdAt: dayjs(post.createdAt).fromNow(),
      }));

      res.status(200).json(formattedPosts);
   } catch (error) {
      return res.status(500).json({
         message: "Internal server error",
      });
   }
}

/**
 * @route GET /api/posts/saved
 */

export async function getSavedPosts(req, res) {
   try {
      const userId = req.userId;
      const user = await User.findById(userId);

      if (!user) {
         return res.status(404).json({
            message: "User not found",
         });
      }

      /**
       * send the saved posts of the communities that the user is a member
       */

      const communityIds = await Community.find({ members: userId }).distinct(
         "_id"
      );

      const savedPosts = await Post.find({
         community: {
            $in: communityIds,
         },
         _id: { $in: user.savedPosts },
      })
         .populate("user", "name avatar")
         .populate("community", "name");

      const formattedPosts = savedPosts.map((post) => ({
         ...post.toObject(),
         createdAt: dayjs(post.createdAt).fromNow(),
      }));

      res.status(200).json(formattedPosts);
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

/**
 * @route GET /posts/:publicUserId/userPosts
 * @param req.userId - The id of the current user.
 * @param {string} req.params.publicUserId - The id of the public user whose posts to retrieve.
 */

export async function getPublicPosts(req, res) {
   try {
      const publicUserId = req.params.publicUserId;
      const currentUserId = req.userId;

      const isFollowing = await Relationship.exists({
         follower: currentUserId,
         following: publicUserId,
      });

      if (!isFollowing) {
         return null;
      }

      const commonCommunityIds = await Community.find({
         members: {
            $all: [currentUserId, publicUserId],
         },
      }).distinct("_id");

      const publicPosts = await Post.find({
         community: {
            $in: commonCommunityIds,
         },
         user: publicUserId,
      })
         .populate("user", "_id name avatar")
         .populate("community", "_id name")
         .sort("-createdAt")
         .limit(10)
         .exec();

      const formattedPosts = publicPosts.map((post) => ({
         ...post.toObject(),
         createdAt: dayjs(post.createdAt).fromNow(),
      }));

      res.status(200).json(formattedPosts);

   } catch (error) {
      res.status(500).json({ 
         message: "Server error" });
   }
}

// Utility functions

async function findPostById(postId) {
   return await Post.findById(postId)
      .populate("user", "name avatar")
      .populate("community", "name")
      .lean();
}

async function findCommentsByPostId(postId) {
   return await Comment.find({ post: postId })
      .sort({ createdAt: -1 })
      .populate("user", "name avatar")
      .lean();
}

async function populatePost(post) {
   const savedByCount = await User.countDocuments({
      savedPosts: post._id,
   });

   return {
      ...post.toObject(),
      createdAt: dayjs(post.createdAt).fromNow(),
      savedByCount,
   };
}

function formatComments(comments = []) {
   return comments.map((comment) => ({
      ...comment,
      createdAt: dayjs(comment.createdAt).fromNow(),
   }));
}

async function countSavedPosts(postId) {
   await User.countDocuments({
      savedPosts: postId,
   });
}

async function findReportByPostAndUser(postId, userId) {
   return await Report.findOne({
      post: postId,
      user: userId,
   });
}