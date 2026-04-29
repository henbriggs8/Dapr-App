import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { User, PricingConfig } from "@shared/schema";
import { Button } from "./ui/button";
import RatingDisplay from "./rating-display";
import PriceTier from "./price-tier";
import { useState } from "react";
import BookingDialog from "./booking-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useQuery } from "@tanstack/react-query";

export default function ProviderCard({ provider }: { provider: User }) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const { data: pricing } = useQuery<PricingConfig>({ queryKey: ["/api/pricing"] });

  if (!pricing) return null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={provider.profileImage ?? undefined} />
            <AvatarFallback>{provider.name?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{provider.name}</h2>
            <RatingDisplay 
              rating={provider.rating ?? 5} 
              count={provider.ratingCount ?? 0} 
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{provider.description}</p>
          <div className="space-y-4">
            <PriceTier
              basic={pricing.basic}
              interior={pricing.interior}
              standard={pricing.standard}
              premium={pricing.premium}
            />
            <Button
              className="w-full"
              onClick={() => setBookingOpen(true)}
            >
              Book Now
            </Button>
          </div>
        </CardContent>
      </Card>
      <BookingDialog
        provider={provider}
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
      />
    </>
  );
}