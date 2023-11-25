import UserContext from "../models/context.model.js";
import SuspiciousLogin from "../models/suspiciousLogin.model.js";
import { getCurrentContextData } from "../utils/contextData.js";
import { formatCreatedAt } from "../utils/timeConverter.js";
import { saveLogInfo } from "../middleware/logger/logInfo.js";

export const types = {
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
export const verifyContextData = async (req, existingUser) => {
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

      let  newSuspiciousData = {};

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
      const {time, id, ...rest} = newSuspiciousData;
      for(const prop in rest){
         if(userContextData[prop] !== newSuspiciousData[prop]){
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
