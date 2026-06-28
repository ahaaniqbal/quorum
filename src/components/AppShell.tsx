import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import AskQuorum from "./AskQuorum";

export default function AppShell() {
  const [askOpen, setAskOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar onAskQuorum={() => setAskOpen(true)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet context={{ openAskQuorum: () => setAskOpen(true) }} />
      </div>
      <AskQuorum open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}
