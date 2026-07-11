import { useState } from "react";
import { MapPin, Clock, DollarSign, Star, Car, Navigation, ChevronRight, CheckCircle } from "lucide-react";

const PURPLE = "#8c52ff";

const mockActiveBooking = {
  id: 42,
  bookingRef: "BK-0042",
  status: "in_progress",
  serviceCategory: "full_detail",
  vehicleInfo: "2022 BMW X5 · White",
  address: "4801 NW 72nd Ave, Miami, FL",
  scheduledTime: "2:30 PM",
  price: 149,
  stage: "exterior_washing",
};

const mockAvailableJobs = [
  {
    id: 57,
    bookingRef: "BK-0057",
    serviceCategory: "basic_wash",
    vehicleInfo: "2021 Toyota Camry · Silver",
    address: "1200 Brickell Ave, Miami, FL",
    distance: 1.4,
    price: 49,
    scheduledTime: "3:15 PM",
  },
  {
    id: 58,
    bookingRef: "BK-0058",
    serviceCategory: "premium_detail",
    vehicleInfo: "2023 Tesla Model 3 · Black",
    address: "801 S Miami Ave, Miami, FL",
    distance: 2.1,
    price: 99,
    scheduledTime: "4:00 PM",
  },
];

const stages = ["on_the_way", "arrival", "exterior_washing", "interior_cleaning", "finishing", "completed"];
const stageLabels: Record<string, string> = {
  on_the_way: "On the Way",
  arrival: "Arrived",
  exterior_washing: "Exterior Wash",
  interior_cleaning: "Interior Clean",
  finishing: "Finishing",
  completed: "Completed",
};

type Tab = "jobs" | "available" | "earnings" | "stats" | "profile";

export default function ProviderHome() {
  const [activeTab, setActiveTab] = useState<Tab>("jobs");
  const [isOnline, setIsOnline] = useState(true);

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "jobs", label: "Jobs", badge: 1 },
    { key: "available", label: "Available", badge: mockAvailableJobs.length },
    { key: "earnings", label: "Earnings" },
    { key: "stats", label: "Stats" },
    { key: "profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "'Satoshi', system-ui, sans-serif" }}>

      {/* Header */}
      <div className="px-6 pt-14 pb-5 border-b border-gray-100">
        <p style={{ fontSize: 10, letterSpacing: "0.1em", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>
          Dapr Pro
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.5px", color: "#111" }}>
          Marcus T.
        </h1>

        <div className="flex items-center justify-between mt-4">
          {/* Online toggle */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 999,
              border: `1px solid ${isOnline ? "#bbf7d0" : "#e5e7eb"}`,
              background: isOnline ? "#f0fdf4" : "#fff",
              color: isOnline ? "#15803d" : "#9ca3af",
              fontSize: 13, fontWeight: 500, cursor: "pointer"
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? "#22c55e" : "#9ca3af", display: "inline-block" }} />
            {isOnline ? "Online" : "Offline"}
          </button>

          {/* Update location */}
          <button style={{ display: "flex", alignItems: "center", gap: 4, color: PURPLE, fontSize: 13, fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}>
            <Navigation size={14} />
            Update location
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ background: "#0a0a0a", color: "#fff", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "18px 24px" }}>
        {[
          { label: "Earnings", value: "$1,240" },
          { label: "Completed", value: "18" },
          { label: "Rating", value: "4.9 ★" },
        ].map((stat, i) => (
          <div key={stat.label} style={{ paddingLeft: i > 0 ? 16 : 0, paddingRight: i < 2 ? 16 : 0, borderLeft: i > 0 ? "1px solid #1f2937" : "none" }}>
            <p style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{stat.label}</p>
            <p style={{ fontSize: 20, fontWeight: 600 }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6", overflowX: "auto", padding: "0 8px" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flexShrink: 0, padding: "14px 14px", fontSize: 13, fontWeight: 500,
              borderBottom: activeTab === tab.key ? `2px solid ${PURPLE}` : "2px solid transparent",
              color: activeTab === tab.key ? PURPLE : "#9ca3af",
              background: "none", border: "none",
              borderBottom: activeTab === tab.key ? `2px solid ${PURPLE}` : "2px solid transparent",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4
            }}
          >
            {tab.label}
            {tab.badge && tab.badge > 0 ? (
              <span style={{
                background: tab.key === "jobs" ? "#111" : PURPLE,
                color: "#fff", borderRadius: 999, fontSize: 10,
                padding: "1px 6px", fontWeight: 600
              }}>{tab.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Jobs Tab */}
      {activeTab === "jobs" && (
        <div>
          <p style={{ padding: "20px 24px 8px", fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Active Bookings
          </p>

          {/* Active booking card */}
          <div style={{ margin: "0 16px 16px", border: "1px solid #f3f4f6", borderRadius: 16, overflow: "hidden" }}>
            {/* Status strip */}
            <div style={{ background: "#f0fdf4", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>In Progress</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: PURPLE, fontFamily: "monospace" }}>{mockActiveBooking.bookingRef}</span>
            </div>

            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 4 }}>Full Detail</p>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <Car size={12} /> {mockActiveBooking.vehicleInfo}
              </p>
              <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <MapPin size={12} /> {mockActiveBooking.address}
              </p>

              {/* Stage progress */}
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Current Stage</p>
                <div style={{ display: "flex", gap: 4 }}>
                  {stages.slice(0, -1).map(s => {
                    const idx = stages.indexOf(s);
                    const currentIdx = stages.indexOf(mockActiveBooking.stage);
                    const done = idx <= currentIdx;
                    return (
                      <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: done ? PURPLE : "#f3f4f6" }} />
                    );
                  })}
                </div>
                <p style={{ fontSize: 12, color: PURPLE, fontWeight: 500, marginTop: 4 }}>
                  {stageLabels[mockActiveBooking.stage]}
                </p>
              </div>

              {/* Price + time */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontSize: 20, fontWeight: 600, color: "#111" }}>${mockActiveBooking.price}</span>
                <span style={{ fontSize: 12, color: "#9ca3af", display: "flex", alignItems: "center", gap: 3 }}>
                  <Clock size={11} /> {mockActiveBooking.scheduledTime}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, padding: "10px", borderRadius: 10, background: PURPLE, color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
                  Mark Arrived
                </button>
                <button style={{ flex: 1, padding: "10px", borderRadius: 10, background: "#f3f4f6", color: "#374151", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
                  Next Stage →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Tab */}
      {activeTab === "available" && (
        <div>
          <p style={{ padding: "20px 24px 8px", fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Jobs Near You
          </p>
          {mockAvailableJobs.map((job, i) => (
            <div key={job.id} style={{ borderBottom: i < mockAvailableJobs.length - 1 ? "1px solid #f3f4f6" : "none", padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>
                    {job.serviceCategory === "basic_wash" ? "Basic Wash" : "Premium Detail"}
                  </p>
                  <p style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                    <Car size={11} /> {job.vehicleInfo}
                  </p>
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>${job.price}</span>
              </div>
              <p style={{ fontSize: 12, color: "#6b7280", display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
                <MapPin size={11} /> {job.address}
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
                {job.distance} mi away · {job.scheduledTime}
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, padding: "9px", borderRadius: 10, background: PURPLE, color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
                  Accept
                </button>
                <button style={{ padding: "9px 16px", borderRadius: 10, background: "#fff", color: "#9ca3af", fontSize: 13, fontWeight: 500, border: "1px solid #e5e7eb", cursor: "pointer" }}>
                  Pass
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Earnings Tab */}
      {activeTab === "earnings" && (
        <div style={{ padding: "24px 20px" }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>
            All Time
          </p>
          <p style={{ fontSize: 40, fontWeight: 700, color: "#111", marginBottom: 4 }}>$1,240.00</p>
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 24 }}>18 services completed</p>
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>By Service</p>
            {[
              { label: "Full Detail", amount: 745, count: 5 },
              { label: "Premium Detail", amount: 297, count: 3 },
              { label: "Basic Wash", amount: 198, count: 10 },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f9fafb" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#111" }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af" }}>{item.count} services</p>
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>${item.amount}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats + Profile tabs (placeholder) */}
      {(activeTab === "stats" || activeTab === "profile") && (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#9ca3af" }}>
          <Star size={32} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>{activeTab === "stats" ? "Performance stats" : "Profile settings"}</p>
        </div>
      )}
    </div>
  );
}
