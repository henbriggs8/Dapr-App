import { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit3, Save, X, LogOut, Mail, Phone, MapPin, FileText, Star, Camera, User } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { useLocation } from "wouter";

export function ProviderProfileTab() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    description: user?.description || "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      setIsEditing(false);
      toast({ title: "Profile saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (profileImage: string) => {
      const res = await apiRequest("PATCH", "/api/user/profile", { profileImage });
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      setImagePreview(null);
      toast({ title: "Photo updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update photo", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please choose an image under 5MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(base64);
      updateAvatarMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      description: user?.description || "",
    });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    const clerkInstance = (window as any).Clerk;
    if (clerkInstance?.signOut) {
      try { await clerkInstance.signOut(); } catch (_) {}
    }
    logoutMutation.mutate(undefined, {
      onSuccess: () => navigate("/provider-auth"),
    });
  };

  if (!user) return null;

  const avatarSrc = imagePreview || user.profileImage;

  return (
    <div className="pb-10">

      {/* ── Avatar ──────────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-6 pt-8 pb-6 border-b border-gray-200">
        <div className="relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center group"
            disabled={updateAvatarMutation.isPending}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon icon={User} size="xl" className="text-gray-300" />
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              <Icon icon={Camera} size="lg" className="text-white" />
            </div>

            {/* Loading overlay */}
            {updateAvatarMutation.isPending && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          {/* Camera badge */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#8c52ff] flex items-center justify-center shadow-sm"
          >
            <Icon icon={Camera} size="xs" className="text-white" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <p className="mt-3 text-base font-medium text-black">{user.name || user.username}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {updateAvatarMutation.isPending ? "Uploading photo..." : "Tap photo to change"}
        </p>
      </div>

      {/* Section label */}
      <div className="px-6 pt-6 pb-2">
        <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Account</p>
      </div>

      {/* Edit mode */}
      {isEditing ? (
        <div className="px-6 space-y-4 pb-6">
          {[
            { label: "Full Name", key: "name", type: "text", placeholder: "Your full name" },
            { label: "Email", key: "email", type: "email", placeholder: "your@email.com" },
            { label: "Phone", key: "phone", type: "tel", placeholder: "+1 (555) 000-0000" },
            { label: "Address", key: "address", type: "text", placeholder: "Your home address" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-xs text-gray-500 block mb-1">{field.label}</label>
              <input
                type={field.type}
                value={formData[field.key as keyof typeof formData]}
                onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-gray-400"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Bio</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell customers about your experience..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-gray-400"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => updateProfileMutation.mutate(formData)}
              disabled={updateProfileMutation.isPending}
              className="flex-1 py-3 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Icon icon={Save} size="sm" />
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancel}
              className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium flex items-center gap-1"
            >
              <Icon icon={X} size="sm" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* View rows */}
          {[
            { icon: <Icon icon={Mail} size="sm" className="text-gray-400" />, label: "Email", value: user.email },
            { icon: <Icon icon={Phone} size="sm" className="text-gray-400" />, label: "Phone", value: user.phone },
            { icon: <Icon icon={MapPin} size="sm" className="text-gray-400" />, label: "Address", value: user.address },
            { icon: <Icon icon={FileText} size="sm" className="text-gray-400" />, label: "Bio", value: user.description },
          ].map((row, i, arr) => (
            <div key={row.label} className={`px-6 py-4 flex items-start gap-3 ${i < arr.length - 1 ? "border-b border-gray-200" : ""}`}>
              <span className="mt-0.5 flex-shrink-0">{row.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">{row.label}</p>
                <p className="text-sm text-black truncate">{row.value || <span className="text-gray-300">Not set</span>}</p>
              </div>
            </div>
          ))}

          {/* Edit button */}
          <div className="px-6 pt-4">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 text-sm font-medium text-[#8c52ff]"
            >
              <Icon icon={Edit3} size="sm" />
              Edit profile
            </button>
          </div>
        </div>
      )}

      {/* Rating stats */}
      <div className="mx-6 mt-6 bg-gray-950 text-white rounded-xl px-5 py-4 grid grid-cols-2 divide-x divide-gray-800">
        <div className="pr-4">
          <p className="text-xs text-gray-400 mb-1">Rating</p>
          <p className="text-2xl font-semibold flex items-center gap-1">
            {user.rating?.toFixed(1) || "—"}
            <Icon icon={Star} size="sm" className="text-yellow-400 fill-yellow-400" />
          </p>
        </div>
        <div className="pl-4">
          <p className="text-xs text-gray-400 mb-1">Reviews</p>
          <p className="text-2xl font-semibold">{user.ratingCount || 0}</p>
        </div>
      </div>

      {/* Sign out */}
      <div className="px-6 mt-8 border-t border-gray-200 pt-6">
        <button
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-black transition-colors"
        >
          <Icon icon={LogOut} size="sm" />
          {logoutMutation.isPending ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
