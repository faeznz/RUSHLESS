import mongoose from "mongoose";

export async function connectToDatabase(uri) {
  if (!uri) {
    throw new Error("Missing MongoDB connection string (MONGODB_URI).");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    return mongoose.connection;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    throw error;
  }
}

