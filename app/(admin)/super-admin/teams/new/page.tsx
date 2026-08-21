import CreateTeamPage from "@/components/admin/CreateTeamPage"

export const metadata = {
  title: "Create Team | Turf Cats Admin",
  description: "Create a new team and generate manager credentials",
}

export default function SuperAdminCreateTeamPage() {
  return (
    <CreateTeamPage
      backHref="/super-admin/teams"
      backLabel="Back to Teams"
      teamsViewHref="/super-admin/teams"
    />
  )
}
