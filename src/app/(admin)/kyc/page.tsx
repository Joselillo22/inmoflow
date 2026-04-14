import { redirect } from "next/navigation";

export default function KYCPage() {
  redirect("/propietarios?tab=kyc");
}
