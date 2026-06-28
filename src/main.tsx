import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConvexProvider } from "convex/react";
import { convex } from "./lib/convex";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/deal/:accountId" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </ConvexProvider>
  </React.StrictMode>
);
