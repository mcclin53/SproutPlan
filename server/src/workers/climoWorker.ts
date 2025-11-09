import { Worker, Job } from "bullmq";
import { buildClimatology } from "../scripts/buildClimatology.js";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { snapTile, tileKey, TILE_STEP } from "../utils/tiling.js";

dotenv.config();

// Redis connection
const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
};

const QUEUE_NAME = "climo-builds";
const CONCURRENCY = Number(process.env.CLIMO_WORKER_CONCURRENCY) || 2;

type ClimoJobData = {
  lat: number;        // raw or rounded (resolver should enqueue rounded)
  lon: number;        // raw or rounded
  key?: string;       // optional tile key from enqueuer
};

async function markProfilesReady(lat: number, lon: number) {
  const uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/SproutPlan";

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  // Use shared tiling everywhere
  const { latRounded, lonRounded } = snapTile(lat, lon, TILE_STEP);
  const key = tileKey(lat, lon, TILE_STEP);

  const res = await db.collection("profiles").updateMany(
    {
      $or: [
        { climoTileKey: key },
        { homeLat: latRounded, homeLon: lonRounded }, // back-compat
      ],
      climoStatus: { $ne: "ready" },
    },
    { $set: { climoStatus: "ready", climoTileKey: key } }
  );

  console.log(
    ` [climoWorker] markProfilesReady matched=${res.matchedCount} modified=${res.modifiedCount} for ${key}`
  );

  await client.close();
}

// Worker
const worker = new Worker<ClimoJobData>(
  QUEUE_NAME,
  async (job: Job<ClimoJobData>) => {
    // Pull data from the job
    const { lat, lon } = job.data;

    // Normalize/snap + derive canonical key
    const { latRounded, lonRounded } = snapTile(lat, lon, TILE_STEP);
    const key = tileKey(lat, lon, TILE_STEP);

    const jobId = key; // consistent with enqueue jobId
    const start = Date.now();

    console.log(` [climoWorker] Starting build for ${key}...`);

    try {
      // Build & persist using snapped values
      await buildClimatology(latRounded, lonRounded, { persist: true });

      // Mark profiles ready for this tile
      await markProfilesReady(latRounded, lonRounded);

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        ` [climoWorker] Finished climatology for ${jobId} in ${elapsed}s`
      );
    } catch (err) {
      console.error(
        ` [climoWorker] Failed building climatology for ${jobId}:`,
        err
      );
      // rethrow -> BullMQ will retry using backoffStrategy
      throw err;
    }
  },
  {
    concurrency: CONCURRENCY,
    connection,
    settings: {
      // BullMQ v5: single backoffStrategy function
      backoffStrategy: (attemptsMade) => Math.pow(2, attemptsMade) * 1000,
    },
  }
);

// Observation
worker.on("ready", () => {
  console.log(
    ` [climoWorker] Listening for jobs on queue "${QUEUE_NAME}" (concurrency: ${CONCURRENCY})`
  );
});

worker.on("completed", (job) => {
  console.log(` [climoWorker] Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(` [climoWorker] Job failed (${job?.id}): ${err.message}`);
});

worker.on("error", (err) => {
  console.error(" [climoWorker] Worker encountered an error:", err);
});

// Shutdown
process.on("SIGINT", async () => {
  console.log("\n [climoWorker] Shutting down...");
  await worker.close();
  process.exit(0);
});
