import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Token from "../models/token.model.js";
import { saveLogInfo } from "../middleware/logger/logInfo.js";
import UserPreference from "../models/preference.model.js";
import { types, verifyContextData } from "./auth.controller.js";

const LOG_TYPE = {
   SIGN_IN: "sign in",
   LOGOUT: "logout",
};

const LEVEL = {
   INFO: "info",
   WARN: "warn",
   ERROR: "error",
};

const MESSAGE = {
   SIGN_IN_ATTEMPT: "User attempting to sign in",
   SIGN_IN_ERROR: "Error occured while signing in user: ",
   INCORRECT_EMAIL: "Incorrect email",
   INCORRECT_PASSWORD: "Incorrect password",
   DEVICE_BLOCKED: "Sign in attempt from blocked device",
   CONTEXT_DATA_VERIFY_ERROR: "Context data verification failed",
   MULTIPLE_ATTEMPT_WITHOUT_VERIFY:
      "Multiple sign in attempts detected without verifying identity.",
   LOGOUT_SUCCESS: "User has logged out successfully",
};

export async function signIn(req, res, next) {
   await saveLogInfo(
      req,
      MESSAGE.SIGN_IN_ATTEMPT,
      LOG_TYPE.SIGN_IN,
      LEVEL.INFO
   );

   try {
      const { email, password } = req.body;

      const existingUser = await User.findOne({
         email: {
            $eq: email,
         },
      });

      if (!existingUser) {
         await saveLogInfo(
            req,
            MESSAGE.INCORRECT_EMAIL,
            LOG_TYPE.SIGN_IN,
            LEVEL.ERROR
         );

         return res.status(400).json({
            message: "Invalid credentials",
         });
      }

      const isCorrectPassword = await bcrypt.compare(
         password,
         existingUser.password
      );


      if (!isCorrectPassword) {
         await saveLogInfo(
            req,
            MESSAGE.INCORRECT_PASSWORD,
            LOG_TYPE.SIGN_IN,
            LEVEL.ERROR
         );

         return res.status(400).json({
            message: "Invalid credentials",
         });
      }

      const isContextAuthEnabled = await UserPreference.findOne({
         user: existingUser._id,
         enableContextBasedAuth: true,
      });

      if (isContextAuthEnabled) {
         const contextDataResult = await verifyContextData(req, existingUser);

         if (contextDataResult === types.BLOCKED) {
            await saveLogInfo(
               req,
               MESSAGE.DEVICE_BLOCKED,
               LOG_TYPE.SIGN_IN,
               LEVEL.WARN
            );

            return res.status(401).json({
               message:
                  "You've been blocked due to suspicious login activity. Please contact support for assistance.",
            });
         }

         if (
            contextDataResult === types.NO_CONTEXT_DATA ||
            contextDataResult === types.ERROR
         ) {
            await saveLogInfo(
               req,
               MESSAGE.CONTEXT_DATA_VERIFY_ERROR,
               LOG_TYPE.SIGN_IN,
               LEVEL.ERROR
            );

            return res.status(500).json({
               message: "Error occured while verifying context data",
            });
         }

         if (contextDataResult === types.SUSPICIOUS) {
            await saveLogInfo(
               req,
               MESSAGE.MULTIPLE_ATTEMPT_WITHOUT_VERIFY,
               LOG_TYPE.SIGN_IN,
               LEVEL.WARN
            );

            return res.status(401).json({
               message: `You've temporarily been blocked due to suspicious login activity. We have already sent a verification email to your registered email address.
               Please follow the instructions in the email to verify your identity and gain access to your account.

               Please note that repeated attempts to log in without verifying your identity will result in this device being permanently blocked from accessing your account.

               Thank you for your cooperation`,
            });
         }

         if (contextDataResult.mismatchedProps) {
            const mismatchedProps = contextDataResult.mismatchedProps;
            const currentContextData = contextDataResult.currentContextData;

            if (
               mismatchedProps.some((prop) =>
                  [
                     "ip",
                     "country",
                     "city",
                     "browser",
                     "device",
                     "deviceType",
                     "os",
                     "platform",
                  ].includes(prop)
               )
            ) {
               req.mismatchedProps = mismatchedProps;
               req.currentContextData = currentContextData;
               req.user = existingUser;
               return next();
            }
         }
      }

      const payload = {
         id: existingUser._id,
         email: existingUser.email,
      };

      const accessToken = jwt.sign(payload, process.env.ACCESS_SECRET, {
         expiresIn: "6h",
      });

      const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, {
         expiresIn: "7d",
      });

      const newRefreshToken = new Token({
         user: existingUser._id,
         accessToken,
         refreshToken,
      });

      await newRefreshToken.save();

      return res.status(200).json({
         accessToken,
         refreshToken,
         accessTokenUpdatedAt: new Date().toLocaleString(),
         user: {
            _id: existingUser._id,
            name: existingUser.email,
            role: existingUser.role,
            avatar: existingUser.avatar,
            email: existingUser.email,
         },
      });
   } catch (error) {
      console.log(error);
      await saveLogInfo(
         req,
         MESSAGE.SIGN_IN_ERROR + error.message,
         LOG_TYPE.SIGN_IN,
         LEVEL.ERROR
      );

      res.status(500).json({
         message: "Something went wrong",
      });
   }
}

/**
 * @description If the email domain of the user's email is "mod.unitywave.com",
 *  the user will be assigned the role of "moderator" by default,
 *  but not necessarily as a moderator of any community.
 * Otherwise, the user will be assigned the role of "general" user.
 *
 * @param {Object} req.files - The files attached to the request object (for avatar).
 * @param {string} req.body.isConsentGiven - Indicates whether the user has given consent to enable context based auth.
 * @param {Function} next - The next middleware function to call if consent is given by the user to enable context based auth.
 */

export async function addUser(req, res, next) {
   let newUser;

   const hashedPassword = await bcrypt.hash(req.body.password, 10);

   /**
    * @type {boolean} isConsentGiven
    */

   const isConsentGiven = JSON.parse(req.body.isConsentGiven || false);

   const defaultAvatar =
      "https://raw.githubusercontent.com/nz-m/public-files/main/dp.jpg";

   const fileUrl = req.files?.[0]?.filename
      ? `${req.protocol}://${req.get("host")}/assets/userAvatars/${
           req.files?.[0]?.filename
        }`
      : defaultAvatar;

   const emailDomain = req.body.email.split("@")[1];

   const role = emailDomain === "mod.unitywave.com" ? "moderator" : "general";

   newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      role: role,
      avatar: fileUrl,
   });

   try {
      await newUser.save();

      if (newUser.isNew) {
         throw new Error("Failed to add user");
      }

      if (!isConsentGiven) {
         return res.status(201).json({
            message: "User added successfully",
         });
      } else {
         next();
      }
   } catch (error) {
      return res.status(400).json({
         message: "Failed to add user",
      });
   }
}


export async function logout(req, res){
   try {
      const accessToken = req.headers.authorization?.split(" ")[1] ?? null;
      if(accessToken){
         await Token.deleteOne({accessToken});
         await saveLogInfo(null, MESSAGE.LOGOUT_SUCCESS, LOG_TYPE.LOGOUT, LEVEL.INFO);
      }

      res.status(200).json({
         message : "Logout successfull"
      })
   } catch (error) {
      await saveLogInfo(null, error.message, LOG_TYPE.LOGOUT, LEVEL.ERROR);
      res.status(500).json({
         message : "Internal server error. Please try again later"
      })
   }
}