import express from "express";
import passport from "passport";

import userRouter from "./routes/user.route.js";
import postRouter from "./routes/post.route.js";

const app = express();

app.use("/assets/userAvatars", express.static("./assets/userAvatars"));

app.use(
   express.json({
      limit: "100kb",
   })
);

app.use(
   express.urlencoded({
      extended: true,
      limit: "100kb",
   })
);

app.use(passport.initialize());

app.get("/health-checkup", (_, res) =>
   res.json({
      message: "Server is up and running ✅",
   })
);

app.use("/api/user", userRouter);

app.use("/api/posts", postRouter);

export default app;
