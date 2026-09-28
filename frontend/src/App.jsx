import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import Navbar from "./components/Navbar";

import LikedFavourites from "./pages/LikedFavourites";
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
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#1E293B",
              color: "#fff",
            },
          }}
        />

        <Navbar />

        <Routes>
          {/* Public pages */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* QR deep links */}
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

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Create Event */}
          <Route
            path="/events/create"
            element={
              <ProtectedRoute>
                <CreateEvent />
              </ProtectedRoute>
            }
          />

          {/* Event Details
              IMPORTANT:
              Event URLs now use slug instead of MongoDB _id.

              Example:
              /events/freshers
              /events/freshers-2026
          */}
          <Route
            path="/events/:slug"
            element={
              <ProtectedRoute>
                <EventDetails />
              </ProtectedRoute>
            }
          />

          {/* Other pages */}
          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <PurchaseHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/liked"
            element={
              <ProtectedRoute>
                <LikedFavourites />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;