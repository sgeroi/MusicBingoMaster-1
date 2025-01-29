import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AdminPage from "@/pages/admin";
import GamePage from "@/pages/game";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

function Navigation() {
  const [location, navigate] = useLocation();
  
  return (
    <div className="border-b mb-4">
      <div className="container mx-auto py-4 flex gap-4">
        <Button
          variant={location === "/admin" ? "default" : "outline"}
          onClick={() => navigate("/admin")}
        >
          Admin
        </Button>
        <Button
          variant={location === "/" ? "default" : "outline"}
          onClick={() => navigate("/")}
        >
          Play Game
        </Button>
      </div>
    </div>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/admin" component={AdminPage} />
        <Route path="/" component={GamePage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
