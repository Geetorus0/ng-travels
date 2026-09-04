import { Router } from "express";
import healthRouter from "./health.js";
import ngTravelsRouter from "./ng-travels.js";

const router = Router();

router.use(healthRouter);
router.use(ngTravelsRouter);

export default router;
