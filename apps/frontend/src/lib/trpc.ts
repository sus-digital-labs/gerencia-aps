import { createTRPCReact } from "@trpc/react-query";

// The public repository contains the frontend contract only. Consumers provide
// their own compatible API implementation at /api/trpc.
export const trpc: any = createTRPCReact<any>();
