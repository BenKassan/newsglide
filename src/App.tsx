
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { Toaster } from "@/components/ui/toaster";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import Preferences from "@/pages/Preferences";
import SearchHistory from "@/pages/SearchHistory";
import Subscription from "@/pages/Subscription";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
  {
    path: "/preferences",
    element: <Preferences />,
  },
  {
    path: "/search-history",
    element: <SearchHistory />,
  },
  {
    path: "/subscription",
    element: <Subscription />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <RouterProvider router={router} />
          <Toaster />
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
