import { inngest } from "../lib/inngest/client";

// Let's test the 2-argument signature where the trigger is inside options
const fnB = inngest.createFunction(
  {
    id: "test-b",
    name: "Test B",
    // Nested trigger
    trigger: { event: "test/event" }
  },
  async ({ event, step }: { event: any; step: any }) => {
    return event.data;
  }
);
