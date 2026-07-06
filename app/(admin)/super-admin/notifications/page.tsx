import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import SuperAdminNotificationsClient from "./SuperAdminNotificationsClient"

export const metadata = {
  title: "Notifications Hub | Super Admin",
  description: "Test notifications and audit subscription nodes",
}

export default async function SuperAdminNotificationsPage() {
  const session = await auth()

  if (!session?.user?.id || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/signin")
  }

  // 1. Fetch active subscriptions with user credentials
  const subscriptions = await prisma.push_subscriptions.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        }
      }
    },
    orderBy: {
      lastUsedAt: "desc"
    }
  });

  // 2. Fetch all registered managers/users to populate targeted dispatch select options
  const users = await prisma.users.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
    orderBy: {
      email: "asc"
    }
  });

  const parsedSubscriptions = subscriptions.map(sub => ({
    id: sub.id,
    deviceName: sub.deviceName,
    deviceType: sub.deviceType,
    lastUsedAt: sub.lastUsedAt.toISOString(),
    consentGivenAt: sub.consentGivenAt.toISOString(),
    user: {
      id: sub.user.id,
      email: sub.user.email,
      name: sub.user.name || "N/A"
    }
  }));

  const parsedUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name || "N/A",
    role: user.role
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent uppercase tracking-wider leading-none">
          Notification Hub
        </h1>
        <p className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest font-mono">
          Broadcast test payloads and audit client subscriptions
        </p>
      </div>

      <SuperAdminNotificationsClient 
        subscriptions={parsedSubscriptions}
        users={parsedUsers}
      />
    </div>
  )
}
