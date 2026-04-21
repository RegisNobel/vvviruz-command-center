import {CommandCenterNav} from "@/components/command-center-nav";
import {requireAuthenticatedAdminSession} from "@/lib/auth/server";

export default async function ProtectedAdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAuthenticatedAdminSession();

  return (
    <>
      <CommandCenterNav />
      {children}
    </>
  );
}
