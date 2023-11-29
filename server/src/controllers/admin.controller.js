import dayjs from "dayjs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import Log from "../models/log.model.js";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import Community from "../models/community.model.js";
import AdminToken from "../models/token.admin.model.js";

import { formatCreatedAt } from "../utils/timeConverter.js";

/**
 * @route GET /api/admin/logs
 */

async function getLogInfo(req, res) {
   try {
      // Only sign in logs contain encrypted context data & email
      const [signInLogs, generalLogs] = await Promise.all([
         Log.find({ type: "sign in" }).sort({ createdAt: -1 }).limit(50),

         Log.find({ type: { $ne: "sign in" } })
            .sort({ createdAt: -1 })
            .limit(50),
      ]);

      const formattedSignInLogs = [];

      for (let i = 0; i < signInLogs.length; i++) {
         const { _id, email, context, message, type, level, timestamp } =
            signInLogs[i];
         const contextData = context.split(",");

         const formattedContext = {};

         for (let j = 0; j < contextData.length; j++) {
            const [key, value] = contextData[j].split(":");
            if (key === "IP") {
               formattedContext["IP Address"] = contextData[j]
                  .split(":")
                  .slice(1)
                  .join(":");
            } else {
               formattedContext[key.trim()] = value.trim();
            }
         }

         formattedSignInLogs.push({
            _id,
            email,
            contextData: formattedContext,
            message,
            type,
            level,
            timestamp,
         });
      }

      const formattedGeneralLogs = generalLogs.map((log) => ({
         _id: log._id,
         email: log.email,
         message: log.message,
         type: log.type,
         level: log.level,
         timestamp: log.timestamp,
      }));

      const formattedLogs = [...formattedSignInLogs, formattedGeneralLogs]
         .map((log) => ({
            ...log,
            formattedTimestamp: formatCreatedAt(log.timestamp),
            relativeTimestamp: dayjs(log.timestamp),
         }))
         .sort((a, b) => b.timestamp - a.timestamp);

      res.status(200).json(formattedLogs);
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

/**
 *
 * @param {*} req
 * @param {*} res
 *
 * @route DELETE /api/admin/logs
 */

async function deleteLogInfo(req, res) {
   try {
      await Log.deleteMany({});
      res.status(200).json({
         message: "All logs deleted!",
      });
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

/**
 * @route POST /api/admin/signin
 */

async function signIn(req, res) {
   try {
      const { username, password } = req.body;

      const existingUser = await Admin.findOne({ username });

      if (!existingUser) {
         return res.status(400).json({
            message: "Invalid credentials",
         });
      }

      const isPasswordCorrect = await bcrypt.compare(
         password,
         existingUser.password
      );

      if (!isPasswordCorrect) {
         return res.status(400).json({
            message: "Invalid credentials",
         });
      }

      const payload = {
         id: existingUser._id,
         username: existingUser.username,
      };

      const accessToken = jwt.sign(payload, process.env.ACCESS_SECRET, {
         expiresIn: "6h",
      });

      const newAdminToken = new AdminToken({
         user: existingUser._id,
         accessToken,
      });

      await newAdminToken.save();

      res.status(200).json({
         accessToken,
         accessTokenUpdatedAt: new Date().toLocaleString(),
         user: {
            _id: existingUser._id,
            username: existingUser.username,
         },
      });
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

async function getCommunity(req, res) {
   try {
      const { communityId } = req.params;

      const community = await Community.findById(communityId)
         .select("_id name description banner moderators members")
         .populate("moderators", "_id name")
         .lean();

      if (!community) {
         return res.status(404).json({
            message: "Community not found",
         });
      }

      const moderatorCount = community.moderators.length;
      const memberCount = community.members.length;

      const formattedCommunity = {
         ...community,
         memberCount,
         moderatorCount,
      };

      res.status(200).json(formattedCommunity);
   } catch (error) {
      res.status(500).json({
         message: "Error retrieving community",
      });
   }
}

async function getCommunities(req, res) {
   try {
      const communities = await Community.find({}).select("_id banner name");

      res.json(communities);
   } catch (error) {
      res.status(500).json({
         message: "Failed to get communities",
      });
   }
}

async function getModerators(req, res) {
   try {
      const moderators = await User.find({
         role: "moderator",
      }).select("_id name email");

      res.status(200).json(moderators);
   } catch (error) {
      res.status(500).json({
         message: "Error retrieving moderators",
      });
   }
}

async function addModerator(req, res) {
   try {
      const { communityId, moderatorId } = req.query;

      const community = await Community.findById(communityId);

      if (!community) {
         return res.status(404).json({
            message: "Community not found",
         });
      }

      const existingModerator = community.moderators.find(
         (mod) => mod.toString() === moderatorId
      );

      if (existingModerator) {
         return res.status(400).json({
            message: "Already a moderator",
         });
      }

      community.moderators.push(moderatorId);
      community.members.push(moderatorId);
      await community.save();

      res.status(200).json({
         message: "Moderator added",
      });
   } catch (error) {
      res.status(500).json({
         message: "Error adding moderator",
      });
   }
}

async function removeModerator(req, res) {
   try {
      const { communityId, moderatorId } = req.query;

      const community = await Community.findById(communityId);

      if (!community)
         return res.status(404).json({
            message: "Community not found",
         });

      const existingModerator = community.moderators.find(
         (mod) => mod.toString() === moderatorId
      );

      if (!existingModerator) {
         return res.status(400).json({
            message: "Not a moderator",
         });
      }

      community.moderators = community.moderators.filter(
         (mod) => mod.toString() !== moderatorId
      );

      community.members = community.members.filter(
         (mem) => mem.toString() !== moderatorId
      );

      await community.save();

      res.status(200).json({
         message: "Moderator removed",
      });
   } catch (error) {
      res.status(500).json({
         message: "Error removing moderator",
      });
   }
}

export {
   getLogInfo,
   deleteLogInfo,
   signIn,
   getCommunity,
   getCommunities,
   getModerators,
   addModerator,
   removeModerator,
};
