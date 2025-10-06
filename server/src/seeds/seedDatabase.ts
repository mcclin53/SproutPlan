import mongoose from "mongoose";
import Plant from "../models/Plant.js";
import { DEFAULT_PLANTS } from "./plants.js";

async function seedPlants(force = false) {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/SproutPlan");

  if (force) {
    console.log("Force re-seeding plants...");
    await Plant.deleteMany({});
    await Plant.insertMany(DEFAULT_PLANTS);
  } else {
    const count = await Plant.countDocuments();
    if (count === 0) {
      console.log("Seeding plants...");
      await Plant.insertMany(DEFAULT_PLANTS);
    } else {
      console.log("Plants already exist. Skipping seeding.");
    }
  }

  console.log("Done!");
  mongoose.disconnect();
}

// Check command-line arguments for "--force"
const forceFlag = process.argv.includes("--force");
seedPlants(forceFlag);
