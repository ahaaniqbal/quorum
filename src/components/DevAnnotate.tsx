import { useEffect, useState, type ComponentType } from "react";

// Dev-only Agentation feedback toolbar. Drop review pins on the page and the
// agent picks them up through the agentation MCP (HTTP server on :4747). The
// agentation module is dynamically imported so it is never part of the
// production bundle, and the toolbar only renders on the dev server.
export default function DevAnnotate() {
  const [Toolbar, setToolbar] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    let active = true;
    import("agentation")
      .then((m) => {
        if (active) setToolbar(() => m.Agentation);
      })
      .catch(() => {
        /* toolbar is optional dev tooling */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!Toolbar) return null;
  return <Toolbar endpoint="http://localhost:4747" />;
}
