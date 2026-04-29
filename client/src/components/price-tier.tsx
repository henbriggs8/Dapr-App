import { Card, CardContent } from "./ui/card";

export default function PriceTier({
  basic,
  interior,
  standard,
  premium,
}: {
  basic?: number;
  interior?: number;
  standard?: number;
  premium?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Card>
        <CardContent className="p-3">
          <div className="text-sm font-medium">Essential</div>
          <div className="text-xl font-bold">${basic}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="text-sm font-medium">Interior</div>
          <div className="text-xl font-bold">${interior}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="text-sm font-medium">Refresh</div>
          <div className="text-xl font-bold">${standard}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="text-sm font-medium">Black Label</div>
          <div className="text-xl font-bold">${premium}</div>
        </CardContent>
      </Card>
    </div>
  );
}
