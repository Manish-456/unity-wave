import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import userRouter from "./routes/user.route.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(
   "/assets/userAvatars",
   express.static(join(__dirname, "../assets/userAvatars"))
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

app.get("/health-checkup", (_, res) =>
   res.json({
      message: "Server is up and running ✅",
   })
);

app.use("/api", userRouter);

export default app;
