import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { convex } from "./lib/convex";
import { TooltipProvider } from "./components/ui/tooltip";
import AuthedApp from "./components/AuthedApp";
import SignIn from "./pages/SignIn";
import Splash from "./components/Splash";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexAuthProvider client={convex}>
      <TooltipProvider delayDuration={150} skipDelayDuration={300}>
        <BrowserRouter>
          <AuthLoading>
            <Splash />
          </AuthLoading>
          <Unauthenticated>
            <SignIn />
          </Unauthenticated>
          <Authenticated>
            <AuthedApp />
          </Authenticated>
        </BrowserRouter>
      </TooltipProvider>
    </ConvexAuthProvider>
  </React.StrictMode>
);
