import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import Navbar from "./components/Navbar";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import CreateEvent from "./pages/CreateEvent";
import EventDetails from "./pages/EventDetails";
import JoinEvent from "./pages/JoinEvent";
import JoinEventAsPhotographer from "./pages/JoinEventAsPhotographer";
import PurchaseHistory from "./pages/PurchaseHistory";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { background: "#1E293B", color: "#fff" } }} />
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* QR deep links: eventId + token both embedded in the URL,
              so the app can resolve which event before joining. */}
          <Route
            path="/join/:eventId/:joinToken"
            element={
              <ProtectedRoute>
                <JoinEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join-photographer/:eventId/:photographerToken"
            element={
              <ProtectedRoute>
                <JoinEventAsPhotographer />
              </ProtectedRoute>
            }
          />

          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Single unified dashboard — no more role-specific routes.
              Create/Join/Join-as-Photographer all live here now,
              Google-Classroom style. */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route path="/events/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
          <Route path="/events/:id" element={<ProtectedRoute><EventDetails /></ProtectedRoute>} />

          <Route path="/purchases" element={<ProtectedRoute><PurchaseHistory /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
