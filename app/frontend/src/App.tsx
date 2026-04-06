import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import Index from './pages/Index';
import WorkflowWorkspace from './pages/WorkflowWorkspace';
import ArtifactCenter from './pages/ArtifactCenter';
import PaperWorkspace from './pages/PaperWorkspace';
import PdfViewer from './pages/PdfViewer';
import VisualizationBoard from './pages/VisualizationBoard';
import DraftStudio from './pages/DraftStudio';
import PaperReadPage from './components/reading/PaperReadPage';
import PdfManager from './pages/PdfManager';
import NotFound from './pages/NotFound';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import AdminActivity from './pages/AdminActivity';
import DocumentCenter from './pages/DocumentCenter';
// MODULE_IMPORTS_START
// MODULE_IMPORTS_END

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* MODULE_PROVIDERS_START */}
    {/* MODULE_PROVIDERS_END */}
    <AuthProvider>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/workflow/:projectId/:step" element={<ProtectedRoute><WorkflowWorkspace /></ProtectedRoute>} />
              <Route path="/artifacts" element={<ProtectedRoute><ArtifactCenter /></ProtectedRoute>} />
              <Route path="/paper/:paperId" element={<ProtectedRoute><PaperWorkspace /></ProtectedRoute>} />
              <Route path="/paper-read/:projectId/:paperId" element={<ProtectedRoute><PaperReadPage /></ProtectedRoute>} />
              <Route path="/pdf/:paperId" element={<ProtectedRoute><PdfViewer /></ProtectedRoute>} />
              <Route path="/pdf-manager" element={<ProtectedRoute><PdfManager /></ProtectedRoute>} />
              <Route path="/visualization" element={<ProtectedRoute><VisualizationBoard /></ProtectedRoute>} />
              <Route path="/draft" element={<ProtectedRoute><DraftStudio /></ProtectedRoute>} />
              <Route path="/admin/activity" element={<ProtectedAdminRoute><AdminActivity /></ProtectedAdminRoute>} />
              <Route path="/documents" element={<ProtectedRoute><DocumentCenter /></ProtectedRoute>} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/error" element={<AuthError />} />
              {/* MODULE_ROUTES_START */}
              {/* MODULE_ROUTES_END */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </AuthProvider>
    {/* MODULE_PROVIDERS_CLOSE */}
  </QueryClientProvider>
);

export default App;