// Single source of truth for the seven Dapper add-ons.
// Both the /services marketing page and the booking flow read from here so
// names, prices, and durations stay in sync.

export type AddOn = {
  id: string;
  name: string;
  price: number;
  description: string;
  durationMinutes: number;
};

export const ADD_ONS: AddOn[] = [
  {
    id: "leather-revive",
    name: "Leather Revive",
    price: 30,
    description:
      "Conditioning treatment to soften, protect, and restore leather seats.",
    durationMinutes: 15,
  },
  {
    id: "clay-bar",
    name: "Clay Bar Decontamination",
    price: 70,
    description:
      "Removes embedded contaminants for a glass-smooth paint surface.",
    durationMinutes: 45,
  },
  {
    id: "engine-bay",
    name: "Engine Bay Detail",
    price: 50,
    description:
      "Degrease and dress the engine bay for a like-new look under the hood.",
    durationMinutes: 25,
  },
  {
    id: "pet-hair",
    name: "Excessive Pet Hair Removal",
    price: 25,
    description:
      "Heavy-duty extraction for stubborn embedded fur on seats and carpets.",
    durationMinutes: 20,
  },
  {
    id: "extra-sanitization",
    name: "Extra Sanitization",
    price: 20,
    description:
      "Antibacterial treatment across high-touch interior surfaces.",
    durationMinutes: 10,
  },
  {
    id: "steam-extraction",
    name: "Steam Extraction",
    price: 40,
    description:
      "Deep extraction on carpets and upholstery for tough stains and odors.",
    durationMinutes: 30,
  },
  {
    id: "child-car-seat",
    name: "Child Car Seat Clean",
    price: 30,
    description:
      "Crumbs, spills, and grime cleaned out of every nook of the seat.",
    durationMinutes: 20,
  },
];

export const ADD_ONS_BY_ID: Record<string, AddOn> = ADD_ONS.reduce(
  (acc, addOn) => {
    acc[addOn.id] = addOn;
    return acc;
  },
  {} as Record<string, AddOn>,
);

export function getAddOnById(id: string): AddOn | undefined {
  return ADD_ONS_BY_ID[id];
}

// A snapshot of an add-on stored on a Booking. We persist the price/name at
// booking time so historical bookings remain correct even if the catalogue
// later changes.
export type BookingAddOn = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
};

export function resolveBookingAddOns(ids: unknown): {
  addOns: BookingAddOn[];
  addOnTotal: number;
  addOnDurationMinutes: number;
} {
  const safeIds = Array.isArray(ids)
    ? Array.from(new Set(ids.filter((v): v is string => typeof v === "string")))
    : [];

  const addOns: BookingAddOn[] = [];
  for (const id of safeIds) {
    const addOn = ADD_ONS_BY_ID[id];
    if (!addOn) continue;
    addOns.push({
      id: addOn.id,
      name: addOn.name,
      price: addOn.price,
      durationMinutes: addOn.durationMinutes,
    });
  }

  const addOnTotal = addOns.reduce((sum, a) => sum + a.price, 0);
  const addOnDurationMinutes = addOns.reduce(
    (sum, a) => sum + a.durationMinutes,
    0,
  );

  return { addOns, addOnTotal, addOnDurationMinutes };
}
