import express from "express";
import passport from "passport";

import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import adminRoutes from "./routes/admin.route.js";
import communityRoutes from "./routes/community.route.js";

const app = express();

app.use("/assets/userAvatars", express.static("./assets/userAvatars"));

app.get("/health-checkup", (_, res) =>
   res.json({
      message: "Server is up and running ✅",
   })
);

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

app.use("/api/user", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/communities", communityRoutes);
app.use("/api/admin", adminRoutes);

export default app;
