import { redirectIfNotAuthenticated } from "@/lib/redirect/redirectIfNotAuthenticated";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfNotAuthenticated();
  return (
    <main className="mx-auto w-full max-w-4xl p-4 md:p-6">{children}</main>
  );
}
