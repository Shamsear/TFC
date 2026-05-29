import TeamNavigation from "@/components/team/TeamNavigation"
import TeamFooter from "@/components/team/TeamFooter"

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <TeamNavigation />
      {children}
      <TeamFooter />
    </>
  )
}
