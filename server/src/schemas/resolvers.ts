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
import PlantGrowthSnapshot from "../models/PlantGrowthSnapshot.js";

const MODEL_VERSION = "growth-v2-size-per-day";

const resolvers: IResolvers = {
  Query: {
    me: async (_, __, context: { req: AuthRequest }) => {
      if (!context.req.user) throw new AuthenticationError("Not authenticated");
      return await Profile.findById(context.req.user._id).populate("savedPlots");
    },

    beds: async () => {
      const beds = await Bed.find().populate({
        path: "plants.basePlant",
        select: "_id name image waterReq spacing sunReq baseGrowthRate maxHeight maxCanopyRadius",
      });

      return beds.map(bed => ({
        ...bed.toObject(),
        plantInstances: bed.plants.map(p => ({
          _id: p._id,
          x: p.x ?? 0,
          y: p.y ?? 0,
          height: p.height ?? 0,
          canopyRadius: p.canopyRadius ?? 0,
          lastSimulatedAt: p.lastSimulatedAt || null,
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

    growthSnapshots: async (_: any, { plantInstanceId, from, to }: { plantInstanceId: string; from?: string; to?: string }) => {
      const q: any = { plantInstanceId };
      if (from || to) {
        q.day = {};
        if (from) q.day.$gte = new Date(from);
        if (to)   q.day.$lte = new Date(to);
      }
      return PlantGrowthSnapshot.find(q).sort({ day: 1 });
    },

    getSunData: async (_: any, { latitude, longitude, date }: { latitude: number; longitude: number; date?: string }) => {
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
        select: "_id name image waterReq spacing sunReq baseGrowthRate maxHeight maxCanopyRadius",
      });

      return {
        ...populated.toObject(),
        plantInstances: populated.plants.map(p => ({
          _id: p._id,
          basePlant: p.basePlant,
          x: p.x ?? 0,
          y: p.y ?? 0,
          height: p.height ?? 0,
          canopyRadius: p.canopyRadius ?? 0,
          lastSimulatedAt: p.lastSimulatedAt || null,
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
        select: "_id name image waterReq spacing sunReq baseGrowthRate maxHeight maxCanopyRadius",
      });

      if (!updatedBed) throw new Error("Bed not found");

      return {
        ...updatedBed.toObject(),
        plantInstances: updatedBed.plants.map(p => ({
          _id: p._id,
          basePlant: p.basePlant,
          x: p.x ?? 0,
          y: p.y ?? 0,
          height: p.height ?? 0,
          canopyRadius: p.canopyRadius ?? 0,
          lastSimulatedAt: p.lastSimulatedAt || null,
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
        select: "_id name image waterReq spacing sunReq baseGrowthRate maxHeight maxCanopyRadius",
      });

      return {
        ...populated.toObject(),
        plantInstances: populated.plants.map(p => ({
          _id: p._id,
          basePlant: p.basePlant,
          x: p.x ?? 0,
          y: p.y ?? 0,
          height: p.height ?? 0,
          canopyRadius: p.canopyRadius ?? 0,
          lastSimulatedAt: p.lastSimulatedAt || null,
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
        bed.plants.push({ basePlant: basePlantId, x: pos.x, y: pos.y, height: 0, canopyRadius: 0, lastSimulatedAt: null, } as any);
    });

  await bed.save();

  const populated = await bed.populate({
    path: "plants.basePlant",
    select: "_id name image waterReq spacing sunReq baseGrowthRate maxHeight maxCanopyRadius",
  });

  return {
    _id: bed._id.toString(),
    width: bed.width,
    length: bed.length,
    plantInstances: populated.plants.map(p => ({
      _id: p._id.toString(),
      x: p.x ?? 0,
      y: p.y ?? 0,
      height: p.height ?? 0,
      canopyRadius: p.canopyRadius ?? 0,
      lastSimulatedAt: p.lastSimulatedAt || null,
      basePlant: p.basePlant ? {
        _id: (p.basePlant as any)._id.toString(),
        name: (p.basePlant as any).name,
        image: (p.basePlant as any).image,
        waterReq: (p.basePlant as any).waterReq,
        spacing: (p.basePlant as any).spacing,
        sunReq: (p.basePlant as any).sunReq,
        baseGrowthRate: (p.basePlant as any).baseGrowthRate,
        maxHeight: (p.basePlant as any).maxHeight,
        maxCanopyRadius: (p.basePlant as any).maxCanopyRadius,
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

    applyMidnightGrowth: async (
        _,
        {
          bedId,
          plantInstanceId,
          day,
          sunlightHours,
          shadedHours = 0,
          modelVersion = MODEL_VERSION,
          inputs,
        }: {
          bedId: string;
          plantInstanceId: string;
          day: string;             // ISO date/time (we’ll new Date it)
          sunlightHours: number;
          shadedHours?: number;
          modelVersion?: string;
          inputs?: any;
        }
      ) => {
        // 1) Load bed + plant with base caps/knobs
        const bed = await Bed.findById(bedId).populate({
          path: "plants.basePlant",
          select: "_id name sunReq baseGrowthRate maxHeight maxCanopyRadius",
        });
        if (!bed) throw new Error("Bed not found");

        const plant: any = bed.plants.id(plantInstanceId);
        if (!plant) throw new Error("Plant instance not found");

        const base: any = plant.basePlant;
        if (!base) throw new Error("BasePlant missing");

        // 2) Normalize day once
        const dayDate = new Date(day);

        // 3) Caps (Infinity fallback if not set)
        const capH =
          typeof base.maxHeight === "number" && Number.isFinite(base.maxHeight)
            ? base.maxHeight
            : Number.POSITIVE_INFINITY;

        const capC =
          typeof base.maxCanopyRadius === "number" && Number.isFinite(base.maxCanopyRadius)
            ? base.maxCanopyRadius
            : Number.POSITIVE_INFINITY;

        // 4) Ensure current values exist & pre-clamp
        plant.height = Math.min(capH, typeof plant.height === "number" ? plant.height : 0);
        plant.canopyRadius = Math.min(capC, typeof plant.canopyRadius === "number" ? plant.canopyRadius : 0);

        // 5) Compute one-day growth (size units/day scaled by efficiency)
        const sunReq = typeof base.sunReq === "number" ? base.sunReq : 8;
        const eff = sunReq > 0 ? Math.min(1, sunlightHours / sunReq) : 0;
        const baseHeightRate = typeof base.baseGrowthRate === "number" ? base.baseGrowthRate : 1;

        const derivedCanopyRate =
          Number.isFinite(capH) && capH > 0 && Number.isFinite(capC)
            ? baseHeightRate * (capC / capH)
            : baseHeightRate;

        // 6) Apply + clamp
        const newH = Math.min(capH, plant.height + baseHeightRate * eff);
        const newC = Math.min(capC, plant.canopyRadius + derivedCanopyRate * eff);

        plant.height = newH;
        plant.canopyRadius = newC;
        plant.lastSimulatedAt = dayDate;

        // 7) Save bed (single-doc write; no transaction)
        await bed.save();

        // 8) Upsert daily snapshot (idempotent via unique index)
        const snapshot = await PlantGrowthSnapshot.findOneAndUpdate(
          { bedId, plantInstanceId, day: dayDate },
          {
            $set: {
              sunlightHours,
              shadedHours,
              height: newH,
              canopyRadius: newC,
              modelVersion,
              inputs: inputs ?? {
                sunReq,
                baseGrowthRate: baseHeightRate,
                derivedCanopyRate,
                capH: Number.isFinite(capH) ? capH : null,
                capC: Number.isFinite(capC) ? capC : null,
              },
            },
          },
          { new: true, upsert: true }
        );

        return snapshot;
      },
    },
  };

export default resolvers;
