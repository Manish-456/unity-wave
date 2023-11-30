import nodemailer from "nodemailer";
import { query, validationResult } from "express-validator";
import { verifyEmailHTML } from "../../utils/emailTemplates.js";

import User from "../../models/user.model.js";
import UserContext from "../../models/context.js";
import EmailVerification from "../../models/email.model.js";
import UserPreference from "../../models/preference.model.js";
import SuspiciousLogin from "../../models/suspiciousLogin.model.js";

const CLIENT_URL = process.env.CLIENT_URL;
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;

export const verifyEmailValidation = [
   query("email").isEmail().normalizeEmail(),
   query("code").isLength({ min: 5, max: 5 }),
   (req, res, next) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
         return res.status(422).json({ errors: errors.array() });
      }
      next();
   },
];

export const sendVerificationEmail = async (req, res) => {
   const USER = process.env.EMAIL;
   const PASS = process.env.PASSWORD;
   const { email, name } = req.body;

   const verificationCode = Math.floor(10000 + Math.random() * 90000);
   const verificationLink = `${CLIENT_URL}/auth/verify?code=${verificationCode}&email=${email}`;

   try {
      let transporter = nodemailer.createTransport({
         service: EMAIL_SERVICE,
         auth: {
            user: USER,
            pass: PASS,
         },
      });

      let info = await transporter.sendMail({
         from: `"Unity-Wave" <${USER}>`,
         to: email,
         subject: "Verify your email address",
         html: verifyEmailHTML(name, verificationLink, verificationCode),
      });

      const newVerification = new EmailVerification({
         email,
         verificationCode,
         messageId: info.messageId,
         for: "signup",
      });

      await newVerification.save();

      return res.status(200).json({
         message: `Verification email was successfully sent to ${email}`,
      });
   } catch (error) {
      console.error(
         "Could not send verification email. There could be an issue with the provided credentials or the email service"
      );
      return res.status(500).json({
         message: `Something went wrong`,
      });
   }
};

export const verifyEmail = async (req, res, next) => {
   const { code, email } = req.query;

   try {
      const [isVerified, verification] = await Promise.all([
         User.findOne({
            email: {
               $eq: email,
            },
            isEmailVerified: true,
         }),

         EmailVerification.findOne({
            email: { $eq: email },
            verificationCode: { $eq: code },
         }),
      ]);

      if (isVerified) {
         return res.status(400).json({ message: "Email is already verified" });
      }

      if (!verification) {
         return res.status(400).json({
            message: "Verification code is invalid or has expired",
         });
      }

      const updateUser = await User.findOneAndUpdate(
         {
            email: {
               $eq: email,
            },
         },
         {
            isEmailVerified: true,
         },
         {
            new: true,
         }
      ).exec();

      await Promise.all([
         EmailVerification.deleteMany({
            email: {
               $eq: email,
            },
         }).exec(),

         new UserPreference({
            user: updateUser,
            enableContextBasedAuth: true,
         }),
      ]);
   } catch (error) {}
};

const verifyLogin = async (req, res) => {
   const { id, email } = req.query;

   try {
      const suspiciousLogin = await SuspiciousLogin.findById(id);

      if (!suspiciousLogin || suspiciousLogin.email !== email) {
         return res.status(400).json({
            message: "Invalid verification link",
         });
      }

      const newContextData = new UserContext({
         user: suspiciousLogin.user,
         email: suspiciousLogin.email,
         ip: suspiciousLogin.ip,
         city: suspiciousLogin.city,
         country: suspiciousLogin.country,
         device: suspiciousLogin.device,
         deviceType: suspiciousLogin.deviceType,
         browser: suspiciousLogin.browser,
         os: suspiciousLogin.os,
         platform: suspiciousLogin.platform,
      });

      await newContextData.save();
      await SuspiciousLogin.findOneAndUpdate(
         {
            _id: { $eq: id },
         },
         {
            $set: {
               isTrusted: true,
               isBlocked: false,
            },
         },
         {
            new: true,
         }
      );

      res.status(200).json({
         message: "Login verified",
      });
   } catch (error) {
      res.status(500).json({
         message: "Could not verify your login",
      });
   }
};

export { verifyLogin };
