import { Star, StarHalf } from "lucide-react";

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
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
        {hasHalfStar && <StarHalf className="h-4 w-4 fill-current" />}
      </div>
      <span className="text-sm text-muted-foreground">({count})</span>
    </div>
  );
}
