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
import NotFound from './pages/NotFound';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
// MODULE_IMPORTS_START
// MODULE_IMPORTS_END

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* MODULE_PROVIDERS_START */}
    {/* MODULE_PROVIDERS_END */}
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/workflow/:step" element={<WorkflowWorkspace />} />
            <Route path="/artifacts" element={<ArtifactCenter />} />
            <Route path="/paper/:paperId" element={<PaperWorkspace />} />
            <Route path="/pdf/:paperId" element={<PdfViewer />} />
            <Route path="/visualization" element={<VisualizationBoard />} />
            <Route path="/draft" element={<DraftStudio />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/error" element={<AuthError />} />
            {/* MODULE_ROUTES_START */}
            {/* MODULE_ROUTES_END */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
    {/* MODULE_PROVIDERS_CLOSE */}
  </QueryClientProvider>
);

export default App;