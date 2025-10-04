import { Profile } from "../models/index.js";
import { signToken, AuthenticationError, UserExistsError } from "../utils/auth.js";
import { IResolvers } from "@graphql-tools/utils";
import { AuthRequest } from "../utils/auth";
import { Bed } from "../models/Bed.js";

const resolvers: IResolvers = {
  Query: {
    me: async (_, __, context: { req: AuthRequest }) => {
      if (!context.req.user) throw new AuthenticationError("Not authenticated");
      return await Profile.findById(context.req.user._id).populate("savedPlots");
    },
    beds: async () => {
      return await Bed.find();
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
      return bed;
    },

    addPlantsToBed: async (_, { bedID, plants }) => {
  const bed = await Bed.findById(bedID);
  if (!bed) throw new Error("Bed not found");

  bed.plants.push(...plants);
  await bed.save();
  return bed;
},

removeBed: async (_, { bedId }) => {
    const bed = await Bed.findByIdAndDelete(bedId);
    if (!bed) throw new Error("Bed not found");
    return bed;
  },

  clearBeds: async () => {
    await Bed.deleteMany({});
    return [];
  },
  },
};

export default resolvers;