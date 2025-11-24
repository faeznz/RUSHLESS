import dotenv from "dotenv";
import app from "./app.js";
import { connectToDatabase } from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

async function bootstrap() {
  try {
    await connectToDatabase(MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Config API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

bootstrap();

