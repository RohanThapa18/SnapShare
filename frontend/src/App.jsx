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
import PageTransition from "./components/PageTransition";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PageTransition>
          <Toaster
            position="bottom-center"
            gutter={10}
            containerStyle={{ bottom: 28 }}
            toastOptions={{
              duration: 3000,
              style: {
                background: "#ffffff",
                color: "#172033",
                border: "1px solid #e4e7ec",
                borderRadius: "14px",
                padding: "12px 16px",
                fontSize: "14px",
                fontWeight: 500,
                boxShadow: "0 12px 32px rgba(16, 24, 40, 0.14)",
              },
              success: { iconTheme: { primary: "#3b8a68", secondary: "#ffffff" } },
              error: { iconTheme: { primary: "#c65a5a", secondary: "#ffffff" } },
            }}
          />
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
            <Route
              path="/events/:slug"
              element={
                <ProtectedRoute>
                  <EventDetails />
                </ProtectedRoute>
              }
            />

            <Route path="/purchases" element={<ProtectedRoute><PurchaseHistory /></ProtectedRoute>} />
            <Route path="/liked" element={<ProtectedRoute><LikedFavourites /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageTransition>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
