import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ngTravelsRouter from "./ng-travels";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth);
router.use(ngTravelsRouter);

export default router;
