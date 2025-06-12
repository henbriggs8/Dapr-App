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

  const isFormValid = year && make && model && color;

  return (
    <div className="min-h-screen bg-white px-4 pt-12 pb-8">
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
            <Select onValueChange={setMake} value={make}>
              <SelectTrigger className="h-14 border-gray-300 focus:ring-[#8c52ff] focus:border-transparent">
                <SelectValue placeholder="Toyota" />
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
          <Input
            id="model"
            type="text"
            placeholder="Camry"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-14 px-4 text-base border-gray-300 focus:ring-[#8c52ff] focus:border-transparent"
          />
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

        {/* Add Another Vehicle Option */}
        <div className="pt-2">
          <button
            onClick={() => {
              // For now, just show a message that this feature is coming soon
              alert("Multiple vehicles support coming soon!");
            }}
            className="w-full flex items-center justify-center gap-2 h-12 text-[#8c52ff] font-medium border border-[#8c52ff] rounded-lg hover:bg-[#8c52ff]/5"
          >
            <Plus className="h-5 w-5" />
            Add Another Vehicle
          </button>
        </div>
      </motion.div>
    </div>
  );
}