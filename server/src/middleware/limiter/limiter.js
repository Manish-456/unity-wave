import { rateLimit } from "express-rate-limit";

const MESSAGE = "Too many requests, please try again later.";

const createRateLimit = (windowMs, max, message) => {
   return rateLimit({
      windowMs,
      max,
      message: {
         message,
      },
   });
};

export const signUpSignInLimiter = createRateLimit(
   10 * 60 * 1000,
   100,
   MESSAGE
);
export const createPostLimiter = createRateLimit(5 * 60 * 1000, 20, MESSAGE);
export const commentLimiter = createRateLimit(5 * 60 * 1000, 100, MESSAGE);
export const likeSaveLimiter = createRateLimit(10 * 60 * 1000, 250, MESSAGE);
export const logLimiter = createRateLimit(60 * 60 * 1000, 3500, MESSAGE)
