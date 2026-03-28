import { redirectIfAuthenticated } from "@/lib/redirect/redirectIfAuthenticated";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfAuthenticated();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      {children}
    </main>
  );
}
