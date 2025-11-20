import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Car, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i);

const CAR_MAKES = [
  "Acura", "Alfa Romeo", "Aston Martin", "Audi", "Bentley", "BMW", "Bugatti", "Buick", 
  "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ferrari", "Fiat", "Ford", "Genesis", 
  "GMC", "Honda", "Hyundai", "Infiniti", "Jaguar", "Jeep", "Kia", "Koenigsegg", 
  "Lamborghini", "Land Rover", "Lexus", "Lincoln", "Lotus", "Maserati", "Mazda", 
  "McLaren", "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Pagani", "Polestar", 
  "Porsche", "Ram", "Rolls Royce", "Subaru", "Tesla", "Toyota", "Volkswagen", 
  "Volvo", "Other"
];

const CAR_MODELS: { [key: string]: string[] } = {
  "Acura": ["ILX", "TLX", "RLX", "MDX", "RDX", "NSX"],
  "Alfa Romeo": ["Giulia", "Stelvio", "4C", "Tonale"],
  "Aston Martin": ["DB11", "Vantage", "DBS", "DBX"],
  "Audi": ["A3", "A4", "A5", "A6", "A7", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron", "R8", "TT"],
  "Bentley": ["Continental", "Flying Spur", "Bentayga", "Mulsanne"],
  "BMW": ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "8 Series", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4", "i3", "i4", "iX"],
  "Bugatti": ["Chiron", "Veyron", "Divo"],
  "Buick": ["Encore", "Envision", "Enclave"],
  "Cadillac": ["ATS", "CTS", "CT4", "CT5", "CT6", "XT4", "XT5", "XT6", "Escalade"],
  "Chevrolet": ["Spark", "Sonic", "Cruze", "Malibu", "Impala", "Camaro", "Corvette", "Trax", "Equinox", "Traverse", "Tahoe", "Suburban", "Silverado", "Colorado"],
  "Chrysler": ["300", "Pacifica"],
  "Dodge": ["Charger", "Challenger", "Durango", "Journey"],
  "Ferrari": ["488", "F8", "SF90", "Roma", "Portofino", "812", "LaFerrari"],
  "Fiat": ["500", "500X", "124 Spider"],
  "Ford": ["Fiesta", "Focus", "Fusion", "Mustang", "EcoSport", "Escape", "Edge", "Explorer", "Expedition", "F-150", "Super Duty", "Ranger"],
  "Genesis": ["G70", "G80", "G90", "GV60", "GV70", "GV80"],
  "GMC": ["Terrain", "Acadia", "Yukon", "Sierra", "Canyon"],
  "Honda": ["Fit", "Civic", "Accord", "Insight", "CR-V", "Passport", "Pilot", "Ridgeline"],
  "Hyundai": ["Accent", "Elantra", "Sonata", "Venue", "Kona", "Tucson", "Santa Fe", "Palisade"],
  "Infiniti": ["Q50", "Q60", "Q70", "QX30", "QX50", "QX60", "QX80"],
  "Jaguar": ["XE", "XF", "XJ", "F-Type", "E-Pace", "F-Pace", "I-Pace"],
  "Jeep": ["Compass", "Cherokee", "Grand Cherokee", "Wrangler", "Gladiator"],
  "Kia": ["Rio", "Forte", "Optima", "Stinger", "Soul", "Seltos", "Sportage", "Sorento", "Telluride"],
  "Koenigsegg": ["Regera", "Jesko", "Gemera"],
  "Lamborghini": ["Huracan", "Aventador", "Urus"],
  "Land Rover": ["Range Rover Evoque", "Range Rover Velar", "Range Rover Sport", "Range Rover", "Discovery Sport", "Discovery", "Defender"],
  "Lexus": ["IS", "ES", "GS", "LS", "RC", "LC", "UX", "NX", "RX", "GX", "LX"],
  "Lincoln": ["MKZ", "Continental", "Corsair", "Nautilus", "Aviator", "Navigator"],
  "Lotus": ["Evija", "Emira", "Evora"],
  "Maserati": ["Ghibli", "Quattroporte", "Levante", "MC20"],
  "Mazda": ["Mazda3", "Mazda6", "CX-3", "CX-30", "CX-5", "CX-9", "MX-5 Miata"],
  "McLaren": ["570S", "720S", "765LT", "Artura"],
  "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "SL", "AMG GT"],
  "Mini": ["Cooper", "Countryman", "Clubman"],
  "Mitsubishi": ["Mirage", "Lancer", "Eclipse Cross", "Outlander"],
  "Nissan": ["Versa", "Sentra", "Altima", "Maxima", "370Z", "GT-R", "Kicks", "Rogue", "Murano", "Pathfinder", "Armada", "Titan", "Frontier"],
  "Pagani": ["Huayra", "Zonda"],
  "Polestar": ["1", "2", "3"],
  "Porsche": ["718", "911", "Panamera", "Macan", "Cayenne", "Taycan"],
  "Ram": ["1500", "2500", "3500", "ProMaster"],
  "Rolls Royce": ["Ghost", "Wraith", "Dawn", "Phantom", "Cullinan"],
  "Subaru": ["Impreza", "Legacy", "Outback", "Forester", "Crosstrek", "Ascent", "WRX", "BRZ"],
  "Tesla": ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck"],
  "Toyota": ["Yaris", "Corolla", "Camry", "Avalon", "Prius", "86", "Supra", "C-HR", "RAV4", "Venza", "Highlander", "4Runner", "Sequoia", "Land Cruiser", "Sienna", "Tacoma", "Tundra"],
  "Volkswagen": ["Jetta", "Passat", "Arteon", "Golf", "Tiguan", "Atlas", "ID.4"],
  "Volvo": ["S60", "S90", "V60", "V90", "XC40", "XC60", "XC90"],
  "Other": ["Custom", "Kit Car", "Classic", "Modified"]
};

const CAR_COLORS = [
  "Black", "White", "Silver", "Gray", "Red", "Blue", "Green", "Brown",
  "Gold", "Orange", "Yellow", "Purple", "Pink", "Tan", "Maroon", "Other"
];

export default function CarProfileScreen() {
  const [, setLocation] = useLocation();
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  // Get available models for the selected make
  const availableModels = make && CAR_MODELS[make] ? CAR_MODELS[make] : [];

  // Handle make selection and clear model when make changes
  const handleMakeChange = (selectedMake: string) => {
    setMake(selectedMake);
    setModel(""); // Clear model when make changes
  };

  const handleSaveVehicle = () => {
    // Save vehicle data to localStorage for now
    const vehicleData = {
      year,
      make,
      model,
      color
    };
    localStorage.setItem("userVehicle", JSON.stringify(vehicleData));
    
    // Navigate to first wash offer screen
    setLocation("/onboarding/first-wash-offer");
  };

  const handleSkipVehicle = () => {
    // Set a flag that user doesn't have a vehicle yet
    localStorage.setItem("skipVehicle", "true");
    
    // Navigate to first wash offer screen
    setLocation("/onboarding/first-wash-offer");
  };

  const isFormValid = year && make && model && color;

  return (
    <div className="min-h-screen bg-white px-4 pt-12" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom) + 20px)' }}>
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => setLocation("/onboarding/address")}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 ml-4">
          Vehicle Info
        </h1>
      </div>

      {/* Icon and Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#8c52ff]/10 rounded-full mb-4">
          <Car className="h-8 w-8 text-[#8c52ff]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tell us about your vehicle
        </h2>
        <p className="text-gray-600 text-base">
          This helps us provide the best service for your car
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        {/* Year and Make */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="year" className="text-sm font-medium text-gray-700">
              Year
            </Label>
            <Select onValueChange={setYear} value={year}>
              <SelectTrigger className="h-14 border-gray-300 focus:ring-[#8c52ff] focus:border-transparent">
                <SelectValue placeholder="2024" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((yearOption) => (
                  <SelectItem key={yearOption} value={yearOption.toString()}>
                    {yearOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="make" className="text-sm font-medium text-gray-700">
              Make
            </Label>
            <Select onValueChange={handleMakeChange} value={make}>
              <SelectTrigger className="h-14 border-gray-300 focus:ring-[#8c52ff] focus:border-transparent">
                <SelectValue placeholder="Select make" />
              </SelectTrigger>
              <SelectContent>
                {CAR_MAKES.map((makeOption) => (
                  <SelectItem key={makeOption} value={makeOption}>
                    {makeOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <Label htmlFor="model" className="text-sm font-medium text-gray-700">
            Model
          </Label>
          <Select onValueChange={setModel} value={model} disabled={!make || availableModels.length === 0}>
            <SelectTrigger className="h-14 border-gray-300 focus:ring-[#8c52ff] focus:border-transparent">
              <SelectValue placeholder={make ? "Select model" : "Select make first"} />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((modelOption) => (
                <SelectItem key={modelOption} value={modelOption}>
                  {modelOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color */}
        <div className="space-y-2">
          <Label htmlFor="color" className="text-sm font-medium text-gray-700">
            Color
          </Label>
          <Select onValueChange={setColor} value={color}>
            <SelectTrigger className="h-14 border-gray-300 focus:ring-[#8c52ff] focus:border-transparent">
              <SelectValue placeholder="Select color" />
            </SelectTrigger>
            <SelectContent>
              {CAR_COLORS.map((colorOption) => (
                <SelectItem key={colorOption} value={colorOption}>
                  {colorOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save Vehicle Button */}
        <div className="pt-4">
          <Button
            onClick={handleSaveVehicle}
            disabled={!isFormValid}
            className="w-full h-14 text-base font-semibold bg-[#8c52ff] hover:bg-[#7c47eb] disabled:bg-gray-300 disabled:text-gray-500 rounded-lg"
          >
            Save Vehicle
          </Button>
        </div>

        {/* Skip Vehicle Option */}
        <div className="pt-2">
          <button
            onClick={handleSkipVehicle}
            className="w-full h-12 text-gray-600 font-medium hover:bg-gray-50 rounded-lg border border-gray-300"
          >
            I don't have a vehicle yet
          </button>
        </div>
      </motion.div>
    </div>
  );
}