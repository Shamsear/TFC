import { Suspense } from "react"
import TeamNavigation from "@/components/team/TeamNavigation"
import TeamFooter from "@/components/team/TeamFooter"
import PageLoader from "@/components/ui/PageLoader"

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <TeamNavigation />
      <Suspense fallback={<PageLoader fullScreen={false} />}>
        {children}
      </Suspense>
      <TeamFooter />
    </>
  )
}
