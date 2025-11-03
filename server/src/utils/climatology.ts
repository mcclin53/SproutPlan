// server/utils/climatology.ts
import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/sproutplan";
const DB_NAME = "sproutplan";
const COLL = "climatology";

function toDOY(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d.getTime() - start.getTime()) / 86400000) + 1;
}

// Simple wrap: map leap DOY 60 → 59 (Feb 28)
function normalizeDOYForNormals(date: Date): number {
  const doy = toDOY(date);
  const y = date.getFullYear();
  const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return isLeap && doy === 60 ? 59 : doy;
}

export type NormalHour = {
  hour: number; // 0..23
  values: Record<string, number>; // variable -> mean
};

export async function getNormalsForDate(
  lat: number,
  lon: number,
  date: Date,
  variables: string[] // e.g., ["temperature_2m","precipitation",...]
): Promise<NormalHour[]> {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const latRounded = Math.round(lat * 1000) / 1000;
  const lonRounded = Math.round(lon * 1000) / 1000;
  const doc = await db.collection(COLL).findOne({ latRounded, lonRounded });
  await client.close();

  if (!doc) throw new Error("Climatology not found. Run buildClimatology first.");

  const doy = normalizeDOYForNormals(date);
  const day = doc.normals?.[doy];
  if (!day) throw new Error(`No normals for DOY=${doy}`);

  const rows: NormalHour[] = [];
  for (let h = 0; h < 24; h++) {
    const values: Record<string, number> = {};
    for (const v of variables) {
      values[v] = day[v]?.[h] ?? NaN;
    }
    rows.push({ hour: h, values });
  }
  return rows;
}
