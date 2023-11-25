import nodemailer from "nodemailer";
import { query, validationResult } from "express-validator";
import { verifyLoginHTML } from "../../utils/emailTemplates.js";
import SuspiciousLogin from "../../models/suspiciousLogin.model";
import EmailVerification from "../../models/email.model.js";

const CLIENT_URL = process.env.CLIENT_URL;
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;

export const verifyLoginValidation = [
   query("email").isEmail().normalizeEmail(),
   query("id").isLength({ min: 24, max: 24 }),
   (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
         return res.status(422).json({
            errors: errors.array(),
         });
      }
      next();
   },
];

export const sendLoginVerificationEmail = async (req, res) => {
   const USER = process.env.USER;
   const PASS = process.env.PASS;

   const currentContextData = req.currentContextData;

   const { email, name } = req.user;

   const id = currentContextData.id;

   const verificationLink = `${CLIENT_URL}/verify-login?id=${id}&email=${email}`;
   const blockLink = `${CLIENT_URL}/block-device?id=${id}&email=${email}`;

   try {
      const transporter = nodemailer.createTransport({
         service: EMAIL_SERVICE,
         auth: {
            user: USER,
            pass: PASS,
         },
      });

      let info = transporter.sendMail({
         from: `"Unity-Wave" <${USER}>`,
         to: email,
         subject: "Action Required: Verify Recent Login",
         html: verifyLoginHTML(
            name,
            verificationLink,
            blockLink,
            currentContextData
         ),
      });

      const newEmailVerification = new EmailVerification({
         email,
         messageId: (await info).messageId,
         for: "login",
         verificationCode: id,
      });

      await newEmailVerification.save();

      res.status(401).json({
         message:
            "Access blocked due to suspicious activity. Verification email was sent to your email address.",
      });
   } catch (error) {
      console.error(
         `Could not send email. There could be an issue with the provided credentials or the email service.`
      );
      res.status(500).json({
         message: "Something went wrong",
      });
   }
};
