import { AppShell } from "@/components/layout/app-shell";
import { SwRegister } from "@/components/pwa/sw-register";

export default function PrivateAppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SwRegister />
      <AppShell>{children}</AppShell>
    </>
  );
}
