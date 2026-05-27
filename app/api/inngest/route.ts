import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { deliverPushJob } from "@/lib/inngest/jobs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [deliverPushJob],
});
