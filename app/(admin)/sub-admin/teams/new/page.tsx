import CreateTeamPage from "@/components/admin/CreateTeamPage"

export const metadata = {
  title: "Create Team | Turf Cats Admin",
  description: "Create a new team and generate manager credentials",
}

export default function SubAdminCreateTeamPage() {
  return (
    <CreateTeamPage
      backHref="/sub-admin"
      backLabel="Back to Dashboard"
      teamsViewHref="/sub-admin"
    />
  )
}
