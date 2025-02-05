import { Card, CardContent } from "./ui/card";

export default function PriceTier({
  basic,
  standard,
  premium,
}: {
  basic?: number;
  standard?: number;
  premium?: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Card>
        <CardContent className="p-3">
          <div className="text-sm font-medium">Basic</div>
          <div className="text-xl font-bold">${basic}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="text-sm font-medium">Standard</div>
          <div className="text-xl font-bold">${standard}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="text-sm font-medium">Premium</div>
          <div className="text-xl font-bold">${premium}</div>
        </CardContent>
      </Card>
    </div>
  );
}
