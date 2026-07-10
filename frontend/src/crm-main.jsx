import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import CrmRootApp from "./CrmRootApp";
import { wakeBackend } from "./utils/apiBase";
import "./admin/admin.css";

if (import.meta.env.DEV) {
  window.location.replace("/admin-panel");
} else {
  wakeBackend();

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <CrmRootApp />
      </BrowserRouter>
    </React.StrictMode>
  );
}
