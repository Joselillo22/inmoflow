import { ComercialHeader } from "@/components/comercial/comercial-header";
import { BottomNav } from "@/components/comercial/bottom-nav";

export default function ComercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ComercialHeader />
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-4 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
