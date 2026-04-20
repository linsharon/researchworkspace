import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-800/40">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-slate-200">404</h1>
        <p className="text-lg text-slate-600">{isZh ? "页面未找到" : "Page not found"}</p>
        <p className="text-sm text-slate-400">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white mt-4">
            <Home className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}