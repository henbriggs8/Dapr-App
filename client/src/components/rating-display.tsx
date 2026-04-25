import { Star, StarHalf } from "lucide-react";
import { Icon } from "@/components/ui/icon";

export default function RatingDisplay({
  rating,
  count,
}: {
  rating: number;
  count: number;
}) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1">
      <div className="flex text-yellow-500">
        {[...Array(fullStars)].map((_, i) => (
          <Icon icon={Star} size="sm" className="fill-current" key={i} />
        ))}
        {hasHalfStar && <Icon icon={StarHalf} size="sm" className="fill-current" />}
      </div>
      <span className="text-sm text-muted-foreground">({count})</span>
    </div>
  );
}
