import { Profile } from "../models/index.js";
import { signToken, AuthenticationError, UserExistsError } from "../utils/auth.js";
import { IResolvers } from "@graphql-tools/utils";
import { AuthRequest } from "../utils/auth";
import { Bed } from "../models/Bed.js";
import Plant from "../models/Plant.js";
import mongoose from "mongoose";
import Sun from "../models/Sun.js";
import SunCalc from "suncalc"
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

    getSunData: async (_: any, { latitude, longitude, date }: { latitude: number; longitude: number; date? string }) => {
      const queryDate = date ? new Date(date) : new Date();
      const dateOnly = new Date(queryDate.toISOString().split("T")[0]);

      // Try to find cached data
      let sunData = await Sun.findOne({
        "location.latitude": latitude,
        "location.longitude": longitude,
        date: dateOnly,
      });

      if (!sunData) {
        const times = SunCalc.getTimes(dateOnly, latitude, longitude);
        const position = SunCalc.getPosition(dateOnly, latitude, longitude);

        const solarElevation = (position.altitude * 180) / Math.PI; // radians → degrees
        const solarAzimuth = (position.azimuth * 180) / Math.PI;

        const daylightDuration =
          (times.sunset.getTime() - times.sunrise.getTime()) / 1000; // seconds

        sunData = new Sun({
          location: { latitude, longitude },
          date: dateOnly,
          sunrise: times.sunrise,
          sunset: times.sunset,
          solarNoon: times.solarNoon,
          daylightDuration,
          solarElevation,
          solarAzimuth,
          updatedAt: new Date(),
        });

        await sunData.save();
      } else {
        // Optionally refresh current solar angles for real-time updates
        const position = SunCalc.getPosition(dateOnly, latitude, longitude);
        sunData.solarElevation = (position.altitude * 180) / Math.PI;
        sunData.solarAzimuth = (position.azimuth * 180) / Math.PI;
        sunData.updatedAt = new Date();
        await sunData.save();
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
