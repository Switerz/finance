import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Você está offline</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Conecte-se à internet para continuar usando o Finance Planner.
      </p>
    </div>
  );
}
