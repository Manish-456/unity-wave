import dayjs from "dayjs";
import bcrypt from "bcrypt";

import Log from "../models/log.model.js";
import User from "../models/user.model.js";
import Admin from "../models/admin.model.js";
import Community from "../models/community.model.js";

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

      const formattedLogs = [...formattedSignInLogs, formattedGeneralLogs].map(
         (log) => ({
            ...log,
            formattedTimestamp: formatCreatedAt(log.timestamp),
            relativeTimestamp : dayjs(log.timestamp)
         })
      ).sort((a, b) => b.timestamp - a.timestamp);

      res.status(200).json(formattedLogs)
   } catch (error) {
    res.status(500).json({
        message : "Internal server error"
    })
   }
}

export {
    getLogInfo
}
