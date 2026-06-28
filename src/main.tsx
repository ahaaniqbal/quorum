import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { convex } from "./lib/convex";
import { TooltipProvider } from "./components/ui/tooltip";
import AppErrorBoundary from "./components/AppErrorBoundary";
import AuthedApp from "./components/AuthedApp";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import Splash from "./components/Splash";
import ReactiveGrid from "./components/ReactiveGrid";
import "./index.css";

function Root() {
  const isLandingPreview =
    window.location.pathname === "/landing" || window.location.pathname.startsWith("/landing/");

  if (isLandingPreview) {
    return (
      <>
        <ReactiveGrid prominent />
        <Landing />
      </>
    );
  }

  return (
    <>
      <AuthLoading>
        <Splash />
      </AuthLoading>
      <Unauthenticated>
        <ReactiveGrid prominent />
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/signup" element={<SignIn />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Unauthenticated>
      <Authenticated>
        <AuthedApp />
      </Authenticated>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <TooltipProvider delayDuration={150} skipDelayDuration={300}>
        <BrowserRouter>
          <AppErrorBoundary>
            <Root />
          </AppErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ConvexAuthProvider>
  </React.StrictMode>
);
