import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookingStatus } from "@/components/booking/booking-status";
import { formatMXN } from "@/lib/utils/currency";
import { Calendar, Clock, MapPin, Car } from "lucide-react";

interface BookingCardProps {
  booking: {
    id: string;
    scheduled_date: string;
    scheduled_time_start: string;
    status: string;
    car: {
      plate_number: string;
      make: string;
      model: string;
      color: string;
    };
    location: {
      name: string;
    };
    services: string[];
    total_price: number;
  };
}

export function BookingCard({ booking }: BookingCardProps) {
  const formattedDate = new Date(booking.scheduled_date + "T00:00:00").toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const formattedTime = booking.scheduled_time_start?.slice(0, 5) ?? "";

  return (
    <Link href={`/bookings/${booking.id}`} className="block">
      <Card className="card-hover glow-sm overflow-hidden">
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formattedDate}</span>
                <Clock className="ml-1 h-4 w-4" />
                <span>{formattedTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{booking.car.plate_number}</span>
                <span className="text-sm text-muted-foreground">
                  {booking.car.make} {booking.car.model}
                </span>
              </div>
            </div>
            <BookingStatus status={booking.status} />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span>{booking.location.name}</span>
            </div>
            <span className="font-semibold">{formatMXN(booking.total_price)}</span>
          </div>

          {booking.services.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {booking.services.map((service) => (
                <span
                  key={service}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {service}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
