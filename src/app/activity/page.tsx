import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import ActivityList from "./ActivityList";

export default async function ActivityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader email={user.email ?? ""} />
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-white mb-6">Activity Log</h1>
        <ActivityList userId={user.id} />
      </main>
    </div>
  );
}
