import "./index.css";
import App from "./App.tsx";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { TrackingProvider } from "./context/TrackingContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <TrackingProvider>
          <App />
        </TrackingProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
