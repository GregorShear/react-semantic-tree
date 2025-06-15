import { useState } from "react";
import {
  SemanticConfig,
  Branch,
  useLeaf,
  withBranch,
} from "react-semantic-tree";

// --- Theme Selection Dialog ---
const ThemeDialog = ({ onClose }: { onClose: () => void }) => {
  const { ref: applyRef } = useLeaf<HTMLButtonElement>("apply theme button", {
    theme: "dark",
  });

  return (
    <Branch label="ThemeDialog" metadata={{ dialogType: "modal" }}>
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "white",
          border: "2px solid #007bff",
          padding: "20px",
          zIndex: 1000,
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          borderRadius: "8px",
        }}
      >
        <h2>Select Theme</h2>
        <p>Choose a theme to apply contextually.</p>
        <button
          ref={applyRef}
          style={{ marginRight: "10px", padding: "8px 16px" }}
          onClick={onClose}
        >
          Apply Dark Theme
        </button>
        <button style={{ padding: "8px 16px" }} onClick={onClose}>
          Cancel
        </button>
      </div>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 999,
        }}
        onClick={onClose}
      />
    </Branch>
  );
};

// --- Settings Panel ---
const SettingsPanelContent = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { ref: profileRef } = useLeaf<HTMLButtonElement>("profile button", {
    id: "profile-789",
  });

  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", margin: "10px" }}>
      <h3>Settings Panel</h3>
      <button style={{ margin: "10px" }} onClick={() => setIsDialogOpen(true)}>
        Change Theme
      </button>
      <button ref={profileRef}>Update Profile</button>
      {isDialogOpen && <ThemeDialog onClose={() => setIsDialogOpen(false)} />}
    </div>
  );
};

// Same branch as above, via the HOC rather than JSX nesting.
const SettingsPanel = withBranch("SettingsPanel", {
  metadata: { section: "user-settings" },
})(SettingsPanelContent);

// --- Main Dashboard View ---
const Dashboard = () => {
  const { ref: refreshRef } = useLeaf<HTMLButtonElement>("refresh button");
  return (
    <Branch label="Dashboard" metadata={{ section: "analytics" }}>
      <div
        style={{ border: "1px solid #007bff", padding: "10px", margin: "10px" }}
      >
        <h2>Dashboard View</h2>
        <p>This is the main dashboard.</p>
        <SettingsPanel />
        <button ref={refreshRef}>Refresh</button>
      </div>
    </Branch>
  );
};

// --- App Content component to ensure hooks are used within Providers ---
const AppContent = () => {
  const { ref: saveRef } = useLeaf<HTMLButtonElement>("save settings");
  const { ref: cancelRef } = useLeaf<HTMLButtonElement>("cancel");
  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <h1>React Semantic Tree Example</h1>
      <p>
        Open your browser's console to see the logged events. Mount is disabled
        globally.
      </p>

      <Dashboard />

      <div
        style={{
          marginTop: "40px",
          borderTop: "2px solid #eee",
          paddingTop: "20px",
        }}
      >
        <h3>Settings Section (Hover Disabled)</h3>
        <Branch label="Settings" events={{ hover: false }}>
          <div style={{ background: "#f9f9f9", padding: "20px" }}>
            <p>Hover events are explicitly disabled for this section.</p>
            <button ref={saveRef}>Save Settings</button>
            <button ref={cancelRef}>Cancel</button>
          </div>
        </Branch>
      </div>
    </div>
  );
};

// --- Root Application ---
const App = () => {
  return (
    <SemanticConfig events={{ mount: false }}>
      <Branch label="AppRoot" metadata={{ env: "development" }}>
        <AppContent />
      </Branch>
    </SemanticConfig>
  );
};

export default App;
