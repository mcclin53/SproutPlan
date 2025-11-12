// server/scripts/maintenance.ts
// ESM-compatible maintenance script for one-off DB updates/backfills.

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import db from "../config/connection.js";
import { default as Profile } from "../models/Profile.js";
import { default as Plant } from "../models/Plant.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

type Flags = {
  backfillAll?: boolean;
  profilesRole?: boolean;
  plantsStressDefaults?: boolean;
  promoteAdminEmail?: string | null;
  dryRun?: boolean;
};

function parseFlags(argv: string[]): Flags {
  const f: Flags = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--backfill-all") f.backfillAll = true;
    else if (a === "--profiles-role") f.profilesRole = true;
    else if (a === "--plants-stress-defaults") f.plantsStressDefaults = true;
    else if (a === "--dry-run") f.dryRun = true;
    else if (a === "--promote-admin" && argv[i + 1]) {
      f.promoteAdminEmail = argv[++i];
    } else {
      console.warn(`Unknown arg: ${a}`);
    }
  }
  return f;
}

async function backfillProfilesRole(dryRun = false) {
  // Sets role: "user" where missing
  const filter = { role: { $exists: false } };
  const update = { $set: { role: "user" } };
  if (dryRun) {
    const count = await Profile.countDocuments(filter);
    console.log(`[DRY] Profiles needing role: ${count}`);
    return;
  }
  const res = await Profile.updateMany(filter, update);
  console.log(`✓ Backfilled profiles.role → "user": matched=${res.matchedCount ?? res.matched}, modified=${res.modifiedCount ?? res.modified}`);
}

async function promoteAdmin(email: string, dryRun = false) {
  if (!email) {
    console.log("No email provided for --promote-admin");
    return;
  }
  const filter = { email };
  const update = { $set: { role: "admin" } };
  if (dryRun) {
    const doc = await Profile.findOne(filter).lean();
    console.log(`[DRY] Would promote: ${doc?._id ?? "NOT FOUND"} (${email})`);
    return;
  }
  const res = await Profile.updateOne(filter, update);
  if (res.matchedCount ?? res.matched) {
    console.log(`✓ Promoted ${email} to admin`);
  } else {
    console.log(`✗ No profile found for ${email}`);
  }
}

async function backfillPlantsStressDefaults(dryRun = false) {
  // Add defaults for new stress fields where missing.
  // 1) graceHours + sunGraceDays
  const filter1 = {
    $or: [
      { graceHours: { $exists: false } },
      { sunGraceDays: { $exists: false } },
    ],
  };
  const update1 = {
    $set: {
      "graceHours.cold": 0,
      "graceHours.heat": 2,
      "graceHours.dry": 12,
      "graceHours.wet": 12,
      sunGraceDays: 2,
    },
  };

  // 2) (Optional) set numeric thresholds if entirely missing (leave existing values alone)
  const filter2 = {
    $or: [
      { tempMin: { $exists: false } },
      { tempMax: { $exists: false } },
      { waterMin: { $exists: false } },
      { waterMax: { $exists: false } },
    ],
  };
  const update2 = {
    $setOnInsert: {}, // not used here, but placeholder if you switch to upserts
    $set: {
      tempMin: 5,
      tempMax: 32,
      waterMin: 10,
      waterMax: 50,
    },
  };

  if (dryRun) {
    const c1 = await Plant.countDocuments(filter1);
    const c2 = await Plant.countDocuments(filter2);
    console.log(`[DRY] Plants needing grace/sun defaults: ${c1}`);
    console.log(`[DRY] Plants missing numeric stress fields: ${c2}`);
    return;
  }

  const res1 = await Plant.updateMany(filter1, update1);
  console.log(
    `✓ Backfilled graceHours/sunGraceDays: matched=${res1.matchedCount ?? res1.matched}, modified=${res1.modifiedCount ?? res1.modified}`
  );

  const res2 = await Plant.updateMany(filter2, update2);
  console.log(
    `✓ Backfilled tempMin/Max & waterMin/Max (where missing): matched=${res2.matchedCount ?? res2.matched}, modified=${res2.modifiedCount ?? res2.modified}`
  );
}

async function main() {
  const flags = parseFlags(process.argv);
  if (
    !flags.backfillAll &&
    !flags.profilesRole &&
    !flags.plantsStressDefaults &&
    !flags.promoteAdminEmail
  ) {
    console.log(`
Usage:
  npx ts-node server/scripts/maintenance.ts [flags]

Flags:
  --backfill-all                 Run all backfills (profiles role + plants stress defaults)
  --profiles-role                Backfill Profile.role where missing → "user"
  --plants-stress-defaults       Backfill Plant.graceHours/sunGraceDays and missing temp/water fields
  --promote-admin <email>        Promote a profile to admin by email
  --dry-run                      Show counts/intent but do not write

Examples:
  npx ts-node server/scripts/maintenance.ts --profiles-role
  npx ts-node server/scripts/maintenance.ts --plants-stress-defaults
  npx ts-node server/scripts/maintenance.ts --promote-admin you@example.com
  npx ts-node server/scripts/maintenance.ts --backfill-all
  npx ts-node server/scripts/maintenance.ts --backfill-all --dry-run
`);
    return;
  }

  await db(); // your existing connection helper

  try {
    if (flags.backfillAll || flags.profilesRole) {
      await backfillProfilesRole(flags.dryRun);
    }
    if (flags.backfillAll || flags.plantsStressDefaults) {
      await backfillPlantsStressDefaults(flags.dryRun);
    }
    if (flags.promoteAdminEmail) {
      await promoteAdmin(flags.promoteAdminEmail, flags.dryRun);
    }
  } finally {
    // Close Mongoose so Node exits
    await mongoose.connection.close();
  }
}

main().catch((err) => {
  console.error("❌ Maintenance failed:", err);
  process.exit(1);
});
