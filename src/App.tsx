import { useState } from "react";
import { CrewSelector } from "./components/CrewSelector";
import { AlertsPage } from "./pages/AlertsPage";
import { BodyPage } from "./pages/BodyPage";
import { ChartsPage } from "./pages/ChartsPage";
import { CheckInPage } from "./pages/CheckInPage";
import { DashboardPage } from "./pages/DashboardPage";
import { useCrewData } from "./state/useCrewData";
import { DISCLAIMER } from "./ui/labels";

type PageId = "dashboard" | "checkin" | "charts" | "body" | "alerts";

const pages: Array<{ id: PageId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "checkin", label: "Check-in" },
  { id: "charts", label: "Charts" },
  { id: "body", label: "Body figure" },
  { id: "alerts", label: "Alerts" },
];

export default function App() {
  const data = useCrewData();
  const [page, setPage] = useState<PageId>("dashboard");

  function handleReset() {
    if (window.confirm("Delete all entered check-ins?")) data.resetAll();
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <h1>G.L.O.R.P - GLOBAL OUT-STATION RECOVERY PLANNER</h1>
        <CrewSelector
          crew={data.crew}
          selectedId={data.selectedId}
          onSelect={data.selectAstronaut}
        />
      </header>

      <p className="notice" role="note">
        {DISCLAIMER}
      </p>
      {data.storageNotice && (
        <p className="notice notice-warn" role="status">
          {data.storageNotice}
        </p>
      )}

      <nav aria-label="Main">
        <ul className="nav-list">
          {pages.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`nav-button${page === p.id ? " is-active" : ""}`}
                aria-current={page === p.id ? "page" : undefined}
                onClick={() => setPage(p.id)}
              >
                {p.label}
                {p.id === "alerts" && data.snapshot.alerts.length > 0
                  ? ` (${data.snapshot.alerts.length})`
                  : ""}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main id="main" tabIndex={-1}>
        {page === "dashboard" && (
          <DashboardPage data={data} onOpenAlerts={() => setPage("alerts")} />
        )}
        {page === "checkin" && <CheckInPage data={data} />}
        {page === "charts" && <ChartsPage data={data} />}
        {page === "body" && <BodyPage data={data} />}
        {page === "alerts" && <AlertsPage data={data} />}
      </main>

      <footer className="app-footer">
        <button
          type="button"
          className="button-secondary"
          onClick={handleReset}
        >
          Reset entered data
        </button>
        <span className="card-meta">
          {data.enteredCount} entered records saved
        </span>
      </footer>
    </div>
  );
}
