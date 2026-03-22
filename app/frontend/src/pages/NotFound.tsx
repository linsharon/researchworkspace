import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-800/40">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-slate-200">404</h1>
        <p className="text-lg text-slate-600">Page not found</p>
        <p className="text-sm text-slate-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button className="bg-violet-700 hover:bg-violet-800 text-white mt-4">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}