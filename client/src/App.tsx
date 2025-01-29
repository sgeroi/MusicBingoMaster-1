import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AdminPage from "@/pages/admin";
import GamePage from "@/pages/game";
import LoginPage from "@/pages/login";
import UsersPage from "@/pages/users";
import CreateBingoPage from "@/pages/create-bingo";
import { Button } from "@/components/ui/button";
import { useAuth, logout } from "@/lib/auth";

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (adminOnly && !user.isAdmin) {
    return <Redirect to="/" />;
  }

  return <Component {...rest} />;
}

function Navigation() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="border-b mb-4">
      <div className="container mx-auto py-4 flex gap-4">
        {user.isAdmin ? (
          <>
            <Button
              variant={location === "/admin" ? "default" : "outline"}
              onClick={() => navigate("/admin")}
            >
              Admin
            </Button>
            <Button
              variant={location === "/users" ? "default" : "outline"}
              onClick={() => navigate("/users")}
            >
              Users
            </Button>
          </>
        ) : (
          <Button
            variant={location === "/create" ? "default" : "outline"}
            onClick={() => navigate("/create")}
          >
            Create Bingo
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="ml-auto"
        >
          Logout
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
        <Route path="/login" component={LoginPage} />
        <Route path="/admin" component={(props) => (
          <ProtectedRoute component={AdminPage} adminOnly {...props} />
        )} />
        <Route path="/users" component={(props) => (
          <ProtectedRoute component={UsersPage} adminOnly {...props} />
        )} />
        <Route path="/create" component={(props) => (
          <ProtectedRoute component={CreateBingoPage} {...props} />
        )} />
        <Route path="/" component={(props) => (
          <ProtectedRoute component={GamePage} {...props} />
        )} />
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