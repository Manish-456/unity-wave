import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import passport from "passport";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
import Token from "../models/token.model.js";

const opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.ACCESS_SECRET;

passport.use(
   new JwtStrategy(opts, async function (jwt_payload, done) {
      try {
         const user = await User.findOne({
            email: jwt_payload.email,
         });

         if (user) {
            const refreshTokenFromDB = await Token.findOne({
               user: user._id,
            });

            if (!refreshTokenFromDB) {
               return done(null, false);
            }

            const refreshTokenPayload = jwt.verify(
               refreshTokenFromDB.refreshToken,
               process.env.REFRESH_SECRET
            );

            if (refreshTokenPayload.email !== user.email) {
               return done(null, false);
            }

            const tokenExpiration = new Date(jwt_payload.exp * 1000);
            const now = new Date();
            const timeDifference = tokenExpiration.getTime() - now.getTime();

            if (timeDifference > 0 && timeDifference < 30 * 60 * 1000) {
               const payload = {
                  _id: user._id,
                  email: user.email,
               };

               const newToken = jwt.sign(payload, process.env.ACCESS_SECRET, {
                  expiresIn: "6h",
               });

               return done(null, { user, newToken });
            }
            return done(null, { user });
         } else {
            return done(null, false);
         }
      } catch (error) {
         return done(null, false);
      }
   })
);
