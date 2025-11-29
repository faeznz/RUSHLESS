import mongoose from "mongoose";

const mobileConfigSchema = new mongoose.Schema(
  {
    link_web: {
      type: String,
      required: true,
      trim: true
    },
    pin_app: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true,
    collection: "mobile_configs"
  }
);

export const MobileConfig = mongoose.model("MobileConfig", mobileConfigSchema);

