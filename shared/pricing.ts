// Centralized pricing configuration for Dapper Car Wash

export interface ServicePricing {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  duration: number;
  category: 'basic' | 'standard' | 'premium';
  features: string[];
}

export interface VehicleSizePricing {
  size: 'small' | 'medium' | 'large';
  multiplier: number;
  description: string;
  examples: string[];
}

export interface AddOnPricing {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
}

// Core service pricing
export const SERVICE_PRICING: ServicePricing[] = [
  {
    id: 1,
    name: "Basic",
    description: "Exterior hand wash, Streak free windows",
    basePrice: 39,
    duration: 30,
    category: "basic",
    features: [
      "Exterior hand wash",
      "Streak free windows",
      "Quick dry towel finish"
    ]
  },
  {
    id: 2,
    name: "The OG",
    description: "Hand wash, Tires degreased, Vacuum and interior wipe down",
    basePrice: 58,
    duration: 45,
    category: "standard",
    features: [
      "Hand wash exterior",
      "Tires degreased & shined",
      "Interior vacuum",
      "Interior wipe down",
      "Dashboard & console cleaning"
    ]
  },
  {
    id: 3,
    name: "Black Label",
    description: "Everything in O.G. plus premium services including carpet shampoo and steam extraction",
    basePrice: 167,
    duration: 90,
    category: "premium",
    features: [
      "Everything in The OG",
      "Carpet shampoo",
      "Steam extraction",
      "Paint decontamination",
      "Leather conditioning",
      "Premium wax application",
      "Interior detail polish"
    ]
  }
];

// Vehicle size pricing adjustments
export const VEHICLE_SIZE_PRICING: VehicleSizePricing[] = [
  {
    size: 'small',
    multiplier: 0,
    description: 'No additional charge',
    examples: ['Sedan', 'Coupe', 'Hatchback']
  },
  {
    size: 'medium',
    multiplier: 10,
    description: '+$10',
    examples: ['Crossover', 'Small SUV', 'Wagon']
  },
  {
    size: 'large',
    multiplier: 20,
    description: '+$20',
    examples: ['SUV', 'Van', 'Pickup Truck']
  }
];

// Add-on services pricing
export const ADD_ON_PRICING: AddOnPricing[] = [
  {
    id: "dog-hair",
    name: "Dog Hair Removal",
    price: 20,
    description: "Specialized removal of pet hair from seats and carpets",
    category: "specialty"
  },
  {
    id: "car-seat",
    name: "Child Car Seat Steam Clean",
    price: 30,
    description: "Deep steam cleaning and sanitization of car seats",
    category: "cleaning"
  },
  {
    id: "odor",
    name: "Odor Eliminator",
    price: 50,
    description: "Professional odor neutralization treatment",
    category: "specialty"
  },
  {
    id: "engine",
    name: "Engine Bay Detail",
    price: 50,
    description: "Thorough cleaning and detailing of engine compartment",
    category: "detail"
  },
  {
    id: "leather",
    name: "Leather Revive",
    price: 40,
    description: "Deep conditioning and protection for leather surfaces",
    category: "care"
  },
  {
    id: "stain",
    name: "Heavy Stain Removal",
    price: 50,
    description: "Specialized treatment for tough stains and spots",
    category: "cleaning"
  }
];

// Utility functions for pricing calculations
export const calculateServicePrice = (
  serviceId: number,
  vehicleSize: 'small' | 'medium' | 'large' = 'small',
  addOnIds: string[] = []
): number => {
  const service = SERVICE_PRICING.find(s => s.id === serviceId);
  if (!service) return 0;

  const vehicleSizing = VEHICLE_SIZE_PRICING.find(v => v.size === vehicleSize);
  const vehicleMultiplier = vehicleSizing?.multiplier || 0;

  const addOnTotal = addOnIds.reduce((total, addOnId) => {
    const addOn = ADD_ON_PRICING.find(a => a.id === addOnId);
    return total + (addOn?.price || 0);
  }, 0);

  return service.basePrice + vehicleMultiplier + addOnTotal;
};

export const getServiceById = (id: number): ServicePricing | undefined => {
  return SERVICE_PRICING.find(service => service.id === id);
};

export const getVehicleSizeMultiplier = (size: 'small' | 'medium' | 'large'): number => {
  const pricing = VEHICLE_SIZE_PRICING.find(v => v.size === size);
  return pricing?.multiplier || 0;
};

export const getAddOnById = (id: string): AddOnPricing | undefined => {
  return ADD_ON_PRICING.find(addOn => addOn.id === id);
};

// Display formatting
export const formatPrice = (price: number): string => {
  return `$${price}`;
};

export const formatPriceRange = (basePrice: number): string => {
  return `From ${formatPrice(basePrice)}`;
};