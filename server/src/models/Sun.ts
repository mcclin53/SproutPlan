import mongoose, { Schema, model } from "mongoose";

const sunSchema = new Schema({
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  date: { type: Date, default: Date.now },
  sunrise: { type: Date },
  sunset: { type: Date },
  solarNoon: { type: Date },
  daylightDuration: { type: Number }, // in seconds
  solarElevation: { type: Number }, // degrees
  solarAzimuth: { type: Number }, // degrees
  updatedAt: { type: Date, default: Date.now },
});

export default model("Sun", sunSchema);
