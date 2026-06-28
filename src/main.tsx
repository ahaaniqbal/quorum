import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConvexProvider } from "convex/react";
import { convex } from "./lib/convex";
import { TooltipProvider } from "./components/ui/tooltip";
import AppShell from "./components/AppShell";
import Pipeline from "./pages/Pipeline";
import Dashboard from "./pages/Dashboard";
import Integrations from "./pages/Integrations";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <TooltipProvider delayDuration={150} skipDelayDuration={300}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Pipeline />} />
              <Route path="/deal/:accountId" element={<Dashboard />} />
              <Route path="/integrations" element={<Integrations />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ConvexProvider>
  </React.StrictMode>
);
