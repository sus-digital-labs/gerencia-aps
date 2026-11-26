import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { json, Router, type ErrorRequestHandler, type Request, type RequestHandler } from "express";
import { ZodError } from "zod";
import {
  acsRankingSchema, acsScopeSchema, acsTasksSchema, acsTimelineSchema,
  loadAcsDirectory, loadAcsOverview, loadAcsRanking, loadAcsTimeline,
} from "./acs-visits";
import { acsTaskUpdateSchema, loadAcsTasks, updateAcsTask } from "./acs-tasks";

function endpoint(load: (req: Request) => unknown | Promise<unknown>): RequestHandler {
  return async (req, res) => {
    try {
      res.json(await load(req));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Confira o período, a equipe e os filtros da Gestão ACS." });
      } else if (error instanceof TRPCError && error.code !== "INTERNAL_SERVER_ERROR") {
        res.status(getHTTPStatusCodeFromError(error)).json({ message: error.message });
      } else {
        res.status(503).json({ message: "A Gestão ACS está temporariamente indisponível." });
      }
    }
  };
}

export function acsRouter(sameOrigin: (req: Request) => boolean) {
  const router = Router();
  router.get("/directory", endpoint(loadAcsDirectory));
  router.get("/overview", endpoint(req => loadAcsOverview(acsScopeSchema.parse(req.query))));
  router.get("/ranking", endpoint(req => loadAcsRanking(acsRankingSchema.parse(req.query))));
  router.get("/timeline", endpoint(req => loadAcsTimeline(acsTimelineSchema.parse(req.query))));
  router.get("/tasks", endpoint(req => loadAcsTasks(acsTasksSchema.parse(req.query))));
  router.post("/tasks/status", (req, res, next) => {
    if (!sameOrigin(req) || !req.is("application/json")) {
      res.status(403).json({ message: "Abra a Gestão ACS para alterar uma tarefa." });
      return;
    }
    next();
  }, json({ limit: "2kb" }), endpoint(req => updateAcsTask(acsTaskUpdateSchema.parse(req.body))));
  const handleBodyError: ErrorRequestHandler = (_error, _req, res, _next) => {
    res.status(400).json({ message: "Os dados da tarefa são inválidos." });
  };
  router.use(handleBodyError);
  return router;
}
