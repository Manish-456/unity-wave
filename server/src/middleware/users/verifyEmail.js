import nodemailer from "nodemailer";
import { query, validationResult } from "express-validator";
import { verifyEmailHTML } from "../../utils/emailTemplates.js";
import EmailVerification from "../../models/email.model.js";

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
      console.error("Could not send verification email. There could be an issue with the provided credentials or the email service");
      return res.status(500).json({
        message : `Something went wrong`
      });
   }
};

