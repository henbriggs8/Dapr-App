import { CarWashSpinner } from "@/components/car-wash-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";

export default function SpinnerDemo() {
  const { toast } = useToast();
  const [showText, setShowText] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const startLoadingDemo = () => {
    setLoadingDemo(true);
    toast({
      title: "Loading Demo Started",
      description: "The spinner will automatically stop after 3 seconds",
    });
    setTimeout(() => {
      setLoadingDemo(false);
      toast({
        title: "Loading Complete!",
        description: "Demo loading process has finished",
        variant: "default",
      });
    }, 3000);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Car Wash Spinner Demo</h1>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>

      {loadingDemo ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <CarWashSpinner size="lg" showText={showText} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Small Spinner</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CarWashSpinner size="sm" showText={showText} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medium Spinner</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CarWashSpinner size="md" showText={showText} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Large Spinner</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CarWashSpinner size="lg" showText={showText} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Text</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CarWashSpinner 
                size="md" 
                showText={showText} 
                text="Washing your car..." 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Background</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center bg-blue-50 rounded-lg p-6">
              <CarWashSpinner size="md" showText={showText} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interactive Demo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch 
                  id="show-text-mode" 
                  checked={showText}
                  onCheckedChange={setShowText}
                />
                <Label htmlFor="show-text-mode">Show Text</Label>
              </div>
              <Button onClick={startLoadingDemo}>
                Start Loading Demo
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-md">
            <pre className="text-sm">
              {`// Basic usage
<CarWashSpinner />

// Different sizes
<CarWashSpinner size="sm" />
<CarWashSpinner size="md" />
<CarWashSpinner size="lg" />

// Customizing text
<CarWashSpinner text="Processing payment..." />
<CarWashSpinner showText={false} /> // No text

// With custom className
<CarWashSpinner className="my-custom-class" />`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}