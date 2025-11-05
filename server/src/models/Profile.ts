import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export type ClimoStatus = 'idle' | 'building' | 'ready' | 'error';

interface IProfile extends Document {
  _id: string;
  username: string;
  email: string;
  password:string;
  saved: string[];
  homeLat?: number | null;
  homeLon?: number | null;
  locationLabel?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  climoStatus?: ClimoStatus;
  climoTileKey?: string | null;
  lastClimoBuiltAt?: Date | null;
  isCorrectPassword(password: string): Promise<boolean>;
}

const profileSchema = new Schema<IProfile>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/.+@.+\..+/, 'Must match an email address!'],
    },
    password: { type: String, required: true, minlength: 5 },
    saved: [{ type: Schema.Types.ObjectId, ref: 'Bed' }],
    homeLat: { type: Number, default: null },
    homeLon: { type: Number, default: null },
    locationLabel: { type: String, default: null },
    city:          { type: String, default: null },
    region:        { type: String, default: null },
    country:       { type: String, default: null },
    climoStatus: {
      type: String,
      enum: ['idle', 'building', 'ready', 'error'],
      default: 'idle',
    },
    climoTileKey: { type: String, default: null },
    lastClimoBuiltAt: { type: Date, default: null }, 
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// set up pre-save middleware to create password
profileSchema.pre<IProfile>('save', async function (next) {
  if (this.isNew || this.isModified('password')) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }
  next();
});

// compare the incoming password with the hashed password
profileSchema.methods.isCorrectPassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

const Profile = model<IProfile>('Profile', profileSchema);

export default Profile;
