import geoip from "geoip-lite";

import UserContext from "../models/context.model.js";
import SuspiciousLogin from "../models/suspiciousLogin.model.js";
import UserPreference from "../models/preference.model.js";
import { getCurrentContextData } from "../utils/contextData.js";
import { formatCreatedAt } from "../utils/timeConverter.js";
import { saveLogInfo } from "../middleware/logger/logInfo.js";

 const types = {
   NO_CONTEXT_DATA: "no_context_data",
   MATCH: "match",
   BLOCKED: "blocked",
   SUSPICIOUS: "suspicious",
   ERROR: "error",
};

const isTrustedDevice = (currentContextData, userContextData) => {
   return Object.keys(userContextData).every(
      (key) => currentContextData[key] === userContextData[key]
   );
};

const isSuspiciousContextChanged = (oldContextData, userContextData) =>
   Object.keys(oldContextData).some(
      (key) => oldContextData[key] !== userContextData[key]
   );

const isOldDataMatched = (oldSuspiciousContextData, newContextData) =>
   Object.keys(oldSuspiciousContextData).every(
      (key) => oldSuspiciousContextData[key] === newContextData[key]
   );

const getOldSuspiciousContextData = (_id, currentContextData) => {
   const { ip, country, city, browser, platform, os, device, deviceType } =
      currentContextData;

   return SuspiciousLogin.findOne({
      user: _id,
      ip,
      country,
      city,
      browser,
      platform,
      os,
      device,
      deviceType,
   });
};

const addNewSuspiciousLogin = async (_id, email, currentContextData) => {
   const newSuspiciousLogin = new SuspiciousLogin({
      user: _id,
      email,
      ip: currentContextData.ip,
      country: currentContextData.country,
      city: currentContextData.city,
      browser: currentContextData.browser,
      platform: currentContextData.platform,
      os: currentContextData.os,
      device: currentContextData.device,
      deviceType: currentContextData.deviceType,
   });

   await newSuspiciousLogin.save();
};

const verifyContextData = async (req, existingUser) => {
   try {
      const { _id } = existingUser;
      const userContextDataRes = await UserContext.findOne({
         user: _id,
      });

      if (!userContextData) {
         return types.NO_CONTEXT_DATA;
      }

      const { ip, country, city, browser, platform, os, device, deviceType } =
         userContextDataRes._doc;

      const userContextData = {
         ip,
         city,
         country,
         browser,
         platform,
         os,
         device,
         deviceType,
      };

      const currentContextData = getCurrentContextData(req);

      if (isTrustedDevice(currentContextData, userContextData)) {
         return types.MATCH;
      }

      const oldSuspiciousContextData = await getOldSuspiciousContextData(
         _id,
         currentContextData
      );

      if (oldSuspiciousContextData) {
         if (oldSuspiciousContextData.isBlocked) return types.BLOCKED;
         if (oldSuspiciousContextData.isTrusted) return types.MATCH;
      }

      let newSuspiciousData = {};

      if (
         oldSuspiciousContextData &&
         isSuspiciousContextChanged(
            oldSuspiciousContextData,
            currentContextData
         )
      ) {
         const {
            ip: suspiciousIp,
            country: suspiciousCountry,
            city: suspiciousCity,
            browser: suspiciousBrowser,
            platform: suspiciousPlatform,
            os: suspiciousOs,
            device: suspiciousDevice,
            deviceType: suspiciousDeviceType,
         } = oldSuspiciousContextData;

         if (
            suspiciousIp !== currentContextData.ip ||
            suspiciousOs !== currentContextData.os ||
            suspiciousBrowser !== currentContextData.browser ||
            suspiciousDevice !== currentContextData.device ||
            suspiciousDeviceType !== currentContextData.deviceType ||
            suspiciousPlatform !== currentContextData.platform ||
            suspiciousCity !== currentContextData.city ||
            suspiciousCountry !== currentContextData.country
         ) {
            // Suspicious login data found, but it doesn't match the current context data, so add new suspicious login data
            const res = await addNewSuspiciousLogin(
               _id,
               existingUser.email,
               currentContextData
            );

            newSuspiciousData = {
               time: formatCreatedAt(res.createdAt),
               ip: res.ip,
               country: res.country,
               city: res.city,
               browser: res.browser,
               os: res.os,
               device: res.device,
               deviceType: res.deviceType,
               platform: res.platform,
            };
         } else {
            // increase the unverifiedAttempts count by 1
            await SuspiciousLogin.findByIdAndUpdate(
               oldSuspiciousContextData._id,
               {
                  $inc: {
                     unverifiedAttempts: 1,
                  },
               },
               {
                  new: true,
               }
            );

            // If the unverifiedAttempts count is greater than or equal to 3, then block the user
            if (oldSuspiciousContextData.unverifiedAttempts >= 3) {
               await SuspiciousLogin.findByIdAndUpdate(
                  oldSuspiciousContextData._id,
                  {
                     isBlocked: true,
                     isTrusted: false,
                  },
                  {
                     new: true,
                  }
               );

               await saveLogInfo(
                  req,
                  "Device blocked due to too many unverified login attempts",
                  "sign in",
                  "warn"
               );

               return types.BLOCKED;
            }
            // Suspicious login data found, and it matches the current context data, so we return "already_exists"
            return types.SUSPICIOUS;
         }
      } else if (
         oldSuspiciousContextData &&
         isOldDataMatched(oldSuspiciousContextData, currentContextData)
      ) {
         return types.MATCH;
      } else {
         // No Previous suspicious login data found, so we create a new one
         const res = await addNewSuspiciousLogin(
            _id,
            existingUser.email,
            currentContextData
         );

         newSuspiciousData = {
            time: formatCreatedAt(res.createdAt),
            id: res._id,
            ip: res.ip,
            country: res.country,
            city: res.city,
            browser: res.browser,
            platform: res.platform,
            os: res.os,
            device: res.device,
            deviceType: res.deviceType,
         };
      }

      const mismatchedProps = [];
      const { time, id, ...rest } = newSuspiciousData;
      for (const prop in rest) {
         if (userContextData[prop] !== newSuspiciousData[prop]) {
            mismatchedProps.push(prop);
         }
      }

      // if (userContextData.ip !== newSuspiciousData.ip) {
      //    mismatchedProps.push("ip");
      // }
      // if (userContextData.browser !== newSuspiciousData.browser) {
      //    mismatchedProps.push("browser");
      // }
      // if (userContextData.device !== newSuspiciousData.device) {
      //    mismatchedProps.push("device");
      // }
      // if (userContextData.deviceType !== newSuspiciousData.deviceType) {
      //    mismatchedProps.push("deviceType");
      // }
      // if (userContextData.country !== newSuspiciousData.country) {
      //    mismatchedProps.push("country");
      // }
      // if (userContextData.city !== newSuspiciousData.city) {
      //    mismatchedProps.push("city");
      // }

      if (mismatchedProps.length > 0) {
         return {
            mismatchedProps: mismatchedProps,
            currentContextData: newSuspiciousData,
         };
      }

      return types.MATCH;
   } catch (error) {
      return types.ERROR;
   }
};

async function addContextData(req, res) {
   const userId = req.userId;
   const email = req.email;
   const ip = req.ip || "unknown";

   const location = geoip.lookup(ip) || "unknown";
   const country = location.country ? location.country.toString() : "unknown";
   const city = location.city ? location.city.toString() : "unknown";

   const browser = req.useragent.browser
      ? `${req.useragent.browser} ${req.useragent.version}`
      : "unknown";
   const os = req.useragent.os ? req.useragent.os : "unknown";
   const platform = req.useragent.platform
      ? req.useragent.platform.toString()
      : "unknown";
   const device = req.useragent.device
      ? req.useragent.device.toString()
      : "unknown";

   const isMobile = req.useragent.isMobile || false;
   const isDesktop = req.useragent.isDesktop || false;
   const isTablet = req.useragent.isTablet || false;

   const deviceType = isMobile
      ? "Mobile"
      : isDesktop
        ? "Desktop"
        : isTablet
          ? "Tablet"
          : "unknown";

   const newUserContext = new UserContext({
      user,
      email,
      ip,
      country,
      city,
      browser,
      os,
      platform,
      device,
      deviceType,
   });

   try {
      await newUserContext.save();
      res.status(200).json({
         message: "Email verification process was successful",
      });
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

/**
 * @route GET /auth/context-data/primary
 */

async function getAuthContextdata(req, res) {
   try {
      const result = await UserContext.findOne({
         user: req.userId,
      });

      if (!result) {
         return res.status(404).json({
            message: "Not found",
         });
      }

      const userContextData = {
         firstAdded: formatCreatedAt(result.createdAt),
         ip: result.ip,
         country: result.country,
         city: result.city,
         browser: result.browser,
         platform: result.platform,
         os: result.os,
         device: result.device,
         deviceType: result.deviceType,
      };

      res.status(200).json(userContextData);
   } catch (error) {}
}

/**
 * @route GET /api/auth/context-data/trusted
 */

async function getTrustedAuthContextData(req, res) {
   try {
      const result = await SuspiciousLogin.find({
         user: req.userId,
         isTrusted: true,
         isBlocked: false,
      });

      const trustedAuthContextData = result.map((item) => ({
         _id: item._id,
         time: formatCreatedAt(item.createdAt),
         ip: item.ip,
         country: item.country,
         city: item.city,
         browser: item.browser,
         platform: item.platform,
         os: item.os,
         device: item.device,
         deviceType: item.deviceType,
      }));

      res.json(trustedAuthContextData);
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

/**
 * @route GET /api/auth/context-data/blocked
 */

async function getBlockedAuthContextData(req, res) {
   try {
      const result = await SuspiciousLogin.find({
         user: req.userId,
         isTrusted: false,
         isBlocked: true,
      });

      const blockedAuthContextData = result.map((item) => ({
         _id: item._id,
         time: formatCreatedAt(item.createdAt),
         ip: item.ip,
         country: item.country,
         city: item.city,
         browser: item.browser,
         platform: item.platform,
         os: item.os,
         device: item.device,
         deviceType: item.deviceType,
      }));

      res.json(blockedAuthContextData);
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

/**
 * @route GET /api/auth/user-preferences
 */

async function getUserPreference(req, res) {
   try {
      const userPreferences = await UserPreference.findOne({
         user: req.userId,
      });

      if (!userPreferences) {
         return res.status(404).json({
            message: "Not found",
         });
      }

      res.status(200).json(userPreferences);
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

/**
 * @route DELETE /api/auth/context-data/:contextId
 */

async function deleteContextAuthData(req, res) {
   try {
      const contextId = req.params.contextId;

      await SuspiciousLogin.deleteOne({ _id: contextId });

      res.status(200).json({
         message: "Data deleted successfully",
      });
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

/**
 * @route PATCH /api/auth/context-data/block/:contextId
 */

async function blockContextAuthData(req, res) {
   try {
      const contextId = req.params.contextId;

      await SuspiciousLogin.findOneAndUpdate(
         {
            _id: contextId,
         },
         {
            $set: {
               isBlocked: true,
               isTrusted: false,
            },
         },
         {
            new: true,
         }
      );

      res.status(200).json({
         message: "Blocked successfully",
      });
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

/**
 * @route PATCH /api/auth/context-data/unblock/:contextId
 */

async function unblockContextAuthData(req, res) {
   try {
      const contextId = req.params.contextId;

      await SuspiciousLogin.findOneAndUpdate(
         {
            _id: contextId,
         },
         {
            $set: {
               isBlocked: false,
               isTrusted: true,
            },
         },
         {
            new: true,
         }
      );

      res.status(200).json({
         message: "Unblock successfully",
      });
   } catch (error) {
      res.status(500).json({
         message: "Internal server error",
      });
   }
}

export {
   verifyContextData,
   addContextData,
   getAuthContextdata,
   getTrustedAuthContextData,
   getBlockedAuthContextData,
   getUserPreference,
   deleteContextAuthData,
   blockContextAuthData,
   unblockContextAuthData,
   types
};
