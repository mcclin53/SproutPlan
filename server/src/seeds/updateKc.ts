// server/src/seeds/updateKc.ts
import "dotenv/config";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import Plant from "../models/Plant.js";

type KcProfile = { initial: number; mid: number; late: number };
type KcRow = { name: string; kcProfile: KcProfile };

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/SproutPlan";
const kcPath = path.resolve(__dirname, "../../src/seeds/kc_seed.json");

function normalizeName(s: string) {
  return s.trim().toLowerCase().replace(/\(.*?\)/g, "").replace(/\s+/g, " ");
}

async function main() {
  if (!fs.existsSync(kcPath)) {
    console.error(`kc_seed.json not found at ${kcPath}`);
    process.exit(1);
  }
  const raw: KcRow[] = JSON.parse(fs.readFileSync(kcPath, "utf-8"));
  const map = new Map<string, KcProfile>();
  for (const r of raw) map.set(normalizeName(r.name), r.kcProfile);
  // aliases
  const alias: Record<string,string> = {
    "pepper": "pepper (bell/chili)",
    "grape": "grape (table/wine)",
    "sweet corn": "corn (sweet)",
    "corn": "corn (sweet)",
  };
  for (const [a, t] of Object.entries(alias)) {
    const prof = map.get(normalizeName(t));
    if (prof) map.set(normalizeName(a), prof);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected:", MONGO_URI);

  const plants = await Plant.find({}, { _id: 1, name: 1 }).lean();
  let updated = 0;

  for (const p of plants) {
    const prof = map.get(normalizeName(p.name));
    if (!prof) continue;

    await Plant.updateOne(
  { _id: p._id },
  {
    $set: {
      kcInitial: prof.initial,
      kcMid: prof.mid,
      kcLate: prof.late,
    },
  }
);
    console.log(`✔ ${p.name} -> Kc set ${prof.initial}/${prof.mid}/${prof.late}`);
    updated++;
  }

  console.log(`Done. Updated ${updated} plants with Kc.`);
  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
