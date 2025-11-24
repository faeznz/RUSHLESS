import app from "../src/app.js";
import { connectToDatabase } from "../src/config/db.js";

let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected) {
    await connectToDatabase(process.env.MONGODB_URI);
    isConnected = true;
  }
  return app(req, res);
}


