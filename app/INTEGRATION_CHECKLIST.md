/**
 * INTEGRATION CHECKLIST AND CODE SNIPPETS
 * Follow these steps to fully integrate the paper reading system
 */

// ============================================================
// STEP 1: UPDATE App.tsx with new routes
// ============================================================

/*
Find the routes array in App.tsx (around line 30-40) and ADD:

import PaperReadPage from "@/components/reading/PaperReadPage";

Then add to the routes array:
{
  path: "/paper-read/:paperId",
  element: <PaperReadPage />,
},

Full example location:
```
const routes = [
  { path: "/", element: <Index /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  { path: "/auth/error", element: <AuthError /> },
  { path: "/auth/logout-callback", element: <LogoutCallbackPage /> },
  { path: "/workflow", element: <WorkflowWorkspace /> },
  { path: "/paper-detail", element: <PaperWorkspace /> },
  { path: "/paper-read/:paperId", element: <PaperReadPage /> },  // <-- ADD THIS
  { path: "/pdf-viewer", element: <PdfViewer /> },
  { path: "/draft-studio", element: <DraftStudio /> },
  { path: "/artifact-center", element: <ArtifactCenter /> },
  ...
];
```
*/

// ============================================================
// STEP 2: UPDATE WorkflowWorkspace.tsx - Add Step 3
// ============================================================

/*
In WorkflowWorkspace.tsx, find the section where steps are rendered.

ADD import at top:
import Step3ReadFoundPapers from "@/components/workflow/Step3ReadFoundPapers";

REPLACE or UPDATE the step rendering section (around currentStep === 3):

Before looking for it, search for: "currentStep === 1" to find the pattern

Then add (if not existing) or replace:
```
{currentStep === 3 && (
  <Step3ReadFoundPapers projectId={project.id} />
)}
```

Example structure you'll see:
```
{currentStep === 1 && (
  // Step 1 content
)}
{currentStep === 2 && (
  // Step 2 content
)}
{currentStep === 3 && (
  <Step3ReadFoundPapers projectId={project.id} />  // <-- ADD THIS
)}
```
*/

// ============================================================
// STEP 3: UPDATE STEP 2 - Add Entry Paper Validation
// ============================================================

/*
In WorkflowWorkspace.tsx, find the navigation buttons (around where it handles next/previous step).

Find the code that handles moving from Step 2 to Step 3, and ADD validation:

```
const handleNextStep = () => {
  if (currentStep === 2) {
    // Validate entry papers
    const entryPapers = candidatePapers.filter(p => p.is_entry_paper);
    if (entryPapers.length === 0) {
      alert("Please mark at least one paper as an Entry Paper before proceeding to Step 3");
      return;
    }
  }
  setCurrentStep((prev) => (prev + 1) as WorkflowStep);
};
```
*/

// ============================================================
// STEP 4: Global CSS for flexbox layout
// ============================================================

/*
Add to your global CSS file (likely App.css or globals.css):

```css
.flex-2 {
  flex: 2 1 0%;
}

.flex-1 {
  flex: 1 1 0%;
}

/* Optional: Better PDF reader styling */
.pdf-reader {
  user-select: text;
  
  p {
    cursor: text;
  }
}

/* Highlight colors */
.highlight-yellow {
  background-color: rgba(253, 224, 71, 0.5);
}

.highlight-green {
  background-color: rgba(167, 243, 208, 0.5);
}

.highlight-red {
  background-color: rgba(252, 165, 165, 0.5);
}

.highlight-blue {
  background-color: rgba(191, 219, 254, 0.5);
}
```
*/

// ============================================================
// STEP 5: Backend Migration Setup
// ============================================================

/*
Execute these commands in your terminal:

1. Navigate to backend directory:
   cd /workspaces/researchworkspace/app/backend

2. Check current migrations:
   alembic current

3. Create new migration for manuscript models:
   alembic revision --autogenerate -m "Add manuscript models: papers, notes, highlights, concepts"

4. Apply migration:
   alembic upgrade head

5. Verify migration by checking database (if using SQLite):
   sqlite3 app.db ".tables"
   
   You should see: papers, notes, highlights, concepts, projects (plus existing auth tables)
*/

// ============================================================
// STEP 6: Test Manual API Calls (Optional, for debugging)
// ============================================================

/*
curl examples to test the API:

1. Create a paper:
curl -X POST http://localhost:8000/api/v1/manuscripts/papers \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Paper",
    "authors": ["Author 1"],
    "year": 2024,
    "journal": "Test Journal",
    "project_id": "test-project",
    "discovery_path": "Test"
  }'

2. List papers:
curl http://localhost:8000/api/v1/manuscripts/papers?project_id=test-project

3. Update paper:
curl -X PUT http://localhost:8000/api/v1/manuscripts/papers/{paper_id} \
  -H "Content-Type: application/json" \
  -d '{"is_entry_paper": true}'

4. Create note:
curl -X POST http://localhost:8000/api/v1/manuscripts/notes \
  -H "Content-Type: application/json" \
  -d '{
    "paper_id": "{paper_id}",
    "project_id": "test-project",
    "title": "Test Note",
    "note_type": "literature-note"
  }'
*/

// ============================================================
// STEP 7: Component Import Verification
// ============================================================

/*
Verify all UI components exist in your project:

Required imports in components:
1. @/components/ui/button ✓
2. @/components/ui/card ✓
3. @/components/ui/badge ✓
4. @/components/ui/tabs ✓
5. @/components/ui/dialog ✓
6. @/components/ui/input ✓
7. @/components/ui/textarea ✓
8. @/components/ui/select ✓
9. @/components/ui/tooltip ✓
10. @/components/ui/alert-dialog ✓

If any are missing, install with:
npx shadcn-ui@latest add {component-name}
*/

// ============================================================
// STEP 8: TESTING CHECKLIST
// ============================================================

/*
After all integration, test these workflows:

WORKFLOW 1: Mark Entry Papers
[ ] Go to Step 2
[ ] Add some candidate papers
[ ] Mark at least 1 as entry paper
[ ] Click next → should go to Step 3
[ ] Verify alert if trying to skip without entry papers

WORKFLOW 2: Read Papers
[ ] In Step 3, see list of entry/expanded papers
[ ] Click on a paper title
[ ] Should navigate to /paper-read/{id}
[ ] See 3:1 layout with reading area and tools

WORKFLOW 3: Highlighting
[ ] In reading area, select some text
[ ] See floating toolbar
[ ] Click each color - see highlights (currently local)
[ ] Click Add Note button
[ ] Fill form and save
[ ] See note appear in tools area

WORKFLOW 4: Notes Management
[ ] In tools area, click "Add Note"
[ ] Fill all fields
[ ] Try both "Literature Note" and "Permanent Note"
[ ] See note saved in list
[ ] Delete note - should disappear
[ ] Check notes are persisted (reload page)

WORKFLOW 5: Exit & Status
[ ] Change status from "Reading" to "Completed"
[ ] Click back
[ ] Should see exit dialog
[ ] Select status and save
[ ] Navigate back, paper should show new status
*/

// ============================================================
// ADVANCED: Enabling PDF Upload (Phase 2)
// ============================================================

/*
To add real PDF upload support, you'll need:

1. pdfjs-dist library:
   npm install pdfjs-dist

2. Create PDF upload endpoint in backend/routers/manuscript.py:
   
   @router.post("/papers/{paper_id}/upload-pdf")
   async def upload_pdf(
       paper_id: str,
       file: UploadFile = File(...),
       session: AsyncSession = Depends(get_db)
   ):
       # Save file and return path
       ...

3. Update PaperReadingArea.tsx to use actual PDF viewer:
   
   import * as pdfjsLib from "pdfjs-dist";
   
   // Load and render PDF
   const renderPdf = async (filePath: string) => {
       const pdf = await pdfjsLib.getDocument(filePath).promise;
       // Extract text for highlighting
   }

4. Enable text copying from PDF rendering
*/

// ============================================================
// ENDPOINTS CREATED (API Documentation)
// ============================================================

/*
BASE URL: /api/v1/manuscripts

PAPERS:
  POST   /papers                    - Create paper
  GET    /papers                    - List papers (project_id param)
  GET    /papers/{id}               - Get paper
  PUT    /papers/{id}               - Update paper
  DELETE /papers/{id}               - Delete paper
  GET    /papers/entry-papers       - List entry + expanded papers

NOTES:
  POST   /notes                     - Create note
  GET    /notes                     - List notes (paper_id param)
  GET    /notes/{id}                - Get note
  PUT    /notes/{id}                - Update note
  DELETE /notes/{id}                - Delete note

HIGHLIGHTS:
  POST   /highlights                - Create highlight  
  GET    /highlights                - List highlights (paper_id param)
  DELETE /highlights/{id}           - Delete highlight

CONCEPTS:
  POST   /concepts                  - Create concept
  GET    /concepts                  - List concepts (project_id param)
*/

export const INTEGRATION_CHECKLIST = {
  step1_update_app_routes: false,
  step2_update_workflow: false,
  step3_add_validation: false,
  step4_add_css: false,
  step5_database_migration: false,
  step6_test_api: false,
  step7_verify_components: false,
  step8_test_workflows: false,
};
