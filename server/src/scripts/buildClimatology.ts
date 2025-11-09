import { MongoClient } from "mongodb";
import { addDays, subDays } from "date-fns";
import { pathToFileURL } from "url";
import { snapTile, TILE_STEP } from "../utils/tiling.js";

const BASE = "https://historical-forecast-api.open-meteo.com/v1/forecast";
const START_DATE = "2022-01-01";
const END_DATE = formatISO(subDays(new Date(), 3), { // stop retrieving 3 days before to avoid incomplete data
  representation: "date",
});
const TIMEZONE = "auto";

const HOURLY_VARS = [
  "temperature_2m",
  "relativehumidity_2m",
  "shortwave_radiation",
  "precipitation",
  "windspeed_10m",
] as const;
type HourlyVar = typeof HOURLY_VARS[number];

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/SproutPlan";
const DB_NAME = "SproutPlan";
const COLL = "climatology"; // { latRounded, lonRounded, timezone, normals }

type ClimoBucket = {
  // 366 days
  [dayIndex: number]: {
    count: number;                    // number of years contributing
    hourly: Record<HourlyVar, number[]>; // length-24 arrays of sums
  };
};

type ClimatologyDoc = {
  latRounded: number;
  lonRounded: number;
  timezone: string;
  // dayIndex 1..365
  normals: {
    [dayIndex: number]: Record<HourlyVar, number[]>;
  };
  meta: {
    from: string;
    to: string;
    variables: HourlyVar[];
    years: number[]; // which years contributed
    builtAt: string;
  };
};
function formatISO(date: Date, opts?: { representation?: "date" }) {
  if (opts?.representation === "date") {
    return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
  }
  return date.toISOString(); // full ISO
}

function toDOY(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return diff + 1; // 1..365/366 if leap year
}
function isLeap(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

async function fetchChunk(lat: number, lon: number, start: string, end: string) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: start,
    end_date: end,
    hourly: HOURLY_VARS.join(","),
    timezone: TIMEZONE,
  });

  const url = `${BASE}?${params.toString()}`;
  console.log(`🔹 Fetching chunk: ${start} → ${end}  (${url})`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);

  const json = await res.json();
  console.log(`✅ Received ${json?.hourly?.time?.length ?? 0} hourly records`); 

  return json;
}

export async function buildClimatology(
  lat: number,
  lon: number,
  { chunkDays = 31, persist = true }: { chunkDays?: number; persist?: boolean } = {}
): Promise<ClimatologyDoc> {
  console.log(`🚀 Starting buildClimatology for ${lat}, ${lon}`);
  // Prepare empty buckets (1..366) with 24 zeros for each var
  const bucket: ClimoBucket = {} as any;
  for (let d = 1; d <= 366; d++) {
    bucket[d] = {
      count: 0,
      hourly: HOURLY_VARS.reduce((acc, v) => {
        acc[v] = new Array(24).fill(0);
        return acc;
      }, {} as Record<HourlyVar, number[]>),
    };
  }

  // Walk date range in chunks
  let cursor = new Date(START_DATE);
  const end = new Date(END_DATE);
  const contributingYears = new Set<number>();

  while (cursor <= end) {
    const chunkStart = new Date(cursor);
    const chunkEnd = addDays(cursor, chunkDays - 1);
    const chunkEndStr = formatISO(chunkEnd <= end ? chunkEnd : end, { representation: "date" });

  try {
    const j = await fetchChunk(lat, lon, formatISO(chunkStart, { representation: "date" }), chunkEndStr);
    const time = j?.hourly?.time as string[] | undefined;
    if (!time) {
      console.warn("⚠️ No time array found — skipping chunk.");
      // advance
      cursor = addDays(chunkEnd, 1);
      continue;
    }

    // Accumulate
    const arrays: Record<HourlyVar, number[]> = {} as any;
    for (const v of HOURLY_VARS) arrays[v] = j.hourly[v] ?? [];

    for (let i = 0; i < time.length; i++) {
      const t = new Date(time[i]);
      const year = t.getFullYear();
      contributingYears.add(year);

      // leap handling
      const doy = toDOY(t);
      const dayIndex = isLeap(year) && doy === 60 ? 59 : doy; // 59=Feb28 in non-leap DOY

      const hour = t.getHours();
      for (const v of HOURLY_VARS) {
        const val = arrays[v][i];
        if (Number.isFinite(val)) {
          bucket[dayIndex].hourly[v][hour] += val;
        }
      }
    }

    // increment counts for each full day observed in this chunk
    const seen = new Set<string>();
    for (const ts of time) {
      const d = new Date(ts);
      const key = `${d.getFullYear()}-${toDOY(d)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const doy = toDOY(d);
      const dayIndex = isLeap(d.getFullYear()) && doy === 60 ? 59 : doy;
      bucket[dayIndex].count += 1;
    }

    console.log(`📅 Processed chunk ${formatISO(chunkStart, { representation: "date" })} → ${chunkEndStr}`);
    } catch (err) {
      console.error(`❌ Failed chunk ${cursor.toISOString()}:`, err);
    }

    cursor = addDays(chunkEnd, 1);
  }

    console.log("📊 Computing daily averages...");

  // Convert sums → means
  const normals: ClimatologyDoc["normals"] = {};
  for (let d = 1; d <= 365; d++) { // 1..365 (folded 2/29 into 2/28)
    const b = bucket[d];
    if (!b || b.count === 0) continue;
    normals[d] = {} as any;
    for (const v of HOURLY_VARS) {
      normals[d][v] = b.hourly[v].map(sum => sum / b.count);
    }
  }

  const { latRounded, lonRounded } = snapTile(lat, lon, TILE_STEP);

  const doc: ClimatologyDoc = {
    latRounded,
    lonRounded,
    timezone: TIMEZONE,
    normals,
    meta: {
      from: START_DATE,
      to: END_DATE,
      variables: [...HOURLY_VARS],
      years: Array.from(contributingYears).sort(),
      builtAt: new Date().toISOString(),
    },
  };

  if (persist) {
    console.log("💾 Saving to MongoDB...");
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    await db.collection(COLL).createIndex({ latRounded: 1, lonRounded: 1 }, { unique: true });
    await db.collection(COLL).updateOne(
      { latRounded, lonRounded },
      { $set: doc },
      { upsert: true }
    );
    await client.close();
    console.log("✅ Saved climatology to DB");
  }

  console.log("🎉 Build complete:", {
    latRounded: doc.latRounded,
    lonRounded: doc.lonRounded,
    days: Object.keys(normals).length,
    years: doc.meta.years,
  });

  return doc;
}

const isDirectRun =
  typeof process !== "undefined" &&
  process.argv?.[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const lat = Number(process.argv[2]);
  const lon = Number(process.argv[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    console.error("Usage: ts-node src/scripts/buildClimatology.ts <lat> <lon>");
    process.exit(1);
  }
  buildClimatology(lat, lon).catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
}
