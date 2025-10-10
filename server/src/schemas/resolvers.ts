import { Profile } from "../models/index.js";
import { signToken, AuthenticationError, UserExistsError } from "../utils/auth.js";
import { IResolvers } from "@graphql-tools/utils";
import { AuthRequest } from "../utils/auth";
import { Bed } from "../models/Bed.js";
import Plant from "../models/Plant.js";
import mongoose from "mongoose";

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
      return beds.map(bed => ({ ...bed.toObject(), plantInstances: bed.plants }));
    },
    plants: async () => {
    const plants = await Plant.find();
    console.log("Fetched plants:", plants);
    return plants;
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
      if (existingProfile) {
        throw new UserExistsError("A profile with this email already exists.");
      }

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
        plantInstances: populated.plants,
      };
    },

    async moveBed(_, { bedId, position }) {
      try {
        const { x, y } = position;

        // Update in MongoDB
        const updatedBed = await Bed.findByIdAndUpdate(
          bedId,
          { x, y },
          { new: true } // return the updated bed
        ).populate({
          path: "plants.basePlant",
          select: "_id name image waterReq spacing",
        });

        if (!updatedBed) {
          throw new Error("Bed not found");
        }

        return { ...updatedBed.toObject(), plantInstances: updatedBed.plants };
      } catch (err) {
        console.error("Error moving bed ${bedId}:", err);
        throw new Error("Failed to move bed");
      }
    },

    async movePlantInBed(_, { bedId, position }) {
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

      return { ...populated.toObject(), plantInstances: populated.plants };
    },

    addPlantsToBed: async (_, { bedId, basePlantIds }: { bedId: string; basePlantIds: string[] }) => {
      const bed = await Bed.findById(bedId);
      if (!bed) throw new Error("Bed not found");

      basePlantIds.forEach(basePlantId => bed.plants.push({ basePlant: basePlantId }));
      await bed.save();

      const populated = await bed.populate({
        path: "plants.basePlant",
        select: "_id name image waterReq spacing",
      });
      return { ...populated.toObject(), plantInstances: populated.plants };
    },

    removeBed: async (_, { bedId }) => {
      const bed = await Bed.findById(bedId);
      if (!bed) throw new Error("Bed not found");

      await Bed.findByIdAndDelete(bedId);
      return { ...bed.toObject(), plantInstances: bed.plants };
    },

    removePlantsFromBed: async (
    _,
    { bedId, plantInstanceIds }: { bedId: string; plantInstanceIds: string[] }
  ) => {
    // Convert string IDs to ObjectId
    const objectIds = plantInstanceIds.map((id) => new mongoose.Types.ObjectId(id));

    // Use $pull to remove matching plant instances
    const updatedBed = await Bed.findByIdAndUpdate(
      bedId,
      { $pull: { plants: { _id: { $in: objectIds } } } },
      { new: true } // return the updated document
    ).populate({
      path: "plants.basePlant",
      select: "_id name image waterReq spacing",
    });

    if (!updatedBed) throw new Error("Bed not found");

    return updatedBed;
  },

    clearBeds: async () => {
        await Bed.deleteMany({});
        return [];
    },
  },
};

export default resolvers;