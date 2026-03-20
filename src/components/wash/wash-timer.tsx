"use client";

import { useEffect, useState } from "react";

interface WashTimerProps {
  startedAt: string;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export default function WashTimer({ startedAt }: WashTimerProps) {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();

    function tick() {
      setElapsed(Date.now() - start);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Tiempo transcurrido
      </span>
      <span className="font-mono text-4xl font-bold tabular-nums tracking-tight">
        {formatElapsed(elapsed)}
      </span>
    </div>
  );
}
