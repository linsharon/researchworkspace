# Academic Reading & Writing Workspace - Development Plan

## Design Guidelines

### Design References (Primary Inspiration)
- **Notion.so**: Clean workspace feel, sidebar navigation, card-based content
- **Linear.app**: Modern SaaS, structured workflow, calm aesthetics
- **Roam Research**: Academic knowledge management, interconnected notes
- **Style**: Academic Minimalism + Calm SaaS + Workflow-Driven

### Color Palette
- Primary Background: #FFFFFF (White)
- Secondary Background: #F8FAFC (Slate-50)
- Tertiary Background: #F1F5F9 (Slate-100)
- Border: #E2E8F0 (Slate-200)
- Primary Accent: #1E3A5F (Deep Navy Blue)
- Secondary Accent: #2D6A4F (Muted Forest Green)
- Text Primary: #0F172A (Slate-900)
- Text Secondary: #64748B (Slate-500)
- Success: #16A34A (Green-600)
- Warning: #F59E0B (Amber-500)
- Info: #3B82F6 (Blue-500)

### Typography
- Font Family: Inter (clean, professional, academic)
- Heading1: Inter font-weight 700 (32px)
- Heading2: Inter font-weight 600 (24px)
- Heading3: Inter font-weight 600 (18px)
- Body: Inter font-weight 400 (14px)
- Caption: Inter font-weight 400 (12px)
- Monospace: JetBrains Mono for code/metadata

### Key Component Styles
- **Cards**: White bg, 1px slate-200 border, 8px rounded, subtle shadow on hover
- **Buttons Primary**: Deep Navy (#1E3A5F) bg, white text, 6px rounded
- **Buttons Secondary**: White bg, slate-200 border, slate-700 text
- **Progress Bar**: Navy gradient with green completion
- **Sidebar**: Slate-50 bg, 1px right border
- **Tags/Badges**: Rounded-full, light colored backgrounds

### Layout
- Left Sidebar: 240px fixed
- Main Content: Flexible
- Right Panel: 300px collapsible
- Section padding: 24px
- Card gap: 16px

### Images to Generate
1. **hero-academic-workspace.jpg** - A calm, minimalist desk setup with open books, laptop, and notes, soft natural lighting, academic atmosphere (Style: photorealistic, warm tones)
2. **workflow-illustration.jpg** - Abstract illustration of connected nodes and flowing arrows representing a research workflow, using navy blue and forest green colors (Style: minimalist, vector-like)
3. **visualization-network.jpg** - Abstract network graph visualization with interconnected nodes in navy and green tones, representing knowledge connections (Style: minimalist, data-viz aesthetic)
4. **writing-studio-bg.jpg** - A serene writing environment with soft light, papers and pen, scholarly atmosphere (Style: photorealistic, calm mood)

---

## File Structure (8 files max)

1. **src/pages/Index.tsx** - Project Dashboard (homepage)
2. **src/pages/WorkflowWorkspace.tsx** - Workflow Step Workspace (all 6 steps)
3. **src/pages/ArtifactCenter.tsx** - Artifact Center
4. **src/pages/PaperWorkspace.tsx** - Paper Workspace
5. **src/pages/VisualizationBoard.tsx** - Visualization Board
6. **src/pages/DraftStudio.tsx** - Draft Studio
7. **src/components/AppLayout.tsx** - Global layout (sidebar + main + right panel)
8. **src/lib/data.ts** - All dummy data and types

## Development Tasks
1. Create dummy data and types (data.ts)
2. Create global layout component (AppLayout.tsx)
3. Create Project Dashboard (Index.tsx) - homepage
4. Create Workflow Workspace (WorkflowWorkspace.tsx)
5. Create Artifact Center (ArtifactCenter.tsx)
6. Create Paper Workspace (PaperWorkspace.tsx)
7. Create Visualization Board (VisualizationBoard.tsx)
8. Create Draft Studio (DraftStudio.tsx)
9. Update App.tsx routes and index.html
10. Generate images
11. Lint and build check