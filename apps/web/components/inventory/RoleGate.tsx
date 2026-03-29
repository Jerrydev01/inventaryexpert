import type { UserRoleEnum } from "@inventaryexpert/types";

export function RoleGate({
  allow,
  role,
  children,
  fallback = null,
}: {
  allow: UserRoleEnum[];
  role: UserRoleEnum;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
