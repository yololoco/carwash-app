"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  Star,
  Gift,
  Copy,
  Share2,
  Check,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface LoyaltyTransaction {
  id: string;
  points: number;
  reason: string;
  created_at: string;
}

interface Reward {
  name: string;
  points: number;
  description: string;
}

const REWARDS: Reward[] = [
  { name: "Lavado basico gratis", points: 100, description: "Un lavado basico sin costo" },
  { name: "Lavado premium gratis", points: 200, description: "Un lavado premium sin costo" },
  { name: "20% descuento", points: 50, description: "20% de descuento en tu proximo lavado" },
];

export default function LoyaltyPage() {
  const { user, profile } = useAuth();
  const [currentPoints, setCurrentPoints] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    // Fetch loyalty points
    const { data: loyaltyData } = await db
      .from("loyalty_points")
      .select("current_points, lifetime_points")
      .eq("user_id", user.id)
      .single();

    if (loyaltyData) {
      setCurrentPoints(loyaltyData.current_points ?? 0);
      setLifetimePoints(loyaltyData.lifetime_points ?? 0);
    } else {
      setCurrentPoints(0);
      setLifetimePoints(0);
    }

    // Fetch recent transactions
    const { data: txData } = await db
      .from("loyalty_transactions")
      .select("id, points, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setTransactions((txData ?? []) as LoyaltyTransaction[]);

    // Fetch referral count
    const { count } = await db
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", user.id);

    setReferralCount(count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRedeem = async (reward: Reward, index: number) => {
    if (!user || currentPoints < reward.points) return;
    setRedeeming(index);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any;

    // Deduct points
    await db
      .from("loyalty_points")
      .update({
        current_points: currentPoints - reward.points,
      })
      .eq("user_id", user.id);

    // Record transaction
    await db.from("loyalty_transactions").insert({
      user_id: user.id,
      points: -reward.points,
      reason: `Canje: ${reward.name}`,
    });

    toast.success(`${reward.name} canjeado exitosamente!`);
    setRedeeming(null);
    fetchData();
  };

  const handleCopyCode = async () => {
    if (!profile?.referral_code) return;
    try {
      await navigator.clipboard.writeText(profile.referral_code);
      setCopied(true);
      toast.success("Codigo copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const handleShare = async () => {
    if (!profile?.referral_code) return;
    const shareUrl = `${window.location.origin}/register?ref=${profile.referral_code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Unete a myWash",
          text: `Usa mi codigo ${profile.referral_code} para registrarte en myWash y obtener puntos!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado al portapapeles!");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lealtad</h1>
        <p className="text-sm text-muted-foreground">
          Acumula puntos y canjea recompensas
        </p>
      </div>

      {/* Points balance */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <Star className="h-10 w-10" />
          <p className="text-5xl font-bold">{currentPoints}</p>
          <p className="text-sm opacity-80">puntos disponibles</p>
          <div className="mt-2 flex items-center gap-1 text-xs opacity-70">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{lifetimePoints} puntos acumulados de por vida</span>
          </div>
        </CardContent>
      </Card>

      {/* Rewards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recompensas</h2>
        <div className="grid gap-3">
          {REWARDS.map((reward, i) => {
            const canRedeem = currentPoints >= reward.points;
            return (
              <Card key={i}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">{reward.name}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {reward.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge variant="secondary">{reward.points} pts</Badge>
                    <Button
                      size="sm"
                      disabled={!canRedeem || redeeming === i}
                      onClick={() => handleRedeem(reward, i)}
                    >
                      {redeeming === i ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : null}
                      Canjear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Historial de puntos</h2>
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Star className="h-8 w-8" />
            <p className="text-sm">Sin movimientos aun</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{tx.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={
                    tx.points > 0
                      ? "text-sm font-semibold text-green-600 dark:text-green-400"
                      : "text-sm font-semibold text-red-600 dark:text-red-400"
                  }
                >
                  {tx.points > 0 ? `+${tx.points}` : tx.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referral section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Referidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.referral_code ? (
            <>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-lg bg-muted px-3 py-2 text-center font-mono text-lg font-bold tracking-wider">
                  {profile.referral_code}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyCode}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartir enlace
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {referralCount === 0
                  ? "Aun no has referido a nadie"
                  : `Has referido a ${referralCount} persona${referralCount > 1 ? "s" : ""}`}
              </p>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No tienes un codigo de referido asignado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
