"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    setIsOffline(!navigator.onLine);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-[var(--color-brand-warning)] px-4 py-2 text-sm font-medium text-black sm:bottom-0">
      <WifiOff className="h-4 w-4" />
      Sin conexion — los cambios se sincronizaran
    </div>
  );
}
