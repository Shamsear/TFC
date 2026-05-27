import { inngest } from "./client";
import { sendPushNotificationRaw } from "@/lib/notifications-server";

export const deliverPushJob = inngest.createFunction(
  { 
    id: "deliver-push-notification",
    name: "Deliver Push Notification",
    retries: 5 // Retries exponential backoffs automatically for transient network/browser service fails
  },
  { event: "notification/send" },
  async ({ event, step }: { event: any; step: any }) => {
    const { userId, payload, category } = event.data;

    await step.run("dispatch-payload", async () => {
      await sendPushNotificationRaw(userId, payload, category);
    });
  }
);
