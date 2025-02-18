import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import ProviderCard from "@/components/provider-card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import MapComponent from "@/components/google-map";

export default function HomePage() {
  const { user } = useAuth();
  const { data: providers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/providers"],
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Available Service Providers</h1>
        <Link href="/profile">
          <Button variant="outline">Profile</Button>
        </Link>
      </div>

      <div className="mb-8">
        <MapComponent providers={providers} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {providers?.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>
    </div>
  );
}