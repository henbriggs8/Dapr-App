// Test the vehicle size detection system with the user's examples
import { detectVehicleSize } from './vehicle-size-detector';

// Test cases from user examples
const testCases = [
  { make: "Chevrolet", model: "Tahoe", expected: "large" },
  { make: "Audi", model: "A7", expected: "small" }, // RS7 variant
  { make: "Ford", model: "F-150", expected: "large" }, // Truck example
  { make: "Volkswagen", model: "Tiguan", expected: "medium" },
  { make: "Porsche", model: "911", expected: "small" }
];

export function testVehicleDetection() {
  console.log("Testing vehicle size detection system:");
  
  testCases.forEach(({ make, model, expected }) => {
    const detected = detectVehicleSize(make, model);
    const status = detected === expected ? "✓ PASS" : "✗ FAIL";
    console.log(`${status} ${make} ${model}: detected=${detected}, expected=${expected}`);
  });
}

// Run tests in development
if (process.env.NODE_ENV === 'development') {
  testVehicleDetection();
}