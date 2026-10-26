import { useEffect, useState } from "react";
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
  { id: "Roads & Footpaths", label: "Roads & Access Damage", icon: Truck, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { id: "Water & Sanitation", label: "Drainage & Water Supply", icon: Droplets, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "Streetlights & Electrical", label: "Electrical Lines & Power", icon: Zap, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { id: "Garbage & Waste", label: "Construction Debris & Waste", icon: Trash2, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

export default function CivicFixHub({ currentProjectLocation = "Anna Nagar, Chennai" }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview | file | tracker | history
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
    category: "Roads & Footpaths",
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

      // Keep selection or pick the first complaint
      if (fetchedComplaints.length > 0) {
        setSelectedTicket(fetchedComplaints[0]);
      } else {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error("Failed to load CivicFix data:", err);
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
      setSuccessBanner(res.message || "Complaint registered successfully with CivicFix!");
      setFormData({
        title: "",
        description: "",
        category: "Roads & Footpaths",
        location: locationQuery,
        priority: "High",
        image_url: "",
      });
      // Refresh list
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

  const getPriorityBadge = (p) => {
    switch (p) {
      case "Critical": return "bg-red-100 text-red-800 border-red-300";
      case "High": return "bg-orange-100 text-orange-800 border-orange-300";
      case "Medium": return "bg-amber-100 text-amber-800 border-amber-300";
      default: return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case "Resolved": return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "In Progress": return "bg-blue-100 text-blue-800 border-blue-300";
      case "Assigned": return "bg-purple-100 text-purple-800 border-purple-300";
      default: return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const healthScore = overview?.health_summary?.health_score ?? 98;
  const healthRisk = overview?.health_summary?.risk_level ?? "LOW";

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Building2 className="w-3.5 h-3.5" /> CivicFix Municipal Operations Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Plot Infrastructure & Civic Grievance Portal
            </h1>
            <p className="mt-2 text-slate-300 text-sm max-w-2xl">
              Monitor neighborhood infrastructure health, report hazards affecting your plot, and view historical civic resolutions directly synchronized with municipal authorities.
            </p>
          </div>

          {/* Health Gauge Badge */}
          <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-xl p-4 flex items-center gap-4 min-w-[240px]">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl border-4 ${
              healthScore >= 80 ? "border-emerald-500 text-emerald-400 bg-emerald-950/40" :
              healthScore >= 65 ? "border-amber-500 text-amber-400 bg-amber-950/40" :
              "border-rose-500 text-rose-400 bg-rose-950/40"
            }`}>
              {healthScore}%
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-slate-400">Site Readiness Index</div>
              <div className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                {healthRisk === "LOW" && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                {healthRisk === "MODERATE" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                {healthRisk === "HIGH" && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                {healthRisk} RISK
              </div>
              <div className="text-xs text-slate-400 mt-0.5">CivicFix Verified</div>
            </div>
          </div>
        </div>

        {/* Location / Area Name Query Bar */}
        <div className="mt-6 pt-5 border-t border-slate-700/70 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadData(locationQuery);
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="flex-1 relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Enter area or ward name (e.g. Anna Nagar, T. Nagar, Velachery, OMR)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition shadow-md"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Query Area Health
            </button>
          </form>

          {/* Quick preset area pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-medium">Quick Select Area:</span>
            {PRESET_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => handleAreaChange(area)}
                className={`px-3 py-1 rounded-full border transition ${
                  locationQuery.toLowerCase().includes(area.split(",")[0].toLowerCase())
                    ? "bg-indigo-600 border-indigo-500 text-white font-semibold"
                    : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {area}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleAreaChange("")}
              className={`px-3 py-1 rounded-full border transition ${
                locationQuery === ""
                  ? "bg-indigo-600 border-indigo-500 text-white font-semibold"
                  : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              All Incidents
            </button>
          </div>
        </div>
      </div>

      {/* Area Context Banner */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-indigo-900">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600" />
          <span>
            Active Area Filter: <strong>{locationQuery || "All Neighborhoods"}</strong> ({complaints.length} tickets recorded)
          </span>
        </div>
        <button
          onClick={() => {
            setFormData((prev) => ({ ...prev, location: locationQuery || "Plot Site" }));
            setActiveTab("file");
          }}
          className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <PlusCircle className="w-3.5 h-3.5" /> File Complaint for this Area
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex gap-4 overflow-x-auto pb-1 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" /> Area Health & Details
        </button>
        <button
          onClick={() => setActiveTab("file")}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "file"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PlusCircle className="w-4 h-4" /> File Plot Complaint
        </button>
        <button
          onClick={() => setActiveTab("tracker")}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "tracker"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" /> Live Status Tracker
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "history"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" /> Historical Area Log ({complaints.length})
        </button>
      </div>

      {/* Success / Error Banners */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}
      {errorBanner && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>{errorBanner}</span>
          </div>
          <button onClick={() => setErrorBanner(null)} className="text-rose-700 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ============================================================
          TAB 1: AREA HEALTH & DETAILS
      ============================================================ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs uppercase font-bold text-slate-400">Total Area Incidents</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {overview?.health_summary?.total_reported ?? complaints.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">Recorded for {locationQuery || "all areas"}</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs uppercase font-bold text-slate-400">Active Hazards</div>
              <div className="text-2xl font-extrabold text-rose-600 mt-1">
                {overview?.health_summary?.active_issues ?? 0}
              </div>
              <div className="text-xs text-rose-600 font-medium mt-1">Currently under resolution</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs uppercase font-bold text-slate-400">Resolved Hazards</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">
                {overview?.health_summary?.resolved_issues ?? 0}
              </div>
              <div className="text-xs text-emerald-600 font-medium mt-1">Closed by municipal officers</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs uppercase font-bold text-slate-400">Connected Authorities</div>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">5 ULBs</div>
              <div className="text-xs text-slate-500 mt-1">GCC, Metro Water, TANGEDCO</div>
            </div>
          </div>

          {/* Civil Recommendations Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700" />
              BuildWise Civil Engineering Recommendations for {locationQuery || "this Site"}:
            </h3>
            <ul className="mt-2.5 space-y-1.5 text-sm text-amber-800 list-disc list-inside">
              {overview?.health_summary?.civil_advisory?.map((adv, idx) => (
                <li key={idx}>{adv}</li>
              )) || <li>Road frontage and drainage in this ward are in good condition.</li>}
            </ul>
          </div>

          {/* Municipal Departments Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Municipal Departments Operating in this Jurisdiction
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(overview?.departments || []).map((dept) => (
                <div key={dept.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition">
                  <div className="text-xs font-semibold text-indigo-700 uppercase">{dept.category}</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{dept.name}</div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Active Operations Console
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
        <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-indigo-600 tracking-wider">
              <PlusCircle className="w-4 h-4" /> New Civic Grievance
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">Report an Issue or Hazard for Your Plot</h2>
            <p className="text-sm text-slate-500 mt-1">
              Your grievance will be filed with a verifiable ticket ID and directly forwarded to the respective municipal department in CivicFix.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Category Radio Pills */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Issue Category *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = formData.category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setFormData({ ...formData, category: cat.id })}
                        className={`p-3 rounded-lg border text-left flex items-center gap-3 transition ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20"
                            : "border-slate-200 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className="text-sm font-semibold">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Complaint Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Open road trench preventing construction vehicle entry"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Location */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Plot Address / Location *
                  </label>
                  <span className="text-xs text-indigo-600 font-medium">Synced with searched area</span>
                </div>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Severity / Priority Level
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Low">Low (Minor aesthetic issue)</option>
                  <option value="Medium">Medium (Affects pedestrian walkway)</option>
                  <option value="High">High (Impacting site work or material delivery)</option>
                  <option value="Critical">Critical (Immediate danger: wire snapping, severe water ingress)</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the hazard, how long it has persisted, and how it is impacting your construction plot..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Media URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Photo / Evidence URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? "Submitting to Municipal Console..." : "Submit Complaint to CivicFix"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: LIVE STATUS TRACKER
      ============================================================ */}
      {activeTab === "tracker" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Complaints list to select */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Area Tickets</span>
              <span className="text-xs text-slate-500 font-normal">{complaints.length} tickets</span>
            </h3>
            {complaints.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {complaints.map((c) => (
                  <button
                    key={c.ticket_id}
                    onClick={() => setSelectedTicket(c)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedTicket?.ticket_id === c.ticket_id
                        ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/20"
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-indigo-700">{c.ticket_id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 mt-1 line-clamp-1">{c.title}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{c.category}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No complaints recorded for {locationQuery || "this area"}.
                <button
                  onClick={() => setActiveTab("file")}
                  className="mt-2 block w-full py-1.5 px-3 bg-indigo-50 text-indigo-700 rounded font-semibold hover:bg-indigo-100"
                >
                  File First Ticket
                </button>
              </div>
            )}
          </div>

          {/* Stepper Detail View */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            {selectedTicket ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded">
                        {selectedTicket.ticket_id}
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getPriorityBadge(selectedTicket.priority)}`}>
                        {selectedTicket.priority} Priority
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 mt-2">{selectedTicket.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedTicket.location}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(selectedTicket.status)} self-start`}>
                    Status: {selectedTicket.status}
                  </span>
                </div>

                {/* Status Stepper */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Resolution Workflow Progress</h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {["Submitted", "Assigned", "In Progress", "Resolved"].map((stepName, idx) => {
                      const stages = ["Submitted", "Assigned", "In Progress", "Resolved"];
                      const currentIdx = stages.indexOf(selectedTicket.status);
                      const isComplete = currentIdx >= idx;
                      const isCurrent = currentIdx === idx;

                      return (
                        <div key={stepName} className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1.5 transition ${
                            isComplete
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-400"
                          } ${isCurrent ? "ring-4 ring-emerald-100" : ""}`}>
                            {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span className={`font-semibold ${isComplete ? "text-slate-900" : "text-slate-400"}`}>
                            {stepName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Complaint Details */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm space-y-2">
                  <div className="font-semibold text-slate-700">Detailed Description:</div>
                  <p className="text-slate-600">{selectedTicket.description}</p>
                  <div className="pt-2 text-xs text-slate-400 flex items-center justify-between">
                    <span>Department: <strong>{selectedTicket.assigned_department}</strong></span>
                    <span>Reported: {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Resolution Note If Present */}
                {selectedTicket.resolution ? (
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-lg">
                    <div className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5 mb-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Official Signed Resolution Note
                    </div>
                    <p className="text-sm text-emerald-800">{selectedTicket.resolution.notes}</p>
                    <div className="mt-2 text-xs text-emerald-700">
                      Resolved by: <strong>{selectedTicket.resolution.resolved_by}</strong> on{" "}
                      {new Date(selectedTicket.resolution.resolved_at).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Assigned municipal engineer has acknowledged the ticket and dispatched field crew.
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                Select a ticket on the left to inspect its live status and municipal resolution note.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: HISTORICAL AREA LOG
      ============================================================ */}
      {activeTab === "history" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Historical Civic Incidents</h3>
              <p className="text-xs text-slate-500">
                Audit trail of past civic problems and municipal resolutions for {locationQuery || "all areas"}
              </p>
            </div>
            
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              {["all", "in progress", "resolved"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-md capitalize transition ${
                    statusFilter === s ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {complaints.length > 0 ? (
              complaints.map((c) => (
                <div key={c.ticket_id} className="py-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {c.ticket_id}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getPriorityBadge(c.priority)}`}>
                        {c.priority}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{c.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.location} • Dept: {c.assigned_department}
                    </div>

                    {c.resolution && (
                      <div className="mt-2 p-2.5 bg-emerald-50 rounded border border-emerald-100 text-xs text-emerald-800">
                        <strong>Resolution Note:</strong> {c.resolution.notes} ({c.resolution.resolved_by})
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTicket(c);
                      setActiveTab("tracker");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 self-start mt-2 md:mt-0"
                  >
                    View Timeline <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">
                No past civic complaints recorded for {locationQuery || "this area"}.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
