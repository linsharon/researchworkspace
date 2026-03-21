"""
Script to initialize sample papers for demonstration.
Run this once to create two sample papers - one with PDF and one without.
"""

import asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models.base import Base
from models.manuscript import Paper, Project
from core.config import settings

# Sample PDF content (mock)
SAMPLE_PDF_CONTENT = """
<html>
<head><title>Sample Research Paper</title></head>
<body>
<h1>Machine Learning in Education: A Comprehensive Review</h1>

<h2>Abstract</h2>
<p>This paper presents a comprehensive review of machine learning applications in educational technology. We analyze current trends, challenges, and future directions in AI-powered learning systems.</p>

<h2>1. Introduction</h2>
<p>Machine learning has revolutionized numerous fields, and education is no exception. With the explosion of educational technology, there is an urgent need to understand how machine learning can enhance student learning outcomes.</p>

<p>The intersection of machine learning and education presents both opportunities and challenges. On one hand, AI-powered systems can provide personalized learning experiences at scale. On the other hand, issues around fairness, transparency, and ethical use of student data remain unresolved.</p>

<h2>2. Literature Review</h2>
<p>Recent studies have shown that intelligent tutoring systems powered by machine learning can significantly improve student engagement and learning outcomes. Key applications include:</p>

<ul>
<li>Adaptive learning systems that personalize content based on student performance</li>
<li>Automated grading systems that provide immediate feedback</li>
<li>Predictive analytics for early identification of at-risk students</li>
<li>Recommendation systems for learning resource discovery</li>
</ul>

<h2>3. Methodology</h2>
<p>We conducted a systematic literature review of papers published between 2018-2024. Our search included major databases including Google Scholar, ERIC, and ACM Digital Library.</p>

<h2>4. Results</h2>
<p>Our analysis of 150+ papers reveals that machine learning applications in education are rapidly growing. However, most implementations focus on specific tasks like grade prediction or content recommendation, rather than holistic learning environments.</p>

<h2>5. Discussion</h2>
<p>The field of machine learning in education is still in its infancy. While early results are promising, more research is needed to understand long-term impacts on student learning and development.</p>

<h2>6. Conclusion</h2>
<p>This paper provides a comprehensive overview of current machine learning applications in education. We identify key challenges and propose future research directions.</p>

<h2>References</h2>
<p>[1] Smith, J., et al. (2023). AI in Education: A Survey. Journal of Educational Technology.</p>
<p>[2] Johnson, K. (2024). Machine Learning for Personalized Learning. Educational Technology Review.</p>
</body>
</html>
"""


async def init_sample_papers():
    """Initialize two sample papers in the database."""
    
    # Create async engine and session
    engine = create_async_engine(settings.database_url, echo=False)
    
    # Create tables first
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # First, ensure the project exists
            project_id = "proj-demo-1"
            project = await session.get(Project, project_id)
            
            if not project:
                project = Project(
                    id=project_id,
                    title="AI in Education Research",
                    description="Demonstration project for reading interface",
                )
                session.add(project)
                print(f"✓ Created project: {project_id}")
            
            # Paper 1: WITH PDF
            paper1_id = "demo-paper-with-pdf"
            paper1 = await session.get(Paper, paper1_id)
            
            if not paper1:
                paper1 = Paper(
                    id=paper1_id,
                    title="Machine Learning in Education: A Comprehensive Review",
                    authors=["Chen, L.", "Wang, P.", "Zhang, H."],
                    year=2024,
                    journal="Computers & Education",
                    abstract="This comprehensive review examines the current state of machine learning applications in higher education. We analyze 150+ studies, identifying key trends including personalization algorithms, adaptive learning systems, and automated assessment tools.",
                    url="https://example.com/paper1",
                    pdf_path="sample_research_paper.pdf",  # Has PDF
                    discovery_path="Google Scholar",
                    discovery_note="Found while searching for AI in education",
                    is_entry_paper=True,
                    is_expanded_paper=False,
                    reading_status="Reading",
                    relevance="high",
                    project_id=project_id,
                )
                session.add(paper1)
                print(f"✓ Created paper WITH PDF: {paper1_id}")
            
            # Paper 2: WITHOUT PDF
            paper2_id = "demo-paper-no-pdf"
            paper2 = await session.get(Paper, paper2_id)
            
            if not paper2:
                paper2 = Paper(
                    id=paper2_id,
                    title="Self-Regulated Learning in Technology-Enhanced Environments: A Meta-Analysis",
                    authors=["Kim, S.", "Park, J.", "Lee, M."],
                    year=2023,
                    journal="Educational Psychology Review",
                    abstract="This meta-analysis synthesizes findings from 52 studies examining self-regulated learning (SRL) in technology-enhanced learning environments. Results indicate that technology scaffolds can significantly support SRL processes.",
                    url="https://example.com/paper2",
                    pdf_path=None,  # NO PDF
                    discovery_path="ResearchGate",
                    discovery_note="Recommended by colleague",
                    is_entry_paper=False,
                    is_expanded_paper=False,
                    reading_status="To Read",
                    relevance="high",
                    project_id=project_id,
                )
                session.add(paper2)
                print(f"✓ Created paper WITHOUT PDF: {paper2_id}")
            
            # Commit changes
            await session.commit()
            print("\n✅ Sample papers initialized successfully!")
            print(f"   - Project: {project_id}")
            print(f"   - Paper 1 (with PDF): {paper1_id}")
            print(f"   - Paper 2 (no PDF): {paper2_id}")
            
        except Exception as e:
            print(f"❌ Error initializing sample papers: {e}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_sample_papers())
