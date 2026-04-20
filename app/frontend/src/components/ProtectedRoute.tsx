import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, LogIn } from 'lucide-react';
import { useI18n } from "@/lib/i18n";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{isZh ? "检查登录状态..." : "Checking login status..."}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Lock className="h-7 w-7 text-blue-600" />
            </div>
            <CardTitle className="text-xl text-gray-900">{isZh ? "需要登录" : "Login Required"}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              You need to sign in to access this page.
            </p>
            <div className="text-xs text-gray-500 bg-gray-100 rounded-lg p-2">
              Requested path: {location.pathname}
            </div>
            <Button onClick={() => navigate('/auth/login')} className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
