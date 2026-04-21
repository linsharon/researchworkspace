import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  return (
    <div className="app-shell min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel rounded-3xl px-8 py-10 text-center space-y-4 border-0 max-w-md w-full">
        <h1 className="text-6xl font-bold gradient-text">404</h1>
        <p className="text-lg text-slate-200">{isZh ? "页面未找到" : "Page not found"}</p>
        <p className="text-sm text-slate-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button className="brand-button mt-4 border-0">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}