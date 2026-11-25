import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";

// Three separate apps share this entry. Each loads only its own code.
//   /admin  -> existing admin panel (unchanged)
//   /chat   -> existing VEU Recommends chatbot (unchanged)
//   else    -> VEU Curates
const AdminPanel = lazy(() => import("./AdminPanel"));
const ChatApp = lazy(() => import("./App"));
const CuratesApp = lazy(() => import("./curates/CuratesApp"));

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const Root = path === "/admin" ? AdminPanel : path === "/chat" ? ChatApp : CuratesApp;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </React.StrictMode>
);
