import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Booking, PricingConfig, ContactMessage, ProviderApplication } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Redirect } from "wouter";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { 
  LogOut, 
  Users, 
  Calendar, 
  DollarSign, 
  BarChart3, 
  Search, 
  Filter,
  Eye,
  UserX,
  UserCheck,
  MoreHorizontal,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Radio,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  RefreshCw,
  Car,
  Tag,
  MessageSquare,
  Phone,
  Mail,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronUp,
  UserCircle,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";

function relativeTime(ts: string | undefined): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Enhanced types for admin dashboard
interface AdminBooking extends Booking {
  customerName?: string;
  providerName?: string;
  serviceName?: string;
}

interface EarningsData {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  todayRevenue: number;
  averageBookingValue: number;
  totalBookings: number;
}

interface AnalyticsData {
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  userGrowth: {
    totalUsers: number;
    newUsersThisMonth: number;
    totalProviders: number;
    activeProviders: number;
  };
  topServices: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  topProviders: Array<{
    id: number;
    name: string;
    completedJobs: number;
    revenue: number;
    rating: number;
  }>;
}

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supportFilter, setSupportFilter] = useState<"open" | "all" | "resolved">("open");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [expandedAppId, setExpandedAppId] = useState<number | null>(null);

  // Role-based access check
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return await res.json();
    },
  });

  // Fetch all bookings (auto-refresh for dispatch)
  const { data: bookings = [], isLoading: bookingsLoading, dataUpdatedAt: bookingsUpdatedAt } = useQuery<AdminBooking[]>({
    queryKey: ["/api/admin/bookings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/bookings");
      return await res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch provider status (auto-refresh)
  const { data: providerStatus = { totalProviders: 0, onlineProviders: 0, onlineProvidersList: [], allProviders: [] } } = useQuery<any>({
    queryKey: ["/api/admin/provider-status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/provider-status");
      return await res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch passed (skipped) jobs
  const { data: passedJobs = [] } = useQuery<AdminBooking[]>({
    queryKey: ["/api/admin/passed-jobs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/passed-jobs");
      return await res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch earnings data
  const { data: earnings } = useQuery<EarningsData>({
    queryKey: ["/api/admin/earnings"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/earnings");
      return await res.json();
    },
  });

  // Fetch analytics data
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/analytics");
      return await res.json();
    },
  });

  // Fetch provider applications
  const { data: providerApplications = [], isLoading: appsLoading } = useQuery<ProviderApplication[]>({
    queryKey: ["/api/admin/provider-applications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/provider-applications");
      return res.json();
    },
  });

  const updateApplicationStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/provider-applications/${id}/status`, { status, internalReviewNotes: notes });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || "Failed to update status"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/provider-applications"] });
      toast({ title: "Application status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Fetch contact messages
  const { data: contactMessages = [], isLoading: messagesLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/admin/contact-messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/contact-messages");
      return await res.json();
    },
  });

  // Resolve contact message mutation
  const resolveMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/contact-messages/${id}/resolve`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-messages"] });
      toast({ title: "Message marked as resolved" });
    },
    onError: () => {
      toast({ title: "Failed to resolve message", variant: "destructive" });
    },
  });

  // Reopen contact message mutation
  const reopenMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/contact-messages/${id}/reopen`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-messages"] });
      toast({ title: "Message reopened" });
    },
    onError: () => {
      toast({ title: "Failed to reopen message", variant: "destructive" });
    },
  });

  // User management mutations
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: number; action: 'activate' | 'deactivate' }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/status`, { action });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User status updated",
        description: "User status has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Booking management mutations
  const reassignBookingMutation = useMutation({
    mutationFn: async ({ bookingId, providerId }: { bookingId: number; providerId: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/bookings/${bookingId}/reassign`, { providerId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({
        title: "Booking reassigned",
        description: "Booking has been successfully reassigned",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reassign booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await apiRequest("PATCH", `/api/admin/bookings/${bookingId}/cancel`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({
        title: "Booking cancelled",
        description: "Booking has been successfully cancelled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Pricing state and mutation
  const { data: pricingData } = useQuery<PricingConfig>({
    queryKey: ["/api/pricing"],
  });
  const [pricingForm, setPricingForm] = useState({ basic: "", interior: "", standard: "", premium: "" });

  // Computed: filtered applications
  const filteredApps = appStatusFilter === "all"
    ? providerApplications
    : providerApplications.filter(a => a.applicationStatus === appStatusFilter);

  const ALLOWED_ADMIN_TRANSITIONS: Record<string, string[]> = {
    submitted:              ["under_review"],
    under_review:           ["verification_requested", "approved_needs_setup", "rejected"],
    verification_requested: ["verification_submitted"],
    verification_submitted: ["approved_needs_setup", "rejected"],
  };

  const APP_STATUS_LABELS: Record<string, string> = {
    draft: "Draft", submitted: "Submitted", under_review: "Under Review",
    verification_requested: "Verification Requested", verification_submitted: "Verification Submitted",
    approved_needs_setup: "Approved", rejected: "Rejected",
    active_provider: "Active Provider", withdrawn: "Withdrawn",
  };

  const APP_STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-500",
    submitted: "bg-blue-100 text-blue-700",
    under_review: "bg-amber-100 text-amber-700",
    verification_requested: "bg-orange-100 text-orange-700",
    verification_submitted: "bg-yellow-100 text-yellow-700",
    approved_needs_setup: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    active_provider: "bg-[#f3eeff] text-[#8c52ff]",
    withdrawn: "bg-gray-100 text-gray-400",
  };

  interface ApplicationRowProps {
    app: ProviderApplication;
    onStatusChange: (status: string, notes?: string) => void;
    isUpdating: boolean;
  }
  function ApplicationRow({ app, onStatusChange, isUpdating }: ApplicationRowProps) {
    const [reviewNotes, setReviewNotes] = useState(app.internalReviewNotes || "");
    const isExpanded = expandedAppId === app.id;
    const allowed = ALLOWED_ADMIN_TRANSITIONS[app.applicationStatus] ?? [];
    const expLabels: Record<string, string> = {
      newToDetailing: "New to detailing", someExperience: "Some experience",
      experienced: "Experienced", professional: "Professional",
    };
    return (
      <div className={`border rounded-xl overflow-hidden transition-all ${isExpanded ? "border-[#8c52ff]/40 shadow-sm" : "border-gray-100"}`}>
        {/* Row header */}
        <button
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
          onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#8c52ff]/10 flex items-center justify-center shrink-0 text-[#8c52ff] text-xs font-bold">
              {(app.fullName || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{app.fullName || "—"}</p>
              <p className="text-xs text-gray-400 truncate">{app.email} · {app.city}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${APP_STATUS_COLORS[app.applicationStatus] || "bg-gray-100 text-gray-500"}`}>
              {APP_STATUS_LABELS[app.applicationStatus] || app.applicationStatus}
            </span>
            <span className="text-xs text-gray-400 hidden sm:inline">
              {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Draft"}
            </span>
            <Icon icon={isExpanded ? ChevronUp : ChevronDown} size="sm" className="text-gray-400" />
          </div>
        </button>

        {/* Expanded detail */}
        {isExpanded && (
          <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/60 space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {[
                { label: "Phone", value: app.phoneNumber },
                { label: "ZIP", value: app.zipCode },
                { label: "Experience", value: expLabels[app.experienceLevel || ""] || app.experienceLevel },
                { label: "Years detailing", value: app.yearsDetailing?.toString() },
                { label: "Vehicle", value: app.vehicleType ? `${app.vehicleType} — ${app.vehicleDescription}` : null },
                { label: "Travel radius", value: app.maxTravelRadius ? `${app.maxTravelRadius} mi` : null },
                { label: "Availability", value: [app.availableWeekdays && "Weekdays", app.availableWeekends && "Weekends"].filter(Boolean).join(", ") || null },
                { label: "App #", value: `#${app.id}` },
              ].filter(r => r.value).map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-sm text-gray-800">{value}</p>
                </div>
              ))}
            </div>

            {app.notes && (
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700 bg-white rounded-lg px-3 py-2 border border-gray-100">{app.notes}</p>
              </div>
            )}

            {/* Internal review notes */}
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide block mb-1">Internal notes (admin only)</label>
              <textarea
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Add internal review notes…"
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-[#8c52ff]"
              />
            </div>

            {/* Status transition buttons */}
            {allowed.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allowed.map(targetStatus => {
                  const isApprove = targetStatus === "approved_needs_setup";
                  const isReject = targetStatus === "rejected";
                  return (
                    <button
                      key={targetStatus}
                      disabled={isUpdating}
                      onClick={() => onStatusChange(targetStatus, reviewNotes)}
                      className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-60 ${
                        isApprove ? "bg-green-600 text-white hover:bg-green-700" :
                        isReject ? "bg-red-600 text-white hover:bg-red-700" :
                        "bg-[#8c52ff] text-white hover:bg-[#7a3fff]"
                      }`}
                    >
                      → {APP_STATUS_LABELS[targetStatus] || targetStatus}
                    </button>
                  );
                })}
              </div>
            )}
            {allowed.length === 0 && (
              <p className="text-xs text-gray-400 italic">No transitions available from this status.</p>
            )}
          </div>
        )}
      </div>
    );
  }
  useEffect(() => {
    if (pricingData) {
      setPricingForm({
        basic: String(pricingData.basic),
        interior: String(pricingData.interior),
        standard: String(pricingData.standard),
        premium: String(pricingData.premium),
      });
    }
  }, [pricingData]);
  const updatePricingMutation = useMutation({
    mutationFn: async (values: { basic: number; interior: number; standard: number; premium: number }) => {
      const res = await apiRequest("PATCH", "/api/admin/pricing", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      toast({ title: "Prices updated", description: "All four tier prices have been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update prices", description: error.message, variant: "destructive" });
    },
  });

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || 
                       (roleFilter === "provider" && user.isProvider) ||
                       (roleFilter === "customer" && !user.isProvider && !user.isAdmin) ||
                       (roleFilter === "admin" && user.isAdmin);
    
    const matchesStatus = statusFilter === "all" ||
                         (statusFilter === "active" && user.currentStatus !== "inactive") ||
                         (statusFilter === "inactive" && user.currentStatus === "inactive");
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Users table columns
  const userColumns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium"
        >
          Name
          <Icon icon={ArrowUpDown} size="sm" className="ml-2" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name || row.original.username}</div>
          <div className="text-sm text-gray-500">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const user = row.original;
        if (user.isAdmin) return <Badge variant="destructive">Admin</Badge>;
        if (user.isProvider) return <Badge variant="default">Detail Pro</Badge>;
        return <Badge variant="secondary">Customer</Badge>;
      },
    },
    {
      accessorKey: "currentStatus",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.currentStatus;
        const variant = status === "online" ? "default" : status === "offline" ? "secondary" : "outline";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || "Not provided",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        const isActive = user.currentStatus !== "inactive";
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <Icon icon={MoreHorizontal} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Icon icon={Eye} size="sm" className="mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toggleUserStatusMutation.mutate({
                  userId: user.id,
                  action: isActive ? 'deactivate' : 'activate'
                })}
              >
                {isActive ? (
                  <>
                    <Icon icon={UserX} size="sm" className="mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Icon icon={UserCheck} size="sm" className="mr-2" />
                    Reactivate
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Bookings table columns
  const bookingColumns: ColumnDef<AdminBooking>[] = [
    {
      accessorKey: "bookingRef",
      header: "Ref",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-[#8c52ff] font-medium">
          {(row.original as any).bookingRef || `#${row.original.id}`}
        </span>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => row.original.customerName || "Unknown Customer",
    },
    {
      accessorKey: "providerName",
      header: "Assigned Pro",
      cell: ({ row }) => row.original.providerName || "Unassigned",
    },
    {
      accessorKey: "serviceName",
      header: "Service",
      cell: ({ row }) => row.original.serviceName || "Unknown Service",
    },
    {
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const booking = row.original;
        return (
          <div>
            <div className="font-medium">{booking.date || "No date"}</div>
            <div className="text-sm text-gray-500">{booking.time || "No time"}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "serviceLocation",
      header: "Location",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.original.serviceLocation || "Not specified"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const variant = status === "completed" ? "default" : 
                       status === "cancelled" ? "destructive" : 
                       status === "in_progress" ? "secondary" : "outline";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const booking = row.original;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <Icon icon={MoreHorizontal} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Icon icon={Eye} size="sm" className="mr-2" />
                View Details
              </DropdownMenuItem>
              {booking.status === "pending" && (
                <DropdownMenuItem
                  onClick={() => {
                    // This would open a provider selection dialog
                    toast({
                      title: "Reassign booking",
                      description: "Reassignment feature would open here",
                    });
                  }}
                >
                  <Icon icon={Users} size="sm" className="mr-2" />
                  Reassign
                </DropdownMenuItem>
              )}
              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <DropdownMenuItem
                  onClick={() => cancelBookingMutation.mutate(booking.id)}
                  className="text-red-600"
                >
                  <Icon icon={UserX} size="sm" className="mr-2" />
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Error handling is done in the mutation's onError callback
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Manage users, bookings, and analytics</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Icon icon={UserCircle} size="sm" />
                  <span className="hidden sm:inline max-w-[140px] truncate">{user?.email ?? user?.username ?? "Admin"}</span>
                  <Icon icon={ChevronDown} size="xs" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-xs text-gray-500 truncate">{user?.email ?? user?.username}</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">Administrator</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600">
                  <Icon icon={LogOut} size="sm" className="mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="dispatch" className="space-y-4">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-8 h-auto">
              <TabsTrigger value="dispatch" className="flex items-center gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
                <Icon icon={Radio} size="sm" />
                Dispatch
              </TabsTrigger>
              <TabsTrigger value="applications" className="flex items-center gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
                <Icon icon={FileText} size="sm" />
                Applications
                {providerApplications.filter(a => a.applicationStatus === "submitted").length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                    {providerApplications.filter(a => a.applicationStatus === "submitted").length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
                <Icon icon={Users} size="sm" />
                Users
              </TabsTrigger>
              <TabsTrigger value="bookings" className="flex items-center gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
                <Icon icon={Calendar} size="sm" />
                Bookings
              </TabsTrigger>
              <TabsTrigger value="earnings" className="flex items-center gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
                <Icon icon={DollarSign} size="sm" />
                Earnings
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
                <Icon icon={BarChart3} size="sm" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
                <Icon icon={Tag} size="sm" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="support" className="flex items-center gap-1 text-xs px-2 py-1.5 whitespace-nowrap">
                <Icon icon={MessageSquare} size="sm" />
                Support
                {contactMessages.filter(m => !m.resolved).length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                    {contactMessages.filter(m => !m.resolved).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dispatch Tab */}
          <TabsContent value="dispatch" className="space-y-4">
            {/* Live Stats Bar */}
            {(() => {
              const unassigned = bookings.filter(b => b.status === "pending" && !b.providerId);
              const active = bookings.filter(b => b.status === "in_progress" || b.status === "accepted");
              const onlineProviders = providerStatus.onlineProvidersList ?? [];
              const todayCompleted = bookings.filter(b => {
                const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
                return b.status === "completed" && b.date === today;
              });

              return (
                <>
                  <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                    <div className="flex gap-2 sm:grid sm:grid-cols-5 sm:gap-4" style={{ minWidth: 'max-content' }}>
                    <Card className="border-red-100 bg-red-50 w-[120px] sm:w-auto shrink-0">
                      <CardContent className="pt-3 pb-2 px-3">
                        <p className="text-[10px] font-medium text-red-600 uppercase tracking-wide">Unassigned</p>
                        <p className="text-2xl font-bold text-red-700">{unassigned.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-100 bg-blue-50 w-[120px] sm:w-auto shrink-0">
                      <CardContent className="pt-3 pb-2 px-3">
                        <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">Active Jobs</p>
                        <p className="text-2xl font-bold text-blue-700">{active.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-orange-100 bg-orange-50 w-[120px] sm:w-auto shrink-0">
                      <CardContent className="pt-3 pb-2 px-3">
                        <p className="text-[10px] font-medium text-orange-600 uppercase tracking-wide">Needs Reassignment</p>
                        <p className="text-2xl font-bold text-orange-700">{passedJobs.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-green-100 bg-green-50 w-[120px] sm:w-auto shrink-0">
                      <CardContent className="pt-3 pb-2 px-3">
                        <p className="text-[10px] font-medium text-green-600 uppercase tracking-wide">Pros Online</p>
                        <p className="text-2xl font-bold text-green-700">{onlineProviders.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="w-[120px] sm:w-auto shrink-0">
                      <CardContent className="pt-3 pb-2 px-3">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Done Today</p>
                        <p className="text-2xl font-bold text-gray-800">{todayCompleted.length}</p>
                      </CardContent>
                    </Card>
                    </div>
                  </div>

                  {/* Auto-refresh indicator */}
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Icon icon={RefreshCw} size="xs" />
                    Auto-refreshing every 15s · Last updated {new Date(bookingsUpdatedAt).toLocaleTimeString()}
                  </div>

                  {/* Main dispatch layout */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    {/* Job Queue — 2/3 */}
                    <div className="md:col-span-2 space-y-4">
                      {/* Unassigned Jobs */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Icon icon={AlertCircle} size="sm" className="text-red-500" />
                            Needs Assignment
                            {unassigned.length > 0 && (
                              <Badge variant="destructive" className="ml-1">{unassigned.length}</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {unassigned.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">All jobs are assigned</p>
                          ) : unassigned.map((job) => (
                            <div key={job.id} className="flex items-start justify-between p-3 rounded-lg border border-red-100 bg-red-50/40">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">#{job.id} — {job.serviceName || job.priceTier}</span>
                                  <Badge variant="outline" className="text-xs">${job.totalPrice}</Badge>
                                </div>
                                <p className="text-xs text-gray-600 flex items-center gap-1">
                                  <Icon icon={MapPin} size="xs" /> {job.serviceLocation || "Address not set"}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Icon icon={Clock} size="xs" /> {job.date ? `${job.date} ${job.time ?? ""}`.trim() : "ASAP"}
                                </p>
                                <p className="text-xs text-gray-500">Customer: {job.customerName || `User #${job.userId}`}</p>
                              </div>
                              <div className="ml-3 min-w-[160px]">
                                <Select
                                  onValueChange={(providerId) => {
                                    reassignBookingMutation.mutate({ bookingId: job.id, providerId: parseInt(providerId) });
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Assign to pro…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {onlineProviders.length === 0 && (
                                      <SelectItem value="none" disabled>No pros online</SelectItem>
                                    )}
                                    {onlineProviders.map((p: any) => (
                                      <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Active Jobs */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Icon icon={Zap} size="sm" className="text-blue-500" />
                            In Progress
                            {active.length > 0 && (
                              <Badge className="ml-1 bg-blue-500">{active.length}</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {active.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">No jobs are currently in progress</p>
                          ) : active.map((job) => (
                            <div key={job.id} className="flex items-start justify-between p-3 rounded-lg border bg-blue-50/30">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">#{job.id} — {job.serviceName || job.priceTier}</span>
                                  <Badge className="text-xs bg-blue-500">
                                    {job.status === "in_progress" ? "Washing" : "Accepted"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 flex items-center gap-1">
                                  <Icon icon={MapPin} size="xs" /> {job.serviceLocation || "Address not set"}
                                </p>
                                <p className="text-xs text-gray-500">Customer: {job.customerName || `User #${job.userId}`}</p>
                                <p className="text-xs text-gray-500">Pro: {job.providerName || `Provider #${job.providerId}`}</p>
                              </div>
                              <div className="ml-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => cancelBookingMutation.mutate(job.id)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      {/* Needs Reassignment (previously Passed by Pros) */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Icon icon={RotateCcw} size="sm" className="text-orange-500" />
                            Passed by Pros
                            {passedJobs.length > 0 && (
                              <Badge className="ml-1 bg-orange-500">{passedJobs.length}</Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {passedJobs.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">No jobs need reassignment</p>
                          ) : passedJobs.map((job) => {
                            const passedCount = Array.isArray(job.previousProviders) ? (job.previousProviders as number[]).length : 0;
                            return (
                              <div key={job.id} className="flex items-start justify-between p-3 rounded-lg border border-orange-100 bg-orange-50/30">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm">#{job.id} — {job.serviceName || job.priceTier}</span>
                                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">${job.totalPrice}</Badge>
                                  </div>
                                  <p className="text-xs text-gray-600 flex items-center gap-1">
                                    <Icon icon={MapPin} size="xs" /> {job.serviceLocation || "Address not set"}
                                  </p>
                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Icon icon={Clock} size="xs" /> {job.date ? `${job.date} ${job.time ?? ""}`.trim() : "ASAP"}
                                  </p>
                                  <p className="text-xs text-orange-600 font-medium">
                                    Passed by {passedCount} pro{passedCount !== 1 ? "s" : ""}
                                  </p>
                                </div>
                                <div className="ml-3 min-w-[160px]">
                                  <Select
                                    onValueChange={(providerId) => {
                                      reassignBookingMutation.mutate({ bookingId: job.id, providerId: parseInt(providerId) });
                                    }}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Force assign…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {onlineProviders.length === 0 && (
                                        <SelectItem value="none" disabled>No pros online</SelectItem>
                                      )}
                                      {onlineProviders.map((p: any) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                          {p.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Provider Roster — 1/3 */}
                    <div className="col-span-1">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Icon icon={Car} size="sm" />
                            Detail Pros
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {(providerStatus.allProviders ?? []).length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No providers found</p>
                          ) : (
                            [...(providerStatus.allProviders ?? [])]
                              .sort((a: any, b: any) => {
                                const aJob = active.find((bk: any) => bk.providerId === a.id);
                                const bJob = active.find((bk: any) => bk.providerId === b.id);
                                const score = (p: any, job: any) => p.status === "online" && job ? 2 : p.status === "online" ? 1 : 0;
                                return score(b, bJob) - score(a, aJob);
                              })
                              .map((p: any) => {
                                const currentJob = active.find((b: any) => b.providerId === p.id);
                                const isOnline = p.status === "online";
                                const isBusy = isOnline && !!currentJob;
                                const dotColor = isBusy ? "bg-orange-400" : isOnline ? "bg-green-500" : "bg-gray-300";
                                const cardBg = isBusy
                                  ? "border-orange-100 bg-orange-50/40"
                                  : isOnline
                                  ? "border-green-100 bg-green-50/40"
                                  : "border-gray-100 bg-gray-50/40 opacity-60";
                                const displayName = p.name || p.username || `Pro #${p.id}`;
                                return (
                                  <div key={p.id} className={`p-3 rounded-lg border ${cardBg}`}>
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className={`h-2 w-2 rounded-full shrink-0 ${dotColor}`} />
                                        <span className="text-sm font-medium truncate">{displayName}</span>
                                      </div>
                                      <span className={`text-[10px] font-semibold uppercase tracking-wide shrink-0 ${isBusy ? "text-orange-500" : isOnline ? "text-green-600" : "text-gray-400"}`}>
                                        {isBusy ? "Busy" : isOnline ? "Online" : "Offline"}
                                      </span>
                                    </div>
                                    {currentJob ? (
                                      <p className="text-xs text-orange-600 flex items-center gap-1">
                                        <Icon icon={Zap} size="xs" /> Job #{currentJob.id} · {currentJob.serviceName || currentJob.priceTier}
                                      </p>
                                    ) : isOnline ? (
                                      <p className="text-xs text-green-600">Available</p>
                                    ) : (
                                      <p className="text-xs text-gray-400">Offline</p>
                                    )}
                                    {p.lastLocationUpdate && (
                                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                        <Icon icon={Clock} size="xs" className="shrink-0" />
                                        Active {relativeTime(p.lastLocationUpdate)}
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </>
              );
            })()}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pro Applications</CardTitle>
                    <CardDescription>Review and manage Dapr Pro applicants</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {(["all", "submitted", "under_review", "verification_requested", "approved_needs_setup", "rejected"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setAppStatusFilter(s)}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                          appStatusFilter === s
                            ? "bg-[#8c52ff] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {s === "all" ? "All" :
                         s === "submitted" ? "New" :
                         s === "under_review" ? "In Review" :
                         s === "verification_requested" ? "Needs Verification" :
                         s === "approved_needs_setup" ? "Approved" :
                         "Rejected"}
                        {s !== "all" && (
                          <span className="ml-1.5 opacity-70">
                            ({providerApplications.filter(a => a.applicationStatus === s).length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {appsLoading ? (
                  <div className="text-center py-12 text-gray-400">Loading applications…</div>
                ) : filteredApps.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Icon icon={FileText} size="lg" className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No applications{appStatusFilter !== "all" ? ` with status "${appStatusFilter}"` : ""}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredApps.map(app => (
                      <ApplicationRow
                        key={app.id}
                        app={app}
                        onStatusChange={(status, notes) =>
                          updateApplicationStatusMutation.mutate({ id: app.id, status, notes })
                        }
                        isUpdating={updateApplicationStatusMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage Detail Pros and Customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters and Search */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Icon icon={Search} size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search by name, username, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="customer">Customers</SelectItem>
                      <SelectItem value="provider">Detail Pros</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Users Table */}
                <DataTable
                  columns={userColumns}
                  data={filteredUsers}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Management</CardTitle>
                <CardDescription>
                  View and manage all upcoming appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={bookingColumns}
                  data={bookings}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <Icon icon={DollarSign} size="sm" className="text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${earnings?.totalRevenue?.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All time revenue
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <Icon icon={TrendingUp} size="sm" className="text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${earnings?.monthlyRevenue?.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Booking Value</CardTitle>
                  <Icon icon={BarChart3} size="sm" className="text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${earnings?.averageBookingValue?.toFixed(2) || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per booking
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Icon icon={Calendar} size="sm" className="text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {earnings?.totalBookings?.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All completed
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Job Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Jobs</span>
                    <span className="font-bold">{analytics?.totalJobs || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Completed Jobs</span>
                    <span className="font-bold text-green-600">{analytics?.completedJobs || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cancelled Jobs</span>
                    <span className="font-bold text-red-600">{analytics?.cancelledJobs || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* User Growth */}
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Users</span>
                    <span className="font-bold">{analytics?.userGrowth.totalUsers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>New Users This Month</span>
                    <span className="font-bold text-blue-600">{analytics?.userGrowth.newUsersThisMonth || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Providers</span>
                    <span className="font-bold">{analytics?.userGrowth.totalProviders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Active Providers</span>
                    <span className="font-bold text-green-600">{analytics?.userGrowth.activeProviders || 0}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Top Services */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topServices?.map((service, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span>{service.name}</span>
                        <div className="text-right">
                          <div className="font-bold">{service.count} jobs</div>
                          <div className="text-sm text-gray-500">${service.revenue}</div>
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500">No service data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Providers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Providers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topProviders?.map((provider, index) => (
                      <div key={provider.id} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{provider.name}</div>
                          <div className="text-sm text-gray-500">★ {provider.rating.toFixed(1)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{provider.completedJobs} jobs</div>
                          <div className="text-sm text-gray-500">${provider.revenue}</div>
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500">No provider data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Tier Prices</CardTitle>
                <CardDescription>
                  Update the base price for each of the four service tiers. Changes apply immediately to new bookings and are visible to customers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {[
                    { key: "basic" as const, label: "Essential Wash", desc: "Hand wash, spray wax, vacuum, quick interior wipe-down" },
                    { key: "interior" as const, label: "Interior Detail", desc: "Full vacuum, surface cleaning, seat cleaning, light stain treatment" },
                    { key: "standard" as const, label: "Refresh Detail", desc: "Complete interior/exterior refresh with upgraded wheels and tire shine" },
                    { key: "premium" as const, label: "Dapr Black Label Detail", desc: "Showroom-finish results with our most thorough interior and exterior work" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="space-y-2">
                      <label className="text-sm font-semibold">{label}</label>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium">$</span>
                        <Input
                          type="number"
                          min={1}
                          value={pricingForm[key]}
                          onChange={(e) => setPricingForm(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="0"
                          className="max-w-[140px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  disabled={updatePricingMutation.isPending}
                  onClick={() => {
                    const basic = parseInt(pricingForm.basic);
                    const interior = parseInt(pricingForm.interior);
                    const standard = parseInt(pricingForm.standard);
                    const premium = parseInt(pricingForm.premium);
                    if ([basic, interior, standard, premium].some(v => isNaN(v) || v < 1)) {
                      toast({ title: "Invalid prices", description: "All prices must be positive numbers.", variant: "destructive" });
                      return;
                    }
                    updatePricingMutation.mutate({ basic, interior, standard, premium });
                  }}
                >
                  {updatePricingMutation.isPending ? "Saving…" : "Save Prices"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-4">
            {/* Summary stats */}
            {(() => {
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              const newMessages = contactMessages.filter(m => !m.resolved && m.submittedAt >= oneDayAgo);
              const callbackRequested = contactMessages.filter(m => !m.resolved && m.requestCallback);
              const openMessages = contactMessages.filter(m => !m.resolved);
              return (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Open Messages</p>
                          <p className="text-3xl font-bold text-gray-800">{openMessages.length}</p>
                        </div>
                        <Icon icon={MessageSquare} size="xl" className="text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-100 bg-blue-50">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">New (Last 24h)</p>
                          <p className="text-3xl font-bold text-blue-700">{newMessages.length}</p>
                        </div>
                        <Icon icon={AlertCircle} size="xl" className="text-blue-400" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-100 bg-amber-50">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Callback Requested</p>
                          <p className="text-3xl font-bold text-amber-700">{callbackRequested.length}</p>
                        </div>
                        <Icon icon={Phone} size="xl" className="text-amber-400" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {/* Messages list */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon icon={MessageSquare} size="sm" />
                      Customer Messages
                    </CardTitle>
                    <CardDescription>Messages submitted through the FAQ / contact form</CardDescription>
                  </div>
                  {/* Filter toggle */}
                  <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 bg-gray-50">
                    {(["open", "all", "resolved"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setSupportFilter(f)}
                        className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                          supportFilter === f
                            ? "bg-white shadow-sm text-gray-900 border border-gray-200"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {messagesLoading ? (
                  <div className="text-center py-8 text-gray-400">Loading messages…</div>
                ) : contactMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No messages yet</div>
                ) : (
                  (() => {
                    const filtered = [...contactMessages]
                      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
                      .filter(m => {
                        if (supportFilter === "open") return !m.resolved;
                        if (supportFilter === "resolved") return m.resolved;
                        return true;
                      });
                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-400">
                          No {supportFilter === "all" ? "" : supportFilter} messages
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        {filtered.map((msg) => {
                          const isNew = !msg.resolved && msg.submittedAt >= new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                          const submittedDate = new Date(msg.submittedAt);
                          const formattedDate = submittedDate.toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric"
                          });
                          const formattedTime = submittedDate.toLocaleTimeString(undefined, {
                            hour: "numeric", minute: "2-digit"
                          });
                          return (
                            <div
                              key={msg.id}
                              className={`p-4 rounded-lg border ${
                                msg.resolved
                                  ? "border-gray-100 bg-gray-50/60 opacity-70"
                                  : isNew
                                  ? "border-blue-200 bg-blue-50/40"
                                  : "border-gray-100 bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0 space-y-1">
                                  {/* Header row */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-semibold text-sm ${msg.resolved ? "text-gray-400" : "text-gray-900"}`}>
                                      {msg.name}
                                    </span>
                                    {msg.resolved ? (
                                      <Badge variant="secondary" className="text-xs h-4 px-1.5 bg-green-100 text-green-700 border-green-200">
                                        <Icon icon={CheckCircle2} size="xs" className="mr-1" />
                                        Resolved
                                      </Badge>
                                    ) : isNew ? (
                                      <Badge variant="default" className="text-xs h-4 px-1.5">New</Badge>
                                    ) : null}
                                    {msg.requestCallback && (
                                      <Badge variant="outline" className={`text-xs h-4 px-1.5 ${msg.resolved ? "border-gray-300 text-gray-400" : "border-amber-400 text-amber-600"}`}>
                                        <Icon icon={Phone} size="xs" className="mr-1" />
                                        Callback requested
                                      </Badge>
                                    )}
                                  </div>
                                  {/* Email */}
                                  <div className={`flex items-center gap-1 text-xs ${msg.resolved ? "text-gray-400" : "text-gray-500"}`}>
                                    <Icon icon={Mail} size="xs" />
                                    <a href={`mailto:${msg.email}`} className="hover:underline">{msg.email}</a>
                                  </div>
                                  {/* Message */}
                                  <p className={`text-sm mt-2 leading-relaxed whitespace-pre-wrap ${msg.resolved ? "text-gray-400" : "text-gray-700"}`}>
                                    {msg.message}
                                  </p>
                                  {/* Resolved timestamp */}
                                  {msg.resolved && msg.resolvedAt && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Resolved {new Date(msg.resolvedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                    </p>
                                  )}
                                </div>
                                {/* Date + action */}
                                <div className="text-right shrink-0 flex flex-col items-end gap-2">
                                  <div>
                                    <p className="text-xs text-gray-500">{formattedDate}</p>
                                    <p className="text-xs text-gray-400">{formattedTime}</p>
                                  </div>
                                  {!msg.resolved ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 px-2 text-green-700 border-green-300 hover:bg-green-50"
                                      disabled={resolveMessageMutation.isPending}
                                      onClick={() => resolveMessageMutation.mutate(msg.id)}
                                    >
                                      <Icon icon={CheckCircle2} size="xs" className="mr-1" />
                                      Mark Resolved
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7 px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                                      disabled={reopenMessageMutation.isPending}
                                      onClick={() => reopenMessageMutation.mutate(msg.id)}
                                    >
                                      <Icon icon={RotateCcw} size="xs" className="mr-1" />
                                      Reopen
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}