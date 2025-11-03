import { Worker, Job } from "bullmq";
import { buildClimatology } from "../scripts/buildClimatology";
import dotenv from "dotenv";

// Load env vars
dotenv.config();

//  Redis connection config 
const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
};

//  Job name constant
const QUEUE_NAME = "climo-builds";

//  configure concurrency 
const CONCURRENCY = Number(process.env.CLIMO_WORKER_CONCURRENCY) || 2;

//  Creates the worker 
const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const { lat, lon } = job.data as { lat: number; lon: number };

    const jobId = `${lat},${lon}`;
    const start = Date.now();

    console.log(` [climoWorker] Starting build for ${jobId}...`);

    try {
      await buildClimatology(lat, lon, { persist: true });

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(` [climoWorker] Finished climatology for ${jobId} in ${elapsed}s`);
    } catch (err) {
      console.error(` [climoWorker] Failed building climatology for ${jobId}:`, err);
      // Rethrow so BullMQ will retry if retries are configured
      throw err;
    }
  },
  {
    concurrency: CONCURRENCY,
    connection,
    // backoff / retry settings
    settings: {
      backoffStrategies: {
        exponential: (attemptsMade) => Math.pow(2, attemptsMade) * 1000, // exponential backoff
      },
    },
  }
);

//  Event logging for observability 
worker.on("ready", () => {
  console.log(` [climoWorker] Listening for jobs on queue "${QUEUE_NAME}" (concurrency: ${CONCURRENCY})`);
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

// shutdown 
process.on("SIGINT", async () => {
  console.log("\n [climoWorker] Shutting down...");
  await worker.close();
  process.exit(0);
});
