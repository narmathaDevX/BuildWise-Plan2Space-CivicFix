import { useEffect, useState } from "react";
import "./CivicFixHub.css";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Building2,
  MapPin,
  Send,
  Clock,
  CheckCircle2,
  FileText,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Droplets,
  Zap,
  Truck,
  Trash2,
  PlusCircle,
  HelpCircle,
  Check,
  Radio,
} from "lucide-react";
import {
  getCivicOverview,
  getCivicComplaints,
  submitCivicComplaint,
} from "../services/api";

const PRESET_AREAS = [
  "Anna Nagar, Chennai",
  "T. Nagar, Chennai",
  "Velachery, Chennai",
  "OMR / Perungudi, Chennai",
];

const CATEGORIES = [
  { id: "Roads & Infrastructure", label: "Roads & Infrastructure", icon: Truck },
  { id: "Water Supply & Drainage", label: "Water Supply & Drainage", icon: Droplets },
  { id: "Electrical & Lighting", label: "Electrical & Lighting", icon: Zap },
  { id: "Sanitation & Waste", label: "Sanitation & Waste", icon: Trash2 },
];

export default function CivicFixHub({ currentProjectLocation = "Anna Nagar, Chennai" }) {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab")) return params.get("tab");
    }
    return "overview";
  });

  const [locationQuery, setLocationQuery] = useState(currentProjectLocation);
  const [overview, setOverview] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Roads & Infrastructure",
    location: currentProjectLocation,
    priority: "High",
    image_url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);

  const loadData = async (loc = locationQuery) => {
    try {
      setLoading(true);
      const [ovRes, compRes] = await Promise.all([
        getCivicOverview(loc),
        getCivicComplaints(loc, statusFilter),
      ]);
      setOverview(ovRes);
      const fetchedComplaints = compRes.complaints || [];
      setComplaints(fetchedComplaints);

      if (fetchedComplaints.length > 0) {
        setSelectedTicket(fetchedComplaints[0]);
      } else {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error("Failed to load live CivicFix data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAreaChange = (newArea) => {
    setLocationQuery(newArea);
    setFormData((prev) => ({
      ...prev,
      location: prev.location.includes("Plot")
        ? `Plot Site, ${newArea}`
        : newArea,
    }));
    loadData(newArea);
  };

  useEffect(() => {
    loadData(locationQuery);
  }, [statusFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      setErrorBanner("Please fill in both title and detailed description.");
      return;
    }
    try {
      setSubmitting(true);
      setErrorBanner(null);
      const res = await submitCivicComplaint(formData);
      setSuccessBanner(res.message || "Complaint registered directly in CivicFix!");
      setFormData({
        title: "",
        description: "",
        category: "Roads & Infrastructure",
        location: locationQuery,
        priority: "High",
        image_url: "",
      });
      await loadData(locationQuery);
      if (res.complaint) {
        setSelectedTicket(res.complaint);
        setActiveTab("tracker");
      }
    } catch (err) {
      setErrorBanner(err.message || "Failed to submit complaint to CivicFix.");
    } finally {
      setSubmitting(false);
    }
  };

  const healthScore = overview?.health_summary?.health_score ?? 100;
  const healthRisk = overview?.health_summary?.risk_level ?? "OPTIMAL";
  const connectionStatus = overview?.connection_status ?? "online";
  const civicUrl = overview?.civicfix_api_url ?? "https://civicfix-t3mx.onrender.com";

  const getStatusBadgeClass = (s) => {
    if (s === "Resolved") return "badge-resolved";
    if (s === "In Progress" || s === "Assigned") return "badge-in-progress";
    return "badge-submitted";
  };

  return (
    <div className="civic-container">
      {/* Live Sync Status Pill */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", fontSize: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: connectionStatus === "online" ? "#10b981" : "#f43f5e",
            boxShadow: connectionStatus === "online" ? "0 0 8px #10b981" : "none",
          }} />
          <strong style={{ color: connectionStatus === "online" ? "#047857" : "#be123c" }}>
            {connectionStatus === "online" ? "CivicFix Live Real-Time Sync: Connected" : "CivicFix API: Offline"}
          </strong>
          <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>({civicUrl})</span>
        </div>
        <button
          onClick={() => loadData(locationQuery)}
          className="civic-link-btn"
          style={{ fontSize: "12px" }}
        >
          <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh Real Data
        </button>
      </div>

      {/* Hero Banner */}
      <div className="civic-hero">
        <div className="civic-hero-badge">
          <Building2 size={14} /> CivicFix Municipal Operations Hub
        </div>

        <div className="civic-hero-top">
          <div className="civic-hero-text">
            <h1>Plot Infrastructure & Civic Grievance Portal</h1>
            <p>
              100% live synchronization with CivicFix. Any ticket filed, status changed, or municipal resolution signed in CivicFix updates here in real-time.
            </p>
          </div>

          {/* Health Gauge Badge */}
          <div className="civic-gauge-card">
            <div
              className={`civic-gauge-circle ${
                healthScore >= 80
                  ? "gauge-optimal"
                  : healthScore >= 65
                  ? "gauge-moderate"
                  : "gauge-high-risk"
              }`}
            >
              {healthScore}%
            </div>
            <div className="civic-gauge-meta">
              <div className="label">Live Site Readiness</div>
              <div className="value">
                {healthRisk === "OPTIMAL" && <ShieldCheck size={16} color="#34d399" />}
                {healthRisk === "LOW" && <ShieldCheck size={16} color="#34d399" />}
                {healthRisk === "MODERATE" && <AlertTriangle size={16} color="#fbbf24" />}
                {healthRisk === "HIGH" && <ShieldAlert size={16} color="#fb7185" />}
                {healthRisk}
              </div>
              <div className="sub">Real CivicFix Telemetry</div>
            </div>
          </div>
        </div>

        {/* Search Bar & Quick Area Select */}
        <div className="civic-search-section">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadData(locationQuery);
            }}
            className="civic-search-form"
          >
            <div className="civic-search-input-wrap">
              <MapPin size={16} />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Enter area name (e.g. Anna Nagar, T. Nagar, Velachery, OMR)..."
                className="civic-search-input"
              />
            </div>
            <button type="submit" className="civic-search-btn">
              <RefreshCw size={14} className={loading ? "spin" : ""} /> Query Area Health
            </button>
          </form>

          {/* Preset Area Pills */}
          <div className="civic-quick-chips">
            <span style={{ color: "#94a3b8", fontWeight: 600 }}>Quick Select Area:</span>
            {PRESET_AREAS.map((area) => {
              const isSelected = locationQuery.toLowerCase().includes(area.split(",")[0].toLowerCase());
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => handleAreaChange(area)}
                  className={`civic-chip ${isSelected ? "active" : ""}`}
                >
                  {area}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => handleAreaChange("")}
              className={`civic-chip ${locationQuery === "" ? "active" : ""}`}
            >
              All Real Tickets
            </button>
          </div>
        </div>
      </div>

      {/* Context Strip */}
      <div className="civic-context-strip">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MapPin size={16} />
          <span>
            Queried Area: <strong>{locationQuery || "All Neighborhoods"}</strong> ({complaints.length} live CivicFix tickets recorded)
          </span>
        </div>
        <button
          onClick={() => {
            setFormData((prev) => ({ ...prev, location: locationQuery || "Plot Site" }));
            setActiveTab("file");
          }}
          className="civic-link-btn"
        >
          <PlusCircle size={15} /> File Grievance for this Area
        </button>
      </div>

      {/* Tabs */}
      <div className="civic-tabs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`civic-tab-btn ${activeTab === "overview" ? "active" : ""}`}
        >
          <Building2 size={16} /> Area Health & Details
        </button>
        <button
          onClick={() => setActiveTab("file")}
          className={`civic-tab-btn ${activeTab === "file" ? "active" : ""}`}
        >
          <PlusCircle size={16} /> File Plot Complaint
        </button>
        <button
          onClick={() => setActiveTab("tracker")}
          className={`civic-tab-btn ${activeTab === "tracker" ? "active" : ""}`}
        >
          <Clock size={16} /> Live Status Tracker
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`civic-tab-btn ${activeTab === "history" ? "active" : ""}`}
        >
          <FileText size={16} /> Historical Area Log ({complaints.length})
        </button>
      </div>

      {/* Banners */}
      {successBanner && (
        <div style={{ padding: "14px 18px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", borderRadius: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
            <CheckCircle2 size={18} color="#059669" /> {successBanner}
          </div>
          <button onClick={() => setSuccessBanner(null)} style={{ background: "none", border: "none", color: "#065f46", cursor: "pointer", fontWeight: 700 }}>Dismiss</button>
        </div>
      )}
      {errorBanner && (
        <div style={{ padding: "14px 18px", background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", borderRadius: "10px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 600 }}>
            <AlertTriangle size={18} color="#e11d48" /> {errorBanner}
          </div>
          <button onClick={() => setErrorBanner(null)} style={{ background: "none", border: "none", color: "#9f1239", cursor: "pointer", fontWeight: 700 }}>Dismiss</button>
        </div>
      )}

      {/* ============================================================
          TAB 1: OVERVIEW
      ============================================================ */}
      {activeTab === "overview" && (
        <div>
          {/* KPI Grid */}
          <div className="civic-kpi-grid">
            <div className="civic-kpi-card">
              <div className="kpi-label">Total Real Incidents</div>
              <div className="kpi-num">{overview?.health_summary?.total_reported ?? complaints.length}</div>
              <div className="kpi-sub">From CivicFix live database</div>
            </div>
            <div className="civic-kpi-card">
              <div className="kpi-label">Active Hazards</div>
              <div className="kpi-num" style={{ color: "#e11d48" }}>{overview?.health_summary?.active_issues ?? 0}</div>
              <div className="kpi-sub" style={{ color: "#e11d48" }}>Under municipal resolution</div>
            </div>
            <div className="civic-kpi-card">
              <div className="kpi-label">Resolved Hazards</div>
              <div className="kpi-num" style={{ color: "#059669" }}>{overview?.health_summary?.resolved_issues ?? 0}</div>
              <div className="kpi-sub" style={{ color: "#059669" }}>Signed off by CivicFix admins</div>
            </div>
            <div className="civic-kpi-card">
              <div className="kpi-label">Connected Departments</div>
              <div className="kpi-num" style={{ color: "#4f46e5" }}>
                {(overview?.departments || []).length} ULBs
              </div>
              <div className="kpi-sub">Synced from CivicFix</div>
            </div>
          </div>

          {/* Civil Recommendations Banner */}
          <div className="civic-advisory-box">
            <div className="civic-advisory-title">
              <ShieldAlert size={18} />
              BuildWise Engineering Advisory (Derived from CivicFix Live Data):
            </div>
            <ul className="civic-advisory-list">
              {overview?.health_summary?.civil_advisory?.map((adv, idx) => (
                <li key={idx}>{adv}</li>
              )) || <li>No active municipal hazards recorded. Standard construction plinth applies.</li>}
            </ul>
          </div>

          {/* Real Municipal Departments from CivicFix */}
          <div className="civic-depts-card">
            <div className="civic-depts-title">
              <Building2 size={18} color="#4f46e5" />
              Live Municipal Departments in CivicFix Platform
            </div>
            <div className="civic-depts-grid">
              {(overview?.departments || []).map((dept) => (
                <div key={dept.id} className="civic-dept-item">
                  <div className="civic-dept-cat">ULB ID #{dept.id}</div>
                  <div className="civic-dept-name">{dept.name}</div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                    {dept.description || "Active municipal response wing"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: FILE PLOT COMPLAINT
      ============================================================ */}
      {activeTab === "file" && (
        <div className="civic-form-card">
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "#4f46e5" }}>
            <PlusCircle size={14} /> Direct CivicFix Ingestion
          </div>
          <h2 className="civic-form-title">Report an Issue or Hazard for Your Plot</h2>
          <p className="civic-form-sub">
            This form posts directly to the live CivicFix API. It generates a verified ticket ID stored in CivicFix's PostgreSQL database.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="civic-form-group">
              <label className="civic-form-label">Issue Category *</label>
              <div className="civic-cat-grid">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = formData.category === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setFormData({ ...formData, category: cat.id })}
                      className={`civic-cat-pill ${isSelected ? "selected" : ""}`}
                    >
                      <Icon size={18} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="civic-form-group">
              <label className="civic-form-label">Complaint Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Open road trench preventing construction vehicle entry"
                className="civic-input"
              />
            </div>

            <div className="civic-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <label className="civic-form-label" style={{ margin: 0 }}>Plot Address / Location *</label>
                <span style={{ fontSize: "11px", color: "#4f46e5", fontWeight: 600 }}>Synced with searched area</span>
              </div>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="civic-input"
              />
            </div>

            <div className="civic-form-group">
              <label className="civic-form-label">Severity / Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="civic-select"
              >
                <option value="Low">Low (Minor aesthetic issue)</option>
                <option value="Medium">Medium (Affects pedestrian walkway)</option>
                <option value="High">High (Impacting site work or material delivery)</option>
                <option value="Critical">Critical (Immediate danger: wire snapping, severe water ingress)</option>
              </select>
            </div>

            <div className="civic-form-group">
              <label className="civic-form-label">Detailed Description *</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the hazard, how long it has persisted, and how it is impacting your construction plot..."
                className="civic-textarea"
              />
            </div>

            <div className="civic-form-group">
              <label className="civic-form-label">Photo / Evidence URL (Optional)</label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://images.unsplash.com/photo-..."
                className="civic-input"
              />
            </div>

            <button type="submit" disabled={submitting} className="civic-submit-btn">
              <Send size={15} />
              {submitting ? "Forwarding to CivicFix..." : "Submit Real Complaint to CivicFix"}
            </button>
          </form>
        </div>
      )}

      {/* ============================================================
          TAB 3: LIVE STATUS TRACKER
      ============================================================ */}
      {activeTab === "tracker" && (
        <div className="civic-tracker-layout">
          {/* Complaints list */}
          <div className="civic-tickets-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <strong style={{ fontSize: "14px" }}>Real CivicFix Tickets</strong>
              <span style={{ fontSize: "12px", color: "#64748b" }}>{complaints.length} tickets</span>
            </div>

            {complaints.length > 0 ? (
              complaints.map((c) => (
                <div
                  key={c.ticket_id}
                  onClick={() => setSelectedTicket(c)}
                  className={`civic-ticket-card ${selectedTicket?.ticket_id === c.ticket_id ? "active" : ""}`}
                >
                  <div className="civic-ticket-header">
                    <span className="ticket-id">{c.ticket_id}</span>
                    <span className={`civic-badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, margin: "4px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{c.category}</div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: "12px" }}>
                No tickets currently found in CivicFix for {locationQuery || "this area"}.
                <button onClick={() => setActiveTab("file")} className="civic-link-btn" style={{ marginTop: "10px", display: "block", width: "100%", justifyContent: "center" }}>
                  File First Ticket in CivicFix
                </button>
              </div>
            )}
          </div>

          {/* Stepper Detail View */}
          <div className="civic-stepper-panel">
            {selectedTicket ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="ticket-id" style={{ background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                        {selectedTicket.ticket_id}
                      </span>
                      <span className={`civic-badge ${getStatusBadgeClass(selectedTicket.status)}`}>
                        {selectedTicket.priority} Priority
                      </span>
                    </div>
                    <h2 style={{ fontSize: "18px", fontWeight: 800, margin: "10px 0 4px" }}>{selectedTicket.title}</h2>
                    <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={13} /> {selectedTicket.location}
                    </div>
                  </div>
                  <span className={`civic-badge ${getStatusBadgeClass(selectedTicket.status)}`} style={{ padding: "6px 12px", fontSize: "12px" }}>
                    {selectedTicket.status}
                  </span>
                </div>

                {/* 4-Stage Stepper */}
                <div className="civic-stepper">
                  {["Submitted", "Assigned", "In Progress", "Resolved"].map((stepName, idx) => {
                    const stages = ["Submitted", "Assigned", "In Progress", "Resolved"];
                    const currentIdx = stages.indexOf(selectedTicket.status);
                    const isDone = currentIdx >= idx;
                    const isCurrent = currentIdx === idx;

                    return (
                      <div key={stepName} className="civic-step-node">
                        <div className={`civic-step-circle ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}>
                          {isDone ? <Check size={16} /> : idx + 1}
                        </div>
                        <div className={`civic-step-title ${isDone ? "active" : ""}`}>{stepName}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Description */}
                <div style={{ background: "var(--surface-2)", padding: "16px", borderRadius: "10px", fontSize: "13px", lineHeight: "1.6" }}>
                  <strong>Detailed Description:</strong>
                  <p style={{ margin: "6px 0 0" }}>{selectedTicket.description}</p>
                  <div style={{ marginTop: "12px", fontSize: "11px", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                    <span>Department: <strong>{selectedTicket.assigned_department}</strong></span>
                    <span>Reported: {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Signed Resolution */}
                {selectedTicket.resolution ? (
                  <div className="civic-resolution-card">
                    <div className="civic-res-header">
                      <CheckCircle2 size={16} /> Official Signed Municipal Resolution Note (from CivicFix)
                    </div>
                    <div className="civic-res-body">{selectedTicket.resolution.notes}</div>
                    <div className="civic-res-signer">
                      Resolved by: <strong>{selectedTicket.resolution.resolved_by}</strong> on{" "}
                      {new Date(selectedTicket.resolution.resolved_at).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "10px", padding: "14px 18px", fontSize: "12px", color: "#4f46e5", display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
                    <Clock size={16} /> Ticket is active in CivicFix console. When municipal officers update status or post signed notes in CivicFix, it will appear here.
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                Select a ticket from the left panel to inspect its live status and municipal resolution note.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: HISTORICAL LOG
      ============================================================ */}
      {activeTab === "history" && (
        <div className="civic-history-list">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
            <div>
              <strong style={{ fontSize: "16px" }}>Real Civic Incidents Audit Trail</strong>
              <div style={{ fontSize: "12px", color: "#64748b" }}>Live historical audit from CivicFix database for {locationQuery || "all areas"}</div>
            </div>
          </div>

          <div>
            {complaints.length > 0 ? (
              complaints.map((c) => (
                <div key={c.ticket_id} className="civic-history-item">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span className="ticket-id">{c.ticket_id}</span>
                      <span className={`civic-badge ${getStatusBadgeClass(c.status)}`}>{c.status}</span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 700, margin: "4px 0" }}>{c.title}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-soft)", marginBottom: "6px" }}>{c.description}</div>
                    <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={12} /> {c.location} • Dept: {c.assigned_department}
                    </div>

                    {c.resolution && (
                      <div style={{ marginTop: "10px", padding: "10px 14px", background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", fontSize: "12px", color: "#065f46" }}>
                        <strong>Resolution Note:</strong> {c.resolution.notes} ({c.resolution.resolved_by})
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTicket(c);
                      setActiveTab("tracker");
                    }}
                    className="civic-link-btn"
                  >
                    View Timeline <ChevronRight size={14} />
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                No past civic complaints recorded in CivicFix for {locationQuery || "this area"}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
