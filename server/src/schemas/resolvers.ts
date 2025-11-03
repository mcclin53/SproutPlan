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
import { MongoClient } from "mongodb";
import { Queue } from "bullmq";
import { getNormalsForDate } from "../utils/climatology.js";
import { snapCoord, snapTile } from "../utils/tiling.js";

const MODEL_VERSION = "growth-v2-size-per-day";
const MONGO_URI = process.env.MONGO_URI!;
const DB = "sproutplan";
const CLIMO_COLL = "climatology";
const CLIMO_QUEUE = new Queue("climo-builds", {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
});

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
          plantedAt: p.plantedAt || null,
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

    climoStatus: async (_: any, { lat, lon }: { lat: number; lon: number }) => {
      const { latRounded, lonRounded } = snapTile(lat, lon, 0.1);

      const client = new MongoClient(MONGO_URI);
      try {
        await client.connect();
        const doc = await client
          .db(DB)
          .collection(CLIMO_COLL)
          .findOne({ latRounded, lonRounded });

        return {
          ready: !!doc,
          latRounded,
          lonRounded,
          from: doc?.meta?.from ?? null,
          to: doc?.meta?.to ?? null,
          variables: doc?.meta?.variables ?? null,
        };
      } finally {
        await client.close();
      }
    },

    normalsForDate: async ( _: any, { lat, lon, isoDate, variables }: { lat: number; lon: number; isoDate: string; variables: string[] }
    ) => {
      const { latRounded, lonRounded } = snapTile(lat, lon, 0.1);

      try {
        const rows = await getNormalsForDate(latRounded, lonRounded, new Date(isoDate), variables);
        return rows.map((r) => ({
          hour: r.hour,
          temperature_2m: r.values["temperature_2m"],
          relativehumidity_2m: r.values["relativehumidity_2m"],
          shortwave_radiation: r.values["shortwave_radiation"],
          precipitation: r.values["precipitation"],
          windspeed_10m: r.values["windspeed_10m"],
        }));
      } catch (err) {
        throw new Error(
          "Climatology not ready for this location. Call setUserLocation first, then poll climoStatus until ready."
        );
      }
    },
  },
  Mutation: {
    login: async (_: any, { email, password }: {email: string; password: string}) => {
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

    register: async (_: any, { input }) => {
      const { username, email, password, homeLat, homeLon } = input;
      const existingProfile = await Profile.findOne({ email });
      if (existingProfile) throw new UserExistsError("A profile with this email already exists.");

      const profile = await Profile.create({ 
        username, 
        email, 
        password, 
        homeLat: homeLat ?? null,
        homeLon: homeLon ?? null,
        climoStatus: homeLat && homeLon ? "building" : "idle"
      });

      //if user provides location, enqueue auto build
      if (homeLat != null && homeLon != null) {
        const {latRounded, lonRounded }  = snapTile(homeLat, homeLon, 0.1);
        await CLIMO_QUEUE.add(
          "build",
          { lat: latRounded, lon: lonRounded },
          {
            jobId: `${latRounded},${lonRounded}`,
            removeOnComplete: true,
            attempts: 5,
            backoff: { type: "exponential", delay: 2000 },
          }
        );

        await Profile.updateOne(
          { _id: profile._id },
          { $set: { climoTileKey: `${latRounded},${lonRounded}` }}
        );
      }
      const token = signToken({
        _id: profile._id,
        email: profile.email,
        username: profile.username,
      });
      return { token, profile };
    },

    setUserLocation: async (_: any, { lat, lon }: {lat: number; lon: number }, ctx: any) => {
      //save to user
      if (!ctx.user?._id) throw new Error("Not authenticated");
      
      const { latRounded, lonRounded } = snapTile(lat, lon, 0.1);

      await Profile.updateOne(
        { _id: ctx.user._id },
        { $set: { homeLat: latRounded, homeLon: lonRounded, climoStatus: "building" } }
      );
        
      //enqueue a build for the snapped tile
      await CLIMO_QUEUE.add(
        "build",
        { lat: latRounded, lon: lonRounded },
        {
          jobId: `${latRounded},${lonRounded}`,
          removeOnComplete: true,
          attempts: 5,
          backoff: { type: "exponential", delay: 2000 },
        }
      );

      return true;
    },

    createBed: async (_: any, { width, length }: {width: number; length: number}) => {
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
          plantedAt: p.plantedAt || null,
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
          plantedAt: p.plantedAt || null,
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
          plantedAt: p.plantedAt || null,
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
      plantedAt: p.plantedAt || null,
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
          plantedAt: p.plantedAt || null,
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
          tempOkHours,
          modelVersion = MODEL_VERSION,
          inputs,
        }: {
          bedId: string;
          plantInstanceId: string;
          day: string;             // ISO date/time (we’ll new Date it)
          sunlightHours: number;
          shadedHours?: number;
          tempOkHours: number;
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
              tempOkHours: tempOkHours ?? 0,
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