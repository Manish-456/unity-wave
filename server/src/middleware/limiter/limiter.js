import {rateLimit} from "express-rate-limit";

const MESSAGE = "Too many requests, please try again later.";

const createRateLimit = (windowMs, max, message) => {
    return rateLimit({
        windowMs,
        max,
        message : {
            message
        }
    })
};

export const signUpSignInLimiter = createRateLimit(10 * 60 * 1000, 100, MESSAGE);