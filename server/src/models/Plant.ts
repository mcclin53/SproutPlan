import mongoose from "mongoose";

const plantSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  image: {type: String },
  height: { type: Number, default: 30 },
  width: { type: Number, default: 30 },
  depth: { type: Number, default: 30 },
  sunReq: { type: Number, required: true },
  waterReq: { type: String},
  nutrients:{ type: String},
  pH: { type: Number},
  spacing: { type: Number},
  companions: { type: [String]},
  enemies: { type: [String]},
  diseases: { type: [String]},
  pests: {type: [String]},
  daysToHarvest: { type: Number},
  harvestAvg: { type: Number},
  perennial: { type: Boolean },
  annual: { type: Boolean},
  frostZone: { type: String},
  idealTemp: { type: Number},
  comments: {type: String}
});

export default mongoose.model("Plant", plantSchema);