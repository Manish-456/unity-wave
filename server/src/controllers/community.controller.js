import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";

import User from "../models/user.model.js";
import Report from "../models/report.model.js";
import Community from "../models/community.model.js";
import Rule from "../models/rule.model.js";

dayjs.extend(relativeTime);

async function getCommunities(req, res) {
   try {
      const communities = await Community.find();
      res.status(200).json(communities);
   } catch (error) {
      res.status(500).json({
         message: "Error retrieving communities.",
      });
   }
}

async function getCommunity(req, res) {
   try {
      const community = await Community.findOne({
         name: req.params.name,
      })
         .populate("rules")
         .lean();
      if (!community) {
         return res.status(404).json({
            message: "Community not found",
         });
      }

      return res.status(200).json(community);
   } catch (error) {
      res.status(500).json({
         message: "Failed to retrieve community",
      });
   }
}

async function createCommunity(req, res) {
   try {
      const communities = req.body;
      const savedCommunities = await Community.insertMany(communities);
      res.status(201).json(savedCommunities);
   } catch (error) {
      res.status(500).json({
         message: "Error creating community",
      });
   }
}

async function addRules(req, res) {
   const rules = req.body;
   try {
      const savedRules = await Rule.insertMany(rules);
      res.status(201).json(savedRules);
   } catch (error) {
      res.status(400).json({
         message: "Error creating rules",
      });
   }
}

async function addRulesToCommunity(req, res) {
   try {
      const { name } = req.params;
      const rules = await Rule.find();

      const appliedRules = await Community.findOneAndUpdate(
         {
            name,
         },
         {
            $push: {
               rules,
            },
         },
         {
            new: true,
         }
      );

      res.status(201).json(appliedRules);
   } catch (error) {
      res.status(500).json({
         message: "Server failed to add rules to the community",
      });
   }
}

/**
 * Retrieves all communities that a user is a member of, including the community's ID,
 * name, banner, image, member count, and description
 *
 * @route GET /api/communities/member
 */

async function getMemberCommunities(req, res) {
   try {
      const communities = await Community.find({
         members: {
            $in: [req.userId],
         },
      })
         .select("_id name banner members description")
         .lean();

      res.status(200).json(communities);
   } catch (error) {
      return res.status(500).json({
         message: "Error getting communities",
      });
   }
}

/**
 * Retrieves up to 10 public communities that the current user is not a member of,
 *  and has not been banned from, including their name, banner image, description,
 *  and member count, sorted by the name of members
 *
 * @route GET /api/communities/not-member
 */

async function getNotMemberCommunities(req, res) {
   try {
      const communities = await Community.find({
         members: {
            $nin: [req.userId],
         },
         bannedUsers: {
            $nin: [req.userId],
         },
      })
         .select("_id name banner description members")
         .lean();

      return res.status(200).json(communities);
   } catch (error) {
      res.status(500).json({
         message: "Error getting communities",
      });
   }
}

/**
 * @route POST /api/communities/:name/join
 */
async function joinCommunity(req, res) {
   try {
      const { name } = req.params;

      const community = await Community.findOneAndUpdate(
         {
            name,
         },
         {
            $push: {
               members: req.userId,
            },
         },
         {
            new: true,
         }
      );

      res.status(200).json(community);
   } catch (error) {
      res.status(500).json({
         message: "Error joining community",
      });
   }
}

/**
 * @route POST /api/communities/:name/leave
 */

async function leaveCommunity(req, res) {
   try {
      const { name } = req.params;

      const community = await Community.findOneAndUpdate(
         {
            name,
         },
         {
            $pull: {
               members: req.userId,
            },
         },
         {
            new: true,
         }
      );

      res.status(200).json(community);
   } catch (error) {
      res.status(500).json({
         message: "Failed to leave community",
      });
   }
}

/**
 * @route POST /api/communities/:name/ban/:id
 * @param {string} req.params.id - The ID of the user to ban.
 * @param {string} req.params.name - The name of the community to ban the user from
 */

async function banUser(req, res) {
   try {
      const { name, id } = req.params;

      const community = await Community.findOneAndUpdate(
         {
            name,
         },
         {
            $pull: {
               members: id,
            },
            $push: {
               bannedUsers: id,
            },
         },
         {
            new: true,
         }
      );

      res.status(200).json(community);
   } catch (error) {
      return res.status(500).json({
         message: "Failed to ban user",
      });
   }
}

/**
 * @route POST /communities/:name/unban/:id
 * @param {string} req.params.id - The ID of the user to unban.
 * @param {string} req.params.name - The name of the community to unban the user from.
 */

async function unbanUser(req, res) {
   try {
      const { id, name } = req.params;

      const community = await Community.findOneAndUpdate(
         {
            name,
         },
         { $pull: { bannedUsers: id } },
         { new: true }
      );

      return res.status(200).json(community);
   } catch (error) {
      return res.status(500).json({
         message: "Error unbanning user from community",
      });
   }
}

/**
 * @async
 * @function addModToCommunity
 *
 * @param {string} req.body.userId - The ID of the user to add as a moderator
 * @param {string} req.params.name - The name of the community to add the user to.
 */

async function addModToCommunity(req, res) {
   try {
      const userId = req.body.userId;
      const communityName = req.params.name;
      const currentUser = await User.findById(userId);

      if (currentUser.role !== "moderator") {
         return res.status(401).json({
            message: "Only moderators can be added.",
         });
      }

      await Community.findOneAndUpdate(
         {
            name: communityName,
         },
         {
            $addToSet: {
               moderators: userId,
               members: userId,
            },
         },
         {
            new: true,
         }
      );

      res.status(200).send(
         `User was added as a moderator and member of ${communityName}`
      );
   } catch (error) {
      res.status(500).json({
         message: "Server Error",
      });
   }
}

async function reportPost(req, res) {
   try {
      const { postId, reportReason, communityId } = req.body.info;

      if (!postId || !reportReason) {
         return res.status(400).json({
            message: "Invalid data. PostId and report reason are required.",
         });
      }

      const reportedPost = await Report.findOne({
         post: {
            $eq: postId,
         },
      });

      if (reportedPost) {
         if (reportedPost.reportedBy.includes(req.userId)) {
            return res.status(400).json({
               message: "You have already reported this post.",
            });
         }

         reportedPost.reportedBy.push(req.userId);
         await reportedPost.save();

         return res.status(200).json(reportedPost);
      }

      const report = {
         post: postId,
         community: communityId,
         reportedBy: [req.userId],
         reportReason,
         reportDate: new Date(),
      };

      await Report.create(report);

      res.status(200).json({
         message: "Post reported successfully",
      });
   } catch (error) {
      res.status(500).json({
         message: "Error reporting post",
      });
   }
}

/**
 * Retrieves the reported posts for a given community,
 * including the post information and the user who reported it.
 *
 * @route GET /api/communities/:name/reported-posts
 *
 * @param {Object} req.params.name - The name of the community to retrieve the reported posts for.
 */

async function getReportedPosts(req, res) {
   try {
      const communityName = req.params.name;
      const community = await Community.findOne({
         name: communityName,
      })
         .select("_id")
         .lean();

      const communityId = community._id;

      if (!communityId) {
         return res.status(404).json({
            message: "Community not found",
         });
      }

      const reportedPosts = await Report.find({
         community: communityId,
      })
         .populate({
            path: "post",
            model: "Post",
            select: ["_id", "content", "fileUrl", "createdAt", "user"],
         })
         .populate({
            path: "user",
            model: "User",
            select: ["name", "avatar"],
         })
         .populate({
            path: "reportedBy",
            model: "User",
            select: ["name", "avatar"],
         })
         .sort({
            reportDate: -1,
         });

      if (!reportedPosts) {
         return res.status(404).json({
            message: "Reported post not found",
         });
      }

      reportedPosts.forEach((post) => {
         post.reportDate = dayjs(post.reportDate).fromNow();
      });

      return res.status(200).json({
         reportedPosts,
      });
   } catch (error) {
      return res.status(500).json({
         message: "An error occurred while retrieving the reported posts",
      });
   }
}

/**
 * @route DELETE /api/communities/reported-posts/:postId
 */

async function removeReportedPost(req, res){
   try {
      const postId = req.params.postId;
      
      await Report.findOneAndDelete({
         post : postId
      });

      res.status(200).json({
         message : "Reported post removed successfully"
      })
   } catch (error) {
      res.status(500).json({
         message : "Server Error"
      })
   }
}
/**
 * @router GET /api/communities/:name/members
 */

async function getCommunityMembers(req, res) {
   try {
      const communityName = req.params.name;
      const community = await Community.findOne({
         name: communityName,
      })
         .populate({
            path: "members",
            model: "User",
            select: ["name", "avatar", "createdAt", "_id", "location"],
            match: {
               role: {
                  $ne: "moderator",
               },
            },
         })
         .populate({
            path: "bannedUsers",
            model: "User",
            select: ["name", "avatar", "createdAt", "_id", "location"],
         })
         .lean();

      if (!community) {
         return res.status(404).json({
            message: "Community not found",
         });
      }

      const members = community.members;
      const bannedUsers = community.bannedUsers;

      return res.status(200).json({
         members,
         bannedUsers,
      });
   } catch (error) {
      return res.status(500).json({
         message: "Server error",
      });
   }
}

/**
 * @route GET /api/communities/:name/moderators
 */

async function getCommunityMods(req, res) {
   try {
      const communityName = req.params.name;
      const community = await Community.findOne({
         name: communityName,
      })
         .populate({
            path: "moderators",
            model: "User",
            select: ["name", "avatar", "createdAt", "_id", "location"],
            match: { role: "moderator" },
         })
         .lean();

      if (!community) {
         return res.status(404).json({
            message: "Community not found",
         });
      }

      const moderators = community.moderators;

      return res.status(200).json(moderators);
   } catch (error) {
      return res.status(500).json({
         message: "Server error",
      });
   }
}

export {
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
};
