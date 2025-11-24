import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri =
  process.env.MONGODB_URI ||
  "mongodb+srv://faeznzcreative_db_user:<db_password>@main.kobfo0d.mongodb.net/?appName=main";

const clientOptions = {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true
  }
};

async function run() {
  try {
    await mongoose.connect(uri, clientOptions);
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Failed to connect:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(console.dir);

