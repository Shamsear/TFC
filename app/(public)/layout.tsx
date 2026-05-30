import PublicHeader from "@/components/layout/PublicHeader"
import PublicFooter from "@/components/layout/PublicFooter"

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-x-hidden">
      {/* Decorative Cyber Spotlights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#E8A800]/[0.03] rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="absolute top-1/3 right-0 w-[450px] h-[450px] bg-[#ff6600]/[0.02] rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-[#E8A800]/[0.02] rounded-full blur-[100px] pointer-events-none" />

      <PublicHeader />
      <div className="relative z-10">
        {children}
      </div>
      <PublicFooter />
    </div>
  )
}
