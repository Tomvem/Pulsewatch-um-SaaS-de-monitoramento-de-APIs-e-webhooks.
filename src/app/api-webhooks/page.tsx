import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";
import { getCurrentUser } from "@/lib/auth";

export default async function ApiWebhooksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <Dashboard user={user} section="api" />;
}
