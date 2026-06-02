/**
 * main.tsx — Point d'entrée React
 * AppProvider enveloppe toute l'application pour que
 * useAppContext() soit disponible dans chaque composant.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { AppProvider } from "./context/AppContext";
import App from "./App";


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);