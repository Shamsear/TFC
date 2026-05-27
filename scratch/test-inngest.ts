import { inngest } from "../lib/inngest/client";

// Let's inspect the types by forcing a compilation check on different shapes
// Option A: 2 arguments where trigger is combined in config
const fnA = inngest.createFunction(
  {
    id: "test-a",
    name: "Test A",
    // In some older versions, trigger was in the options object:
    // @ts-ignore
    trigger: { event: "test/event" }
  },
  async ({ event, step }) => {
    return event.data;
  }
);
