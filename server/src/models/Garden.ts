import mongoose, { Schema, model } from "mongoose";

const gardenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  beds: [{ type: Schema.Types.ObjectId, ref: "Bed" }],
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  orientation: { type: Number, default: 0 }, // degrees clockwise from North
});