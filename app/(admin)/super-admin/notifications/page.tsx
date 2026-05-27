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
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl mb-6 sm:mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-[#E8A800] to-[#FFB347] bg-clip-text text-transparent">
              Notification Hub
            </span>
          </h1>
          <p className="text-[#D4CCBB] text-sm sm:text-base">
            Broadcast test payloads and audit client subscriptions
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <SuperAdminNotificationsClient 
          subscriptions={parsedSubscriptions}
          users={parsedUsers}
        />
      </div>
    </div>
  )
}
