import { Profile } from "../models/index.js";
import { signToken, AuthenticationError, UserExistsError } from "../utils/auth.js";
import { IResolvers } from "@graphql-tools/utils";
import { AuthRequest } from "../utils/auth";
import { Bed } from "../models/Bed.js";
import Plant from "../models/Plant.js";
import mongoose from "mongoose";
import Sun from "../models/Sun.js";
import fetch from "node-fetch";

const resolvers: IResolvers = {
  Query: {
    me: async (_, __, context: { req: AuthRequest }) => {
      if (!context.req.user) throw new AuthenticationError("Not authenticated");
      return await Profile.findById(context.req.user._id).populate("savedPlots");
    },

    beds: async () => {
      const beds = await Bed.find().populate({
        path: "plants.basePlant",
        select: "_id name image waterReq spacing",
      });

      return beds.map(bed => ({
        ...bed.toObject(),
        plantInstances: bed.plants.map(p => ({
          _id: p._id,
          x: p.x ?? 0,
          y: p.y ?? 0,
          basePlant: p.basePlant,
        })),
        x: bed.x ?? 0,
        y: bed.y ?? 0,
      }));
    },

    plants: async () => {
      const plants = await Plant.find();
      console.log("Fetched plants:", plants);
      return plants;
    },

    getSunData: async (_: any, { latitude, longitude }: { latitude: number; longitude: number }) => {
      const today = new Date().toISOString().split("T")[0];

      // Try to find cached data
      let sunData = await Sun.findOne({
        "location.latitude": latitude,
        "location.longitude": longitude,
        date: { $gte: new Date(today) },
      });

      if (!sunData) {
        try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=sunrise,sunset,solar_noon,daylight_duration&timezone=auto`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Open-Meteo request failed: ${response.statusText}`);

        const data = await response.json();
        if (!data.daily?.time?.length || !data.hourly?.time?.length)
          throw new Error("No solar data returned from API");

        const now = new Date();
      const times = data.hourly.time.map((t: string) => new Date(t));
      let closestIndex = 0;
      let minDiff = Infinity;
      times.forEach((time: Date, i: number) => {
        const diff = Math.abs(time.getTime() - now.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      });

      const solarElevation = data.hourly.solar_elevation_angle[closestIndex];
      const solarAzimuth = data.hourly.solar_azimuth_angle[closestIndex];

        sunData = new Sun({
          location: { latitude, longitude },
          date: new Date(data.daily.time[0]),
          sunrise: new Date(data.daily.sunrise[0]),
          sunset: new Date(data.daily.sunset[0]),
          solarNoon: new Date(data.daily.solar_noon[0]),
          daylightDuration: data.daily.daylight_duration[0],
          solarElevation,
          solarAzimuth,
          updatedAt: new Date(),
        });

        await sunData.save();
        } catch (err) {
        console.error("Failed to fetch sun data:", err);
        throw new Error("Unable to retrieve solar data at this time");
      }
    } else {
      // Optionally refresh solar angles each time you query
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=solar_elevation_angle,solar_azimuth_angle&timezone=auto`;
        const response = await fetch(url);
        const data = await response.json();

        const now = new Date();
        const times = data.hourly.time.map((t: string) => new Date(t));
        let closestIndex = 0;
        let minDiff = Infinity;
        times.forEach((time: Date, i: number) => {
          const diff = Math.abs(time.getTime() - now.getTime());
          if (diff < minDiff) {
            minDiff = diff;
            closestIndex = i;
          }
        });

        sunData.solarElevation = data.hourly.solar_elevation_angle[closestIndex];
        sunData.solarAzimuth = data.hourly.solar_azimuth_angle[closestIndex];
        sunData.updatedAt = new Date();
        await sunData.save();
      } catch (err) {
        console.warn("Failed to refresh real-time solar angles:", err);
        }
      }
      
      return sunData;
    },
  },

  Mutation: {
    login: async (_, { email, password }) => {
      const profile = await Profile.findOne({ email });
      if (!profile || !(await profile.isCorrectPassword(password))) {
        throw new AuthenticationError("Incorrect credentials");
      }
      const token = signToken({
        _id: profile._id,
        email: profile.email,
        username: profile.username,
      });
      return { token, profile };
    },

    register: async (_, { input }) => {
      const { username, email, password } = input;
      const existingProfile = await Profile.findOne({ email });
      if (existingProfile) throw new UserExistsError("A profile with this email already exists.");

      const profile = await Profile.create({ username, email, password });
      const token = signToken({
        _id: profile._id,
        email: profile.email,
        username: profile.username,
      });
      return { token, profile };
    },

    createBed: async (_, { width, length }) => {
      const bed = await Bed.create({ width, length, plants: [] });
      const populated = await bed.populate({
        path: "plants.basePlant",
        select: "_id name image waterReq spacing",
      });

      return {
        ...populated.toObject(),
        plantInstances: populated.plants.map(p => ({
          _id: p._id,
          basePlant: p.basePlant,
          x: p.x ?? 0,
          y: p.y ?? 0,
        })),
        x: populated.x ?? 0,
        y: populated.y ?? 0,
      };
    },

    moveBed: async (_, { bedId, position }) => {
      const { x, y } = position;

      const updatedBed = await Bed.findByIdAndUpdate(
        bedId,
        { x, y },
        { new: true }
      ).populate({
        path: "plants.basePlant",
        select: "_id name image waterReq spacing",
      });

      if (!updatedBed) throw new Error("Bed not found");

      return {
        ...updatedBed.toObject(),
        plantInstances: updatedBed.plants.map(p => ({
          _id: p._id,
          basePlant: p.basePlant,
          x: p.x ?? 0,
          y: p.y ?? 0,
        })),
        x: updatedBed.x ?? 0,
        y: updatedBed.y ?? 0,
      };
    },

    movePlantInBed: async (_, { bedId, position }) => {
      const { plantInstanceId, x, y } = position;
      const bed = await Bed.findById(bedId);
      if (!bed) throw new Error("Bed not found");

      const plant = bed.plants.id(plantInstanceId);
      if (!plant) throw new Error("Plant instance not found");

      plant.x = x;
      plant.y = y;
      await bed.save();

      const populated = await bed.populate({
        path: "plants.basePlant",
        select: "_id name image waterReq spacing",
      });

      return {
        ...populated.toObject(),
        plantInstances: populated.plants.map(p => ({
          _id: p._id,
          basePlant: p.basePlant,
          x: p.x ?? 0,
          y: p.y ?? 0,
        })),
      };
    },

    addPlantsToBed: async ( _, 
      { bedId, basePlantIds, positions }: { bedId: string; basePlantIds: string[]; positions: { x: number; y: number }[] }
    ) => {
  const bed = await Bed.findById(bedId);
  if (!bed) throw new Error("Bed not found");

  basePlantIds.forEach((basePlantId, index) => {
      const pos = positions[index] || { x: 0, y: 0 };
      bed.plants.push({ basePlant: basePlantId, x: pos.x, y: pos.y, });
  });

  await bed.save();

  const populated = await bed.populate({
    path: "plants.basePlant",
    select: "_id name image waterReq spacing",
  });

  return {
    _id: bed._id.toString(),
    width: bed.width,
    length: bed.length,
    plantInstances: populated.plants.map(p => ({
      _id: p._id.toString(),
      x: p.x ?? 0,
      y: p.y ?? 0,
      basePlant: p.basePlant ? {
        _id: (p.basePlant as any)._id.toString(),
        name: (p.basePlant as any).name,
        image: (p.basePlant as any).image,
        waterReq: (p.basePlant as any).waterReq,
        spacing: (p.basePlant as any).spacing,
      } : null,
    })),
  };
},


    removePlantsFromBed: async (_, { bedId, plantInstanceIds }: { bedId: string; plantInstanceIds: string[] }) => {
      const objectIds = plantInstanceIds.map(id => new mongoose.Types.ObjectId(id));

      const updatedBed = await Bed.findByIdAndUpdate(
        bedId,
        { $pull: { plants: { _id: { $in: objectIds } } } },
        { new: true }
      ).populate({
        path: "plants.basePlant",
        select: "_id name image waterReq spacing",
      });

      if (!updatedBed) throw new Error("Bed not found");

      return {
        ...updatedBed.toObject(),
        plantInstances: updatedBed.plants.map(p => ({
          _id: p._id,
          basePlant: p.basePlant,
          x: p.x ?? 0,
          y: p.y ?? 0,
        })),
      };
    },

    removeBed: async (_, { bedId }) => {
      const bed = await Bed.findById(bedId);
      if (!bed) throw new Error("Bed not found");

      await Bed.findByIdAndDelete(bedId);
      return {
        ...bed.toObject(),
        plantInstances: bed.plants.map(p => ({
          _id: p._id,
          basePlant: p.basePlant,
          x: p.x ?? 0,
          y: p.y ?? 0,
        })),
      };
    },

    clearBeds: async () => {
      await Bed.deleteMany({});
      return [];
    },
  },
};

export default resolvers;
