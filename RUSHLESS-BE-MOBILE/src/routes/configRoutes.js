import { Router } from "express";
import {
  getMobileConfig,
  upsertMobileConfig
} from "../controllers/configController.js";

const router = Router();

router.get("/mobile", getMobileConfig);
router.post("/mobile", upsertMobileConfig);

export default router;

