import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import Landing from "./pages/Landing";
import Signup from "./pages/auth/Signup";
import Login from "./pages/auth/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ArtistDashboard from "./pages/ArtistDashboard";
import ArtistDetail from "./pages/ArtistDetail";
import Profile from "./pages/Profile";
import SeedData from "./pages/SeedData";
import NotFound from "./pages/NotFound";
import AuthWrapper from "./components/AuthWrapper";
import BottomNav from "./components/BottomNav";
import Lineup from "./pages/Lineup";
import { useLocation, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./integrations/supabase/client";

// Lazy load room components for code splitting
const CommunityOverview = lazy(() => import("./pages/CommunityOverview"));
const Lounge = lazy(() => import("./pages/Lounge"));
const MusicDrop = lazy(() => import("./pages/MusicDrop"));
const MerchDrop = lazy(() => import("./pages/MerchDrop"));
const Announcements = lazy(() => import("./pages/Announcements"));
const TicketDrop = lazy(() => import("./pages/TicketDrop"));
const SpotifyBlend = lazy(() => import("./pages/SpotifyBlend"));
const Verifications = lazy(() => import("./pages/admin/Verifications"));

// Configure React Query with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthWrapper>
          <AppContent />
        </AuthWrapper>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const AppContent = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show bottom nav only on specific pages: /home, /lineup, /profile
  const showBottomNavPaths = ['/home', '/lineup', '/profile'];
  const showBottomNav = isAuthenticated && showBottomNavPaths.includes(location.pathname);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/signup" element={<Signup />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/lineup" element={<Lineup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/artist/:id" element={<ArtistDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/artist-dashboard" element={<ArtistDashboard />} />
        <Route path="/community/:id" element={<CommunityOverview />} />
        <Route path="/community/:id/lounge" element={<Lounge />} />
        <Route path="/community/:id/music-drop" element={<MusicDrop />} />
        <Route path="/community/:id/merch-drop" element={<MerchDrop />} />
        <Route path="/community/:id/announcements" element={<Announcements />} />
        <Route path="/community/:id/ticket-drop" element={<TicketDrop />} />
        <Route path="/community/:id/spotify-blend" element={<SpotifyBlend />} />
        <Route path="/seed" element={<SeedData />} />
        <Route path="/admin/verifications" element={<Verifications />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showBottomNav && <BottomNav />}
    </Suspense>
  );
};

export default App;
