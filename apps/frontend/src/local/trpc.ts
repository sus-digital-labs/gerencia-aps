import { createTRPCReact } from "@trpc/react-query";
import type { LocalAppRouter } from "../../../backend/local/index";

export const trpc = createTRPCReact<LocalAppRouter>();
