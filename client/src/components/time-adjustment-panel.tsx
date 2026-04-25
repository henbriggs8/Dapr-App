import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle2 } from "lucide-react";
import { Icon } from "@/components/ui/icon";

interface TimeAdjustment {
  key: string;
  label: string;
  minutes: number;
  selected: boolean;
}

const PRESET_ADJUSTMENTS: Omit<TimeAdjustment, "selected">[] = [
  { key: "pet_hair", label: "Excessive Pet Hair", minutes: 20 },
  { key: "heavy_stains", label: "Heavy Stains", minutes: 15 },
  { key: "xl_vehicle", label: "XL Vehicle", minutes: 10 },
  { key: "adhesive_removal", label: "Adhesive Removal", minutes: 10 },
];

interface TimeAdjustmentPanelProps {
  bookingId: number;
  baseDurationMinutes: number;
  arrivalTime: string;
  initialAdjustments?: TimeAdjustment[];
  initialNotes?: string;
  estimatedCompletionTime?: string | null;
  onUpdated?: () => void;
}

export function TimeAdjustmentPanel({
  bookingId,
  baseDurationMinutes,
  arrivalTime,
  initialAdjustments,
  initialNotes = "",
  estimatedCompletionTime,
  onUpdated,
}: TimeAdjustmentPanelProps) {
  const { toast } = useToast();

  const [adjustments, setAdjustments] = useState<TimeAdjustment[]>(() => {
    if (initialAdjustments && initialAdjustments.length > 0) return initialAdjustments;
    return PRESET_ADJUSTMENTS.map((a) => ({ ...a, selected: false }));
  });

  const [notes, setNotes] = useState(initialNotes);

  const extraMinutes = adjustments.filter((a) => a.selected).reduce((s, a) => s + a.minutes, 0);
  const totalMinutes = baseDurationMinutes + extraMinutes;

  const calcETA = () => {
    const base = new Date(arrivalTime);
    base.setMinutes(base.getMinutes() + totalMinutes);
    return base.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const toggle = (key: string) => {
    setAdjustments((prev) =>
      prev.map((a) => (a.key === key ? { ...a, selected: !a.selected } : a))
    );
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/bookings/${bookingId}/time-adjustments`, {
        adjustments,
        providerNotes: notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/active-bookings"] });
      toast({ title: "ETA updated", description: "Customer has been notified of the new completion time." });
      onUpdated?.();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update ETA", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
      <p className="text-xs font-semibold text-gray-500 tracking-widest uppercase">Adjust Service Time</p>

      {/* Preset buttons */}
      <div className="grid grid-cols-2 gap-2">
        {adjustments.map((adj) => (
          <button
            key={adj.key}
            onClick={() => toggle(adj.key)}
            className={`flex items-center justify-between px-3 py-3 rounded-xl border text-left transition-all ${
              adj.selected
                ? "bg-[#8c52ff] border-[#8c52ff] text-white"
                : "bg-white border-gray-200 text-black hover:border-gray-400"
            }`}
          >
            <span className="text-sm font-medium leading-tight">{adj.label}</span>
            <span className={`text-xs font-semibold ml-2 flex-shrink-0 ${adj.selected ? "text-purple-200" : "text-gray-400"}`}>
              +{adj.minutes}m
            </span>
          </button>
        ))}
      </div>

      {/* Running summary */}
      <div className="bg-gray-950 text-white rounded-xl p-4 space-y-1.5">
        <div className="flex justify-between text-sm text-gray-400">
          <span>Base duration</span>
          <span>{baseDurationMinutes} min</span>
        </div>
        {adjustments.filter((a) => a.selected).map((a) => (
          <div key={a.key} className="flex justify-between text-sm text-gray-400">
            <span>{a.label}</span>
            <span>+{a.minutes} min</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold text-white border-t border-gray-700 pt-2 mt-1">
          <span className="flex items-center gap-1.5">
            <Icon icon={Clock} size="xs" /> Updated completion
          </span>
          <span>{calcETA()}</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about the vehicle condition..."
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-gray-400"
        />
      </div>

      {/* Save button */}
      <button
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending}
        className="w-full py-3 rounded-xl bg-[#8c52ff] text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
      >
        <Icon icon={CheckCircle2} size="sm" />
        {updateMutation.isPending ? "Updating..." : "Update Customer ETA"}
      </button>
    </div>
  );
}
