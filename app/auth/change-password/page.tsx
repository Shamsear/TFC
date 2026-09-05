import { ChangePasswordClient } from "@/components/auth/ChangePasswordClient"

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Update Password | Turf Cats",
  description: "Update your password to secure your Turf Cats account",
}

export default function ChangePasswordPage() {
  return <ChangePasswordClient />
}
