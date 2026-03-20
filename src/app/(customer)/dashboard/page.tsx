"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookingStatus } from "@/components/booking/booking-status";
import Link from "next/link";
import {
  Car,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  Droplets,
  MapPin,
  Sparkles,
  Zap,
} from "lucide-react";

interface NextBooking {
  id: string;
  scheduled_date: string;
  scheduled_time_start: string;
  status: string;
  car: { plate_number: string };
  location: { name: string };
}

export default function CustomerDashboard() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { user } = useAuth();
  const [carCount, setCarCount] = useState(0);
  const [nextBooking, setNextBooking] = useState<NextBooking | null>(null);
  const [bookingLoaded, setBookingLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any;

      const { count } = await db
        .from("cars")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user!.id)
        .eq("is_active", true);
      setCarCount(count ?? 0);

      const { data: bookingData } = await db
        .from("bookings")
        .select(
          "id, scheduled_date, scheduled_time_start, status, cars(plate_number), locations(name)"
        )
        .eq("customer_id", user!.id)
        .in("status", ["pending", "confirmed"])
        .order("scheduled_date", { ascending: true })
        .limit(1);

      if (bookingData && bookingData.length > 0) {
        const b = bookingData[0];
        setNextBooking({
          ...b,
          car: b.cars ?? { plate_number: "" },
          location: b.locations ?? { name: "" },
        });
      }
      setBookingLoaded(true);
    }
    fetchData();
  }, [user]);

  const dateLocale = locale === "en" ? "en-US" : "es-MX";
  const formattedDate = nextBooking
    ? new Date(nextBooking.scheduled_date + "T00:00:00").toLocaleDateString(
        dateLocale,
        { weekday: "short", day: "numeric", month: "short" }
      )
    : "";
  const formattedTime = nextBooking?.scheduled_time_start?.slice(0, 5) ?? "";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">{t("welcome")}</h1>
        <p className="text-muted-foreground">
          {t("welcomeMessage")}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/cars/new" className={buttonVariants({ variant: "outline", className: "h-auto flex-col gap-2 py-4" })}>
            <Plus className="h-5 w-5" />
            <span className="text-xs">{t("quickActions.addCar")}</span>
        </Link>
        <Link href="/packages" className={buttonVariants({ variant: "outline", className: "h-auto flex-col gap-2 py-4" })}>
            <Droplets className="h-5 w-5" />
            <span className="text-xs">{t("quickActions.viewPlans")}</span>
        </Link>
        <Link href="/book" className={buttonVariants({ variant: "outline", className: "h-auto flex-col gap-2 py-4" })}>
            <Sparkles className="h-5 w-5" />
            <span className="text-xs">{t("quickActions.singleWash")}</span>
        </Link>
        <Link href="/book/emergency" className={buttonVariants({ variant: "outline", className: "h-auto flex-col gap-2 py-4" })}>
            <Zap className="h-5 w-5" />
            <span className="text-xs">{t("quickActions.emergency")}</span>
        </Link>
      </div>

      {/* Next Wash */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">
            {t("nextWash.title")}
          </CardTitle>
          {nextBooking ? (
            <BookingStatus status={nextBooking.status} />
          ) : (
            <Badge variant="secondary">{t("nextWash.noScheduled")}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {nextBooking ? (
            <Link href={`/bookings/${nextBooking.id}`} className="block space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formattedTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Car className="h-4 w-4" />
                  <span className="font-medium">{nextBooking.car.plate_number}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{nextBooking.location.name}</span>
                </div>
              </div>
              <div className="flex items-center text-sm text-primary">
                {t("nextWash.viewDetail")}
                <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </Link>
          ) : bookingLoaded ? (
            <div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Car className="h-4 w-4" />
                  <span>{t("nextWash.carsRegistered", { count: carCount })}</span>
                </div>
              </div>
              <Link href="/cars/new" className={buttonVariants({ variant: "link", className: "mt-2 h-auto p-0 text-sm" })}>
                  {t("nextWash.registerFirstCar")}
                  <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {t("recentActivity.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
            <Calendar className="h-8 w-8" />
            <p>{t("recentActivity.empty")}</p>
            <p>{t("recentActivity.emptySub")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium">{t("plan.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{t("plan.noSubscription")}</span>
            </div>
            <Link href="/packages" className={buttonVariants({ size: "sm" })}>{t("plan.viewPlans")}</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
