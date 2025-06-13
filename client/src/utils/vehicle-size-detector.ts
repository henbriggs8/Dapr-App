// Vehicle size classification system based on make and model
export type VehicleSize = 'small' | 'medium' | 'large';

interface VehicleSizeMapping {
  [make: string]: {
    [model: string]: VehicleSize;
  } | VehicleSize; // Default size for the entire make
}

const VEHICLE_SIZE_DATABASE: VehicleSizeMapping = {
  // Luxury/Sports Cars - Mostly Small
  "Acura": {
    "ILX": "small",
    "TLX": "small", 
    "RLX": "medium",
    "MDX": "large",
    "RDX": "medium",
    "NSX": "small"
  },
  "Alfa Romeo": "small",
  "Aston Martin": "small",
  "Audi": {
    "A3": "small",
    "A4": "small",
    "A5": "small", 
    "A6": "medium",
    "A7": "small", // Like RS7
    "A8": "large",
    "Q3": "medium",
    "Q5": "medium",
    "Q7": "large",
    "Q8": "large",
    "e-tron": "large",
    "R8": "small",
    "TT": "small"
  },
  "Bentley": "large",
  "BMW": {
    "1 Series": "small",
    "2 Series": "small",
    "3 Series": "small",
    "4 Series": "small",
    "5 Series": "medium",
    "6 Series": "medium",
    "7 Series": "large",
    "8 Series": "medium",
    "X1": "medium",
    "X2": "medium", 
    "X3": "medium",
    "X4": "medium",
    "X5": "large",
    "X6": "large",
    "X7": "large",
    "Z4": "small",
    "i3": "small",
    "i4": "small",
    "iX": "large"
  },
  "Bugatti": "small",
  "Buick": {
    "Encore": "medium",
    "Envision": "medium", 
    "Enclave": "large"
  },
  "Cadillac": {
    "ATS": "small",
    "CTS": "medium",
    "CT4": "small",
    "CT5": "medium",
    "CT6": "large",
    "XT4": "medium",
    "XT5": "medium",
    "XT6": "large",
    "Escalade": "large"
  },
  "Chevrolet": {
    "Spark": "small",
    "Sonic": "small",
    "Cruze": "small",
    "Malibu": "medium",
    "Impala": "medium",
    "Camaro": "small",
    "Corvette": "small",
    "Trax": "medium",
    "Equinox": "medium",
    "Traverse": "large",
    "Tahoe": "large", // Example from user
    "Suburban": "large",
    "Silverado": "large",
    "Colorado": "medium"
  },
  "Chrysler": {
    "300": "medium",
    "Pacifica": "large"
  },
  "Dodge": {
    "Charger": "medium",
    "Challenger": "medium",
    "Durango": "large",
    "Journey": "medium"
  },
  "Ferrari": "small",
  "Fiat": "small",
  "Ford": {
    "Fiesta": "small",
    "Focus": "small", 
    "Fusion": "medium",
    "Mustang": "small",
    "EcoSport": "medium",
    "Escape": "medium",
    "Edge": "medium",
    "Explorer": "large",
    "Expedition": "large",
    "F-150": "large",
    "Super Duty": "large",
    "Ranger": "medium"
  },
  "Genesis": {
    "G70": "small",
    "G80": "medium",
    "G90": "large",
    "GV60": "medium",
    "GV70": "medium", 
    "GV80": "large"
  },
  "GMC": {
    "Terrain": "medium",
    "Acadia": "large",
    "Yukon": "large",
    "Sierra": "large",
    "Canyon": "medium"
  },
  "Honda": {
    "Fit": "small",
    "Civic": "small",
    "Accord": "medium",
    "Insight": "small",
    "CR-V": "medium",
    "Passport": "medium",
    "Pilot": "large",
    "Ridgeline": "medium"
  },
  "Hyundai": {
    "Accent": "small",
    "Elantra": "small",
    "Sonata": "medium",
    "Venue": "small",
    "Kona": "medium",
    "Tucson": "medium",
    "Santa Fe": "medium",
    "Palisade": "large"
  },
  "Infiniti": {
    "Q50": "small",
    "Q60": "small",
    "Q70": "medium",
    "QX30": "small",
    "QX50": "medium",
    "QX60": "medium",
    "QX80": "large"
  },
  "Jaguar": {
    "XE": "small",
    "XF": "medium",
    "XJ": "large",
    "F-Type": "small",
    "E-Pace": "medium",
    "F-Pace": "medium",
    "I-Pace": "medium"
  },
  "Jeep": {
    "Compass": "medium",
    "Cherokee": "medium",
    "Grand Cherokee": "medium",
    "Wrangler": "medium",
    "Gladiator": "medium"
  },
  "Kia": {
    "Rio": "small",
    "Forte": "small",
    "Optima": "medium",
    "Stinger": "medium",
    "Soul": "small",
    "Seltos": "medium",
    "Sportage": "medium",
    "Sorento": "medium",
    "Telluride": "large"
  },
  "Koenigsegg": "small",
  "Lamborghini": "small",
  "Land Rover": {
    "Range Rover Evoque": "medium",
    "Range Rover Velar": "medium",
    "Range Rover Sport": "large",
    "Range Rover": "large",
    "Discovery Sport": "medium",
    "Discovery": "large",
    "Defender": "medium"
  },
  "Lexus": {
    "IS": "small",
    "ES": "medium",
    "GS": "medium",
    "LS": "large",
    "RC": "small",
    "LC": "small",
    "UX": "small",
    "NX": "medium",
    "RX": "medium",
    "GX": "large",
    "LX": "large"
  },
  "Lincoln": {
    "MKZ": "medium",
    "Continental": "large",
    "Corsair": "medium",
    "Nautilus": "medium",
    "Aviator": "large",
    "Navigator": "large"
  },
  "Lotus": "small",
  "Maserati": {
    "Ghibli": "medium",
    "Quattroporte": "large",
    "Levante": "medium",
    "MC20": "small"
  },
  "Mazda": {
    "Mazda3": "small",
    "Mazda6": "medium",
    "CX-3": "small",
    "CX-30": "medium",
    "CX-5": "medium",
    "CX-9": "large",
    "MX-5 Miata": "small"
  },
  "McLaren": "small",
  "Mercedes-Benz": {
    "A-Class": "small",
    "C-Class": "small",
    "E-Class": "medium",
    "S-Class": "large",
    "CLA": "small",
    "CLS": "medium",
    "GLA": "medium",
    "GLB": "medium",
    "GLC": "medium",
    "GLE": "large",
    "GLS": "large",
    "G-Class": "medium",
    "SL": "small",
    "AMG GT": "small"
  },
  "Mini": "small",
  "Mitsubishi": {
    "Mirage": "small",
    "Lancer": "small",
    "Eclipse Cross": "medium",
    "Outlander": "medium"
  },
  "Nissan": {
    "Versa": "small",
    "Sentra": "small",
    "Altima": "medium",
    "Maxima": "medium",
    "370Z": "small",
    "GT-R": "small",
    "Kicks": "small",
    "Rogue": "medium",
    "Murano": "medium",
    "Pathfinder": "medium",
    "Armada": "large",
    "Titan": "large",
    "Frontier": "medium"
  },
  "Pagani": "small",
  "Polestar": {
    "1": "small",
    "2": "small",
    "3": "medium"
  },
  "Porsche": {
    "718": "small",
    "911": "small", // Example from user
    "Panamera": "medium",
    "Macan": "medium",
    "Cayenne": "large",
    "Taycan": "small"
  },
  "Ram": {
    "1500": "large",
    "2500": "large", 
    "3500": "large",
    "ProMaster": "large"
  },
  "Rolls Royce": "large",
  "Subaru": {
    "Impreza": "small",
    "Legacy": "medium",
    "Outback": "medium",
    "Forester": "medium",
    "Crosstrek": "medium",
    "Ascent": "large",
    "WRX": "small",
    "BRZ": "small"
  },
  "Tesla": {
    "Model 3": "small",
    "Model S": "medium",
    "Model X": "large",
    "Model Y": "medium",
    "Cybertruck": "large"
  },
  "Toyota": {
    "Yaris": "small",
    "Corolla": "small",
    "Camry": "medium",
    "Avalon": "medium",
    "Prius": "small",
    "86": "small",
    "Supra": "small",
    "C-HR": "small",
    "RAV4": "medium",
    "Venza": "medium",
    "Highlander": "large",
    "4Runner": "medium",
    "Sequoia": "large",
    "Land Cruiser": "large",
    "Sienna": "large",
    "Tacoma": "medium",
    "Tundra": "large"
  },
  "Volkswagen": {
    "Jetta": "small",
    "Passat": "medium",
    "Arteon": "medium",
    "Golf": "small",
    "Tiguan": "medium", // Example from user
    "Atlas": "large",
    "ID.4": "medium"
  },
  "Volvo": {
    "S60": "small",
    "S90": "medium",
    "V60": "small",
    "V90": "medium",
    "XC40": "medium",
    "XC60": "medium",
    "XC90": "large"
  },
  "Other": "medium" // Default fallback
};

export function detectVehicleSize(make: string, model: string): VehicleSize {
  // Get the make data
  const makeData = VEHICLE_SIZE_DATABASE[make];
  
  if (!makeData) {
    // Unknown make, return medium as default
    return "medium";
  }
  
  // If makeData is a string, it's a default size for the entire make
  if (typeof makeData === "string") {
    return makeData;
  }
  
  // If makeData is an object, look up the specific model
  const modelSize = makeData[model];
  
  if (modelSize) {
    return modelSize;
  }
  
  // Model not found, try to infer from make patterns
  if (["Ferrari", "Lamborghini", "McLaren", "Porsche", "Lotus", "Alfa Romeo"].includes(make)) {
    return "small"; // Sports cars are typically small
  }
  
  if (["Ram", "GMC", "Chevrolet"].includes(make) && (model.includes("1500") || model.includes("2500") || model.includes("3500"))) {
    return "large"; // Pickup trucks
  }
  
  // Default fallback
  return "medium";
}

export function getVehicleSizeFromStorage(): VehicleSize {
  try {
    const vehicleData = localStorage.getItem("userVehicle");
    if (vehicleData) {
      const vehicle = JSON.parse(vehicleData);
      if (vehicle.make && vehicle.model) {
        return detectVehicleSize(vehicle.make, vehicle.model);
      }
    }
  } catch (error) {
    console.error("Error reading vehicle data from storage:", error);
  }
  
  return "medium"; // Default fallback
}