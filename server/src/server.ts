import path from 'node:path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import db from './config/connection.js';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs, resolvers } from './schemas/index.js';
import { authenticateToken } from './utils/auth.js';
import { DEFAULT_PLANTS } from './seeds/plants.js';
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log(process.env);

const server = new ApolloServer({
  typeDefs,
  resolvers
});

function roundCoord(x: number, places = 3) {
  const k = Math.pow(10, places);
  return Math.round(x * k) / k;
}

const startApolloServer = async () => {
  await server.start();
  await db();

  const PORT = process.env.PORT || 3001;
  const app = express();

  app.use(cors());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  app.use("/images", express.static(path.join(__dirname, "../public/images")));
  
  // GraphQL setup
  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async({ req }) => {
        const ctx = await authenticateToken({ req });
        return { user: ctx?.user ?? null };
      },
    })
  );
// Gets the default plants
  app.get('/api/seeds/plants', (_req: Request, res: Response) => {
  res.json(DEFAULT_PLANTS);
});

  app.get("/api/climo/hourly", async (req: Request, res: Response) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      const dayIndex = Number(req.query.dayIndex); // 1–365

      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(dayIndex)) {
        return res.status(400).json({ error: "lat, lon, and dayIndex are required numbers" });
      }

      const latRounded = roundCoord(lat);
      const lonRounded = roundCoord(lon);

      if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        return res.status(503).json({ error: "DB not connected" });
      }

      const col = mongoose.connection.db.collection("climatology");
      const doc = await col.findOne({ latRounded, lonRounded });
      if (!doc) return res.status(404).json({ error: "No climatology for this lat/lon (rounded)" });

      const day = doc.normals?.[dayIndex];
      if (!day) return res.status(404).json({ error: `No normals for dayIndex=${dayIndex}` });

      // Optional: allow ?dateISO=YYYY-MM-DD for pretty timestamps
      const dateISO = typeof req.query.dateISO === "string" ? req.query.dateISO : "1970-01-01";
      const timeISO = Array.from({ length: 24 }, (_, h) =>
        `${dateISO}T${String(h).padStart(2, "0")}:00:00`
      );

      res.json({
        timeISO,
        temperature_2m: day.temperature_2m ?? new Array(24).fill(null),
        precipitation: day.precipitation ?? new Array(24).fill(0),
        // et0Mm: day.et0Mm ?? new Array(24).fill(null), // later if you compute ET₀
      });
    } catch (e: any) {
      console.error("/api/climo/hourly error", e);
      res.status(500).json({ error: String(e?.message || e) });
    }
  });

  // Serve frontend in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../client/dist')));
    app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}!`);
    console.log(`GraphQL at http://localhost:${PORT}/graphql`);
    console.log(`Static images served from /images`);
  });
};

startApolloServer();
