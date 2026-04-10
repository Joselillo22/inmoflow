import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-[72px] flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-6 max-w-[1400px]">{children}</main>
      </div>
    </div>
  );
}
