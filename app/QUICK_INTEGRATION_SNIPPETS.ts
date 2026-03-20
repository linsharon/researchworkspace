/**
 * QUICK INTEGRATION GUIDE WITH CODE SNIPPETS
 * Copy-paste ready code for immediate integration
 */

// ============================================================
// SNIPPET 1: Update App.tsx - Add Route
// ============================================================

/*
Location: app/frontend/src/App.tsx

FIND THIS (around line 1-20):
*/
import PaperWorkspace from "@/pages/PaperWorkspace";
import PdfViewer from "@/pages/PdfViewer";

/*
ADD THIS:
*/
import PaperReadPage from "@/components/reading/PaperReadPage";

/*
THEN FIND THIS (around line 30-40, the routes variable/array):
*/
const routes = [
  { path: "/", element: <Index /> },
  { path: "/workflow", element: <WorkflowWorkspace /> },
  { path: "/paper-detail", element: <PaperWorkspace /> },
  { path: "/pdf-viewer", element: <PdfViewer /> },
  // ... more routes
];

/*
ADD THIS LINE in the routes array:
*/
{ path: "/paper-read/:paperId", element: <PaperReadPage /> },

/*
FINAL routes array should look like:
*/
const routes = [
  { path: "/", element: <Index /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/auth/error", element: <AuthError /> },
  { path: "/auth/logout-callback", element: <LogoutCallbackPage /> },
  { path: "/workflow", element: <WorkflowWorkspace /> },
  { path: "/paper-detail", element: <PaperWorkspace /> },
  { path: "/paper-read/:paperId", element: <PaperReadPage /> }, // ← NEW
  { path: "/pdf-viewer", element: <PdfViewer /> },
  { path: "/draft-studio", element: <DraftStudio /> },
  { path: "/artifact-center", element: <ArtifactCenter /> },
  { path: "*", element: <NotFound /> },
];

// ============================================================
// SNIPPET 2: Update WorkflowWorkspace.tsx - Add Step 3
// ============================================================

/*
Location: app/frontend/src/pages/WorkflowWorkspace.tsx

FIND THIS (around line 1-50, the imports section):
*/
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/*
ADD THIS:
*/
import Step3ReadFoundPapers from "@/components/workflow/Step3ReadFoundPapers";

/*
THEN FIND THIS (search for "currentStep === 2" - around line ~1680-1750):
*/
{currentStep === 2 && (
  // Step 2 content here
)}

/*
ADD THIS AFTER Step 2:
*/
{currentStep === 3 && (
  <Step3ReadFoundPapers projectId={project.id} />
)}

/*
FULL EXAMPLE:
*/
{currentStep === 1 && (
  // Step 1 purposes content
)}
{currentStep === 2 && (
  // Step 2 discovery content
)}
{currentStep === 3 && (
  <Step3ReadFoundPapers projectId={project.id} /> // ← NEW
)}
{currentStep === 4 && (
  // Step 4 expand content
)}

// ============================================================
// SNIPPET 3: Add Step 2 Validation
// ============================================================

/*
Location: In WorkflowWorkspace.tsx, find the "next step" button handler
Search for: "handleNextStep" or "STEP_META" or "currentStep + 1"

FIND the code that looks like this:
*/
const handleNextStep = () => {
  setCurrentStep((prev) => (prev + 1) as WorkflowStep);
};

/*
UPDATE IT TO:
*/
const handleNextStep = () => {
  // Validate Step 2 entry papers
  if (currentStep === 2) {
    const entryPapers = candidatePapers.filter((p) => p.isEntryPaper);
    if (entryPapers.length === 0) {
      alert(
        "Please mark at least one paper as an Entry Paper before proceeding to Step 3"
      );
      return;
    }
  }

  setCurrentStep((prev) => {
    const next = prev + 1;
    return next <= 6 ? (next as WorkflowStep) : prev;
  });
};

// ============================================================
// SNIPPET 4: Add Global CSS
// ============================================================

/*
Location: app/frontend/src/App.css (or your main global CSS file)

ADD THIS to the end of the file:
*/

/* Flexbox utilities for 3:1 layout */
.flex-2 {
  flex: 2 1 0%;
}

.flex-1 {
  flex: 1 1 0%;
}

/* PDF/Reading area styles */
.pdf-reader {
  user-select: text;
  font-family: "Georgia", serif;
  line-height: 1.8;
}

.pdf-reader p {
  cursor: text;
  margin-bottom: 1rem;
}

/* Highlight colors */
.highlight-yellow {
  background-color: rgba(253, 224, 71, 0.4);
  padding: 2px 4px;
  border-radius: 2px;
}

.highlight-green {
  background-color: rgba(167, 243, 208, 0.4);
  padding: 2px 4px;
  border-radius: 2px;
}

.highlight-red {
  background-color: rgba(252, 165, 165, 0.4);
  padding: 2px 4px;
  border-radius: 2px;
}

.highlight-blue {
  background-color: rgba(191, 219, 254, 0.4);
  padding: 2px 4px;
  border-radius: 2px;
}

/* Floating toolbar animation */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.floating-toolbar {
  animation: slideUp 0.2s ease-out;
}

// ============================================================
// SNIPPET 5: Database Migration Commands
// ============================================================

/*
Run these commands in order:

1. Navigate to backend:
   cd /workspaces/researchworkspace/app/backend

2. Create migration file:
   alembic revision --autogenerate -m "Add manuscript system: papers, notes, highlights, concepts"

3. Apply migration:
   alembic upgrade head

4. Verify (for SQLite):
   sqlite3 app.db ".tables"
   
   Output should include: papers, notes, highlights, concepts, projects

5. Check schema:
   sqlite3 app.db ".schema papers"

If you encounter issues:
  - Check alembic/env.py has correct import of new models
  - Ensure models/manuscript.py imports are correct
  - Try: alembic stamp head
*/

// ============================================================
// SNIPPET 6: Backend Add Model to __init__.py
// ============================================================

/*
Location: app/backend/models/__init__.py

MAKE SURE this file has:
*/
from models.auth import User, Session  // existing
from models.manuscript import (        // ADD THIS
    Paper,
    Note, 
    Highlight,
    Concept,
    Project,
)

__all__ = [
    "User",
    "Session",
    "Paper",        // ADD THESE
    "Note",
    "Highlight",
    "Concept",
    "Project",
]

// ============================================================
// SNIPPET 7: Test API Endpoint
// ============================================================

/*
After backend is running, test with curl:

1. Create a paper:
*/
curl -X POST http://localhost:8000/api/v1/manuscripts/papers \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Machine Learning Fundamentals",
    "authors": ["John Doe", "Jane Smith"],
    "year": 2024,
    "journal": "AI Review",
    "abstract": "A comprehensive study of ML algorithms",
    "project_id": "test-project-123",
    "discovery_path": "Google Scholar",
    "discovery_note": "Found while searching for neural networks"
  }'

/*
Response should include paper ID, copy it for next steps

2. Mark as entry paper:
*/
curl -X PUT http://localhost:8000/api/v1/manuscripts/papers/{PAPER_ID_FROM_ABOVE} \
  -H "Content-Type: application/json" \
  -d '{"is_entry_paper": true}'

/*
3. List entry papers:
*/
curl "http://localhost:8000/api/v1/manuscripts/papers/entry-papers?project_id=test-project-123"

/*
4. Create a note:
*/
curl -X POST http://localhost:8000/api/v1/manuscripts/notes \
  -H "Content-Type: application/json" \
  -d '{
    "paper_id": "{PAPER_ID}",
    "project_id": "test-project-123",
    "title": "Key findings on neural networks",
    "description": "The paper discusses three main architectures",
    "note_type": "literature-note",
    "keywords": ["neural-networks", "deep-learning"],
    "page": 5
  }'

// ============================================================
// SNIPPET 8: Verify All Components Exist
// ============================================================

/*
Run this in terminal to check all created files exist:
*/

// In app/backend:
ls -la models/manuscript.py
ls -la routers/manuscript.py

// In app/frontend:
ls -la src/lib/manuscript-api.ts
ls -la src/components/workflow/Step3ReadFoundPapers.tsx
ls -la src/components/reading/PaperReadPage.tsx
ls -la src/components/reading/PaperReadingArea.tsx
ls -la src/components/reading/PDFHighlightReader.tsx
ls -la src/components/reading/PaperToolsArea.tsx

// ============================================================
// SNIPPET 9: Missing Components Installation
// ============================================================

/*
If any shadcn/ui components are missing, install with:
*/

npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add tooltip
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add separator

// ============================================================
// SNIPPET 10: Quick Debugging
// ============================================================

/*
If Step 3 doesn't show:
1. Check browser console for JS errors
2. Verify project ID is being passed
3. Check API response: DevTools → Network → /manuscripts/papers/entry-papers

If highlighting doesn't work:
1. Check PDFHighlightReader is rendering
2. Try selecting text in mock content
3. Check browser console for API errors

If notes don't save:
1. Check backend is running on port 8000
2. Verify API endpoint in manuscript-api.ts
3. Check browser Network tab for POST request status
4. Check backend logs for error details

If status change doesn't persist:
1. Watch DevTools Network → PUT /papers/{id}
2. Check response status (should be 200)
3. Reload page to verify persistence
*/

export const SNIPPETS_READY = true;
