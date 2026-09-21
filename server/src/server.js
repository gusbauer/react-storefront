import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();

const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "g-store-api",
    message: "Backend funcionando correctamente",
  });
});

app.listen(PORT, () => {
  console.log(`G Store API running on http://localhost:${PORT}`);
});
