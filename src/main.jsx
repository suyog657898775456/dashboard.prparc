import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // Reference the CSS in the same folder
import App from "./App.jsx"; // Reference App.jsx in the same folder

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <div className="scrollbar-hide">
      <App />
    </div>
  </StrictMode>,
);
