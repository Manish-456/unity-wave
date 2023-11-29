import express from "express";
import { getLogInfo } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/logs", getLogInfo)

export default router