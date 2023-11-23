import dotenv from "dotenv";
import app from "./app.js";
import Database from "./config/database.js";

dotenv.config({
   path: "./env",
});

const PORT = process.env.PORT || 5000;

const db = new Database(process.env.DATABASE_URL);

db.connect().catch((err) => console.error(err));

process.on("SIGINT", async () => {
   try {
      await db.disconnect();
      process.exit(0);
   } catch (error) {
      console.error(error);
      process.exit(1);
   }
});

app.listen(PORT, () => console.log(`⚙️ Server up and running on port ${PORT}`));
