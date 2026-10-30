# BuildWise + Plan2Space 3D + CivicFix

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6+-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black.svg?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7.svg?logo=render&logoColor=white)](https://render.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black.svg?logo=vercel&logoColor=white)](https://vercel.com)

An integrated, full-stack construction planning and municipal hazard intelligence ecosystem. This platform connects algorithmic residential floor-planning, 3D WebGL spatial walkthroughs, and real-time civic infrastructure hazard tracking into a unified workflow.

---

## Live Deployments

| Component | Environment | Live URL |
| :--- | :--- | :--- |
| **BuildWise Web App** | Production (Render) | [buildwise-frontend-euzo.onrender.com](https://buildwise-frontend-euzo.onrender.com) |
| **BuildWise API & Engine** | Production (Render) | [buildwise-backend-ylo3.onrender.com/api/health](https://buildwise-backend-ylo3.onrender.com/api/health) |
| **Swagger API Docs** | Production (Render) | [buildwise-backend-ylo3.onrender.com/docs](https://buildwise-backend-ylo3.onrender.com/docs) |
| **CivicFix Citizen Portal** | Production (Vercel) | [civicfix-pink.vercel.app](https://civicfix-pink.vercel.app) |
| **CivicFix API Service** | Production (Render) | [civicfix-t3mx.onrender.com](https://civicfix-t3mx.onrender.com) |

> **Note on Render Free Tier**: Backend services spin down after ~15 minutes of inactivity. If a service is sleeping, the first request may take 40–50 seconds to warm up. Once active, all API calls respond within 1–2 seconds.

---

## What This Platform Does

### 1. BuildWise Core (`buildwise/`)
- **Algorithmic Floor-Plan Generation**: Computes residential layouts dynamically from plot dimensions, setback rules, room requirements, and Vastu orientation constraints.
- **Cost & Material Estimator**: Breaks down structural steel, cement, aggregates, finishing items, and labor costs tailored to localized pricing.
- **Construction Timeline & Milestones**: Generates task schedules and resource charts across structural, MEP, and interior stages.
- **AI Design Assistant**: Powered by Google Gemini to analyze design trade-offs and structural advisories.

### 2. Plan2Space 3D Studio (`plan2space-3d/`)
- **2D-to-3D Geometry Pipeline**: Extrudes 2D polygon boundaries into watertight 3D floor structures, complete with walls, door openings, and window cutouts.
- **WebGL Interactive Studio**: Real-time camera navigation, daylight and shadow simulation, and room-by-room walkthroughs built on Three.js.

### 3. CivicFix Integration (`buildwise/backend/app/services/civicfix_service.py`)
- **Real-Time Civic Hazard Tracking**: Live proxy connection to the CivicFix municipal redressal engine.
- **Automated Civil Engineering Advisories**: Evaluates nearby street trenches, waterlogging/drainage culvert blocks, and sagging overhead high-tension cables, generating NBC Part 8 compliance warnings.
- **Site Infrastructure Health Score**: Dynamically scores plot readiness (0–100) based on live municipal tickets.
- **Bidirectional Media Exchange**: Direct photo/evidence forwarding between site engineers on BuildWise and municipal officers on CivicFix.

---

## System Architecture & Data Flow

```text
 ┌────────────────────────┐                   ┌────────────────────────┐
 │   BuildWise Frontend   │                   │   CivicFix Frontend    │
 │    (React 19 / Vite)   │                   │    (React / Vercel)    │
 └───────────┬────────────┘                   └───────────┬────────────┘
             │                                            │
             │ REST API                                   │ REST API
             ▼                                            ▼
 ┌────────────────────────┐   Service Auth    ┌────────────────────────┐
 │   BuildWise Backend    │   & JWT Token     │    CivicFix Backend    │
 │    (FastAPI / Uvicorn) ├──────────────────►│   (FastAPI / Render)   │
 │   Port 8000 / Render   │◄──────────────────┤      Neon Postgres     │
 └───────────┬────────────┘   Bidirectional   └────────────────────────┘
             │                Image Sync &
             │                Grievance Stream
             ▼
 ┌────────────────────────┐
 │     Plan2Space 3D      │
 │  (FastAPI + Three.js)  │
 │   Port 8001 / Studio   │
 └────────────────────────┘
```

---

## Quickstart: How to Open & Run the Project

Follow these steps to clone, configure, and run the entire platform locally on your machine.

### Prerequisites

Make sure you have the following installed:
- **Node.js** (v18.0 or newer) & `npm`
- **Python** (v3.11 or newer)
- **Git**
- **VS Code** (recommended) or any code editor

---

### Step 1: Clone and Open in VS Code

```bash
# Clone the repository
git clone https://github.com/narmathaDevX/BuildWise-Plan2Space-CivicFix.git

# Navigate into the project directory
cd BuildWise-Plan2Space-CivicFix

# Open in VS Code
code .
```

---

### Step 2: Configure Environment Variables

Create your local `.env` files from the provided samples.

#### Backend Configuration:
Create `buildwise/backend/.env`:
```bash
# In buildwise/backend/.env
CIVICFIX_API_URL=https://civicfix-t3mx.onrender.com
CIVICFIX_SERVICE_EMAIL=buildwise_service@buildwise.internal
CIVICFIX_SERVICE_PASSWORD=BuildWiseSecurePassword2026!
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Frontend Configuration:
Create `buildwise/frontend/.env`:
```bash
# In buildwise/frontend/.env
VITE_API_BASE_URL=http://localhost:8000
VITE_DESIGN_STUDIO_URL=http://localhost:8001
```

---

### Step 3: Run the BuildWise Backend

Open a terminal in the root directory:

```bash
cd buildwise

# 1. Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Start the FastAPI server with auto-reload
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Once running, verify the API is live:
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

> **Troubleshooting — Port Conflict**:  
> If you encounter `ERROR: [Errno 48] Address already in use`, another process is holding port 8000. Free it instantly with:
> ```bash
> lsof -ti:8000 | xargs kill -9
> ```
> Then re-run the `uvicorn` command.

---

### Step 4: Run the BuildWise Frontend

Open a **new terminal tab or window**:

```bash
cd buildwise/frontend

# 1. Install Node dependencies
npm install

# 2. Launch the Vite development server
npm run dev
```

Your terminal will display the local URL:
- **Web App**: [http://localhost:5173](http://localhost:5173)

Open that URL in your browser. You can now design floor plans, estimate costs, and access the **CivicFix Hub** directly from the navigation bar.

---

### Step 5: (Optional) Run Plan2Space 3D Studio Locally

If you want to run the standalone 3D visualization studio locally:

```bash
cd plan2space-3d

# Create virtualenv and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Start the 3D server on port 8001
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Access the 3D studio at: [http://localhost:8001](http://localhost:8001)

---

## Verifying the CivicFix Connection & Image Sync

The integration between BuildWise and CivicFix is 100% live. To verify the connection from your local environment or production:

1. **Check Live Connectivity**:
   ```bash
   curl https://buildwise-backend-ylo3.onrender.com/api/civic/overview
   ```
   Should return `"connection_status": "online"` with active complaints fetched from the CivicFix database.

2. **Test Outbound Image Forwarding (CivicFix → BuildWise)**:
   ```bash
   curl -F "file=@site_photo.png" -F "ticket_id=CF-TEST" \
     https://civicfix-t3mx.onrender.com/api/external/send-image
   ```
   The image will immediately appear in BuildWise's gallery at `/api/civic/uploads`.

3. **Test Inbound Evidence Receiver (BuildWise → CivicFix)**:
   ```bash
   curl -F "file=@site_evidence.png" -F "ticket_id=BW-TEST" \
     https://civicfix-t3mx.onrender.com/api/external/receive-image
   ```
   The image will immediately appear in CivicFix's feed at `/api/external/received-feed`.

---

## Repository Structure

```text
buildwise-plan2space-civicfix/
├── buildwise/                      # Core BuildWise application
│   ├── backend/                    # FastAPI backend service
│   │   ├── app/
│   │   │   ├── core/               # App configuration & security settings
│   │   │   ├── db/                 # Models, database session, schemas
│   │   │   ├── routers/            # API endpoints (floorplans, costs, civic)
│   │   │   └── services/           # Business logic & civicfix_service.py
│   │   ├── main.py                 # Backend entrypoint (uvicorn)
│   │   ├── requirements.txt        # Python backend dependencies
│   │   └── uploads/                # Dynamic shared evidence images
│   ├── frontend/                   # React 19 + Vite single page application
│   │   ├── src/
│   │   │   ├── components/         # Reusable UI widgets & modals
│   │   │   ├── pages/              # CivicFixHub.jsx, Planner, CostEstimator
│   │   │   └── services/           # Axios API clients
│   │   └── package.json            # Frontend dependencies & scripts
│   └── README.md                   # BuildWise specific documentation
├── plan2space-3d/                  # 2D-to-3D WebGL geometry studio
│   ├── app/                        # FastAPI geometry engine & mesh generators
│   ├── frontend/                   # Three.js canvas & spatial viewer
│   ├── requirements.txt            # Geometry dependencies (trimesh, shapely)
│   └── README.md                   # Plan2Space documentation
├── render.yaml                     # Multi-service infrastructure blueprint
├── .gitignore                      # Git ignore patterns
└── README.md                       # Main workspace documentation (this file)
```

---

## Prompts Used to Build & Document This Project

Here are the actual, simple prompts used to guide the AI while building and documenting the integration:

### Prompt 1: Connecting BuildWise to CivicFix
> *"Hey, I have two projects: BuildWise (FastAPI + React for house planning) and CivicFix (FastAPI for city complaints). I want BuildWise to talk to CivicFix so when a user enters a plot location, it pulls real issues in that area, calculates an infrastructure risk score from 0 to 100, and gives construction safety warnings (like low-hanging power cables or waterlogged roads). Can you write the FastAPI service to connect them with a service account and JWT token?"*

### Prompt 2: Two-Way Image Sharing
> *"I need to send site photos back and forth between BuildWise and CivicFix. If someone uploads a hazard image on CivicFix, forward it to BuildWise and show it on the BuildWise dashboard. And if a user uploads an image on BuildWise, send it back to CivicFix. Show me how to set up the FastAPI endpoints on both ends using multipart form-data so images appear immediately without refresh issues."*

### Prompt 3: Writing the Developer Setup & README Guide
> *"Can you write a clean and simple README for this repository? I want it to sound like a developer explaining it to another human. Walk through opening the folder in VS Code, setting up the .env files, running the backend with uvicorn, and starting the React frontend with npm. Also include how to fix the 'Address already in use on port 8000' error and direct links to our live deployed sites."*

---

## License

This project is licensed under the [MIT License](LICENSE).
