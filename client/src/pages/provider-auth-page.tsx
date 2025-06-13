import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Redirect, Link } from "wouter";
import { z } from "zod";
import { ArrowLeft, Car, Users, TrendingUp } from "lucide-react";

const providerFormSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string().min(2),
  isProvider: z.boolean().default(true),
});

export default function ProviderAuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<z.infer<typeof providerFormSchema>>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      username: "",
      password: "",
      isProvider: true,
    },
  });

  const registerForm = useForm<z.infer<typeof providerFormSchema>>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      isProvider: true,
    },
  });

  if (user) {
    return <Redirect to={user.isProvider ? "/provider" : "/"} />;
  }

  const onLogin = (data: z.infer<typeof providerFormSchema>) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: z.infer<typeof providerFormSchema>) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6">
          <Link href="/auth">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customer Login
            </Button>
          </Link>
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Detail Pro Portal</h1>
            <p className="text-muted-foreground">
              Join our team of professional car care specialists
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Get Started</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Join Team</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Signing In..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Choose a username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a secure password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Join Our Team"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="hidden lg:block bg-gradient-to-br from-primary/20 to-primary/5 p-8">
        <div className="h-full flex flex-col justify-center max-w-xl mx-auto">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/assets/img/dapper-logo.png" 
              alt="Dapper Logo" 
              className="h-24"
            />
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Become a Detail Pro</h2>
            <p className="text-lg text-muted-foreground">
              Join the premier car care team and build your career with flexible scheduling and competitive pay.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Car className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Professional Equipment</h3>
                <p className="text-sm text-muted-foreground">
                  Access to industry-leading tools and premium products for every service.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Competitive Earnings</h3>
                <p className="text-sm text-muted-foreground">
                  Earn competitive rates with performance bonuses and flexible scheduling.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Growing Community</h3>
                <p className="text-sm text-muted-foreground">
                  Join a supportive team of professionals dedicated to exceptional service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}