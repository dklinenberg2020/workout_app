import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { seedExercises } from "./db";
import { ensureProgramExercises } from "./program";
import "./index.css";

// Sequenced (not run concurrently) so ensureProgramExercises always sees the
// fully-seeded core lifts before checking what's missing — otherwise, on a
// brand-new install, both could race to add the same exercise twice.
async function bootstrap() {
  await seedExercises();
  await ensureProgramExercises();
}
bootstrap();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
