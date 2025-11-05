import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Plant from "../models/Plant.js";
import { SeedProgress } from "../models/SeedProgress.js";
import { DEFAULT_PLANTS } from "./plants.js";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../server/.env") });

const PERENUAL_API_KEY = process.env.PERENUAL_API_KEY;
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/SproutPlan";
const DAILY_LIMIT = 100; // Max plants to seed per run
const CONCURRENCY = 5;
const BATCH_DELAY = 2000; // 2 seconds between batches
console.log("Perenual API Key:", PERENUAL_API_KEY);
async function fetchPlantList(page = 1, perPage = 50) {
  const url = `https://perenual.com/api/v2/species-list?key=${PERENUAL_API_KEY}&page=${page}&per_page=${perPage}`;
  const res = await axios.get(url);
  return res.data.data;
}

async function fetchPlantDetails(id: string) {
  const url = `https://perenual.com/api/v2/species/details/${id}?key=${PERENUAL_API_KEY}`;
  const res = await axios.get(url);
  return res.data.data;
}

function mapPlantData(apiData: any) {
  return {
    name: apiData.common_name || apiData.scientific_name,
    image: apiData.default_image?.medium_url || "",
    waterReq: apiData.soil_water || "",
    nutrients: apiData.soil_nutrients || "",
    pH: apiData.soil_ph ? Number(apiData.soil_ph) : undefined,
    spacing: apiData.spacing ? Number(apiData.spacing) : undefined,
    companions: apiData.companion_planting || [],
    enemies: [],
    diseases: apiData.disease || [],
    pests: apiData.pests || [],
    daysToHarvest: apiData.growth?.days_to_harvest || undefined,
    harvestAvg: apiData.growth?.harvest_avg || undefined,
    perennial: apiData.cycle?.toLowerCase() === "perennial",
    annual: apiData.cycle?.toLowerCase() === "annual",
    frostZone: apiData.hardiness ? apiData.hardiness.join(", ") : "",
    idealTemp: apiData.temperature?.ideal || undefined,
    comments: apiData.comments || "",
  };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function seedPlants(force = false) {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  if (force) {
    console.log("Force re-seeding plants...");
    await Plant.deleteMany({});
    await Plant.insertMany(DEFAULT_PLANTS);
    await SeedProgress.deleteOne({ name: "perenualPlants" });
  }

  let progress = await SeedProgress.findOne({ name: "perenualPlants" });
  if (!progress) {
    progress = await SeedProgress.create({ name: "perenualPlants", lastPage: 1, lastPlantIndex: 0 });
  }

  let page = progress.lastPage;
  let processedToday = 0;

  while (processedToday < DAILY_LIMIT) {
    const plants = await fetchPlantList(page);
    if (!plants || plants.length === 0) break;
    console.log(`Fetched page ${page} with ${plants.length} plants`);

    for (let i = progress.lastPlantIndex; i < plants.length; i += CONCURRENCY) {
      const batch = plants.slice(i, i + CONCURRENCY);

      const results = await Promise.allSettled(batch.map((p: any) => fetchPlantDetails(p.id)));

      for (let j = 0; j < results.length; j++) {
        if (processedToday >= DAILY_LIMIT) break;

        const result = results[j];
        if (result.status === "fulfilled") {
          const mappedPlant = mapPlantData(result.value);
          await Plant.updateOne({ name: mappedPlant.name }, mappedPlant, { upsert: true });
          console.log(`✅ Seeded ${mappedPlant.name}`);
        } else {
          console.warn("⚠️ Failed to fetch a plant:", result.reason);
        }

        processedToday++;
        progress.lastPage = page;
        progress.lastPlantIndex = i + j + 1;
        await progress.save();
      }

      if (processedToday >= DAILY_LIMIT) break;
      await delay(BATCH_DELAY);
    }

    if (processedToday >= DAILY_LIMIT) break;

    progress.lastPlantIndex = 0;
    await progress.save();
    page++;
  }

  console.log(`🎉 Seeded ${processedToday} plants today. Progress saved.`);
  mongoose.disconnect();
}

// Run the script with optional "--force"
const forceFlag = process.argv.includes("--force");
seedPlants(forceFlag);
