import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PricingConfig, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { LogOut } from "lucide-react";

const pricingSchema = z.object({
  basic: z.coerce.number().min(1),
  standard: z.coerce.number().min(1),
  premium: z.coerce.number().min(1),
});

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  // Redirect non-admin users
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: pricing } = useQuery<PricingConfig>({
    queryKey: ["/api/pricing"],
  });

  const form = useForm<z.infer<typeof pricingSchema>>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      basic: pricing?.basic,
      standard: pricing?.standard,
      premium: pricing?.premium,
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof pricingSchema>) => {
      const res = await apiRequest("PATCH", "/api/admin/pricing", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      toast({
        title: "Pricing updated",
        description: "The pricing configuration has been updated successfully",
      });
    },
  });

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "isProvider",
      header: "Provider",
      cell: ({ row }) => (row.original.isProvider ? "Yes" : "No"),
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => row.original.rating?.toFixed(1) || "N/A",
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-8">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Admin Dashboard</CardTitle>
          <Button 
            variant="outline"
            size="sm"
            className="text-red-500 hover:bg-red-50"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-1" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </Button>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pricing">
        <TabsList>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Manage Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) =>
                    updatePricingMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="basic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Basic Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="standard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Standard Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="premium"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Premium Price ($)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={updatePricingMutation.isPending}
                  >
                    Update Pricing
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {users && <DataTable columns={columns} data={users} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}