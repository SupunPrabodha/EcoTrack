import { Router } from "express";
const router = Router();

router.get("/", (req, res) => res.json({ ok: true, name: "EcoTrack API" }));
export default router;
