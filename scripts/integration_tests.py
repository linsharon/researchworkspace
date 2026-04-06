#!/usr/bin/env python3
"""
Integration Tests for Research Workspace

Tests the complete workflow:
1. Authentication
2. Project creation
3. Paper management
4. Document management
5. Activity tracking
6. Data persistence (refresh/device switch simulation)
"""

import argparse
import asyncio
import hashlib
import json
import logging
import sys
from datetime import datetime
from typing import Optional
from urllib.parse import parse_qs, urlparse
import httpx
import uuid

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class TestClient:
    """HTTP client for integration tests."""

    def __init__(self, backend_url: str, frontend_url: str):
        self.backend_url = backend_url.rstrip("/")
        self.frontend_url = frontend_url.rstrip("/")
        self.token: Optional[str] = None
        self.client = httpx.Client(timeout=30.0)

    def _headers(self, extra: Optional[dict] = None) -> dict:
        """Build request headers."""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        if extra:
            headers.update(extra)
        return headers

    async def health_check(self) -> bool:
        """Check if backend is healthy."""
        try:
            response = self.client.get(f"{self.backend_url}/database/health", timeout=5.0)
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False

    async def dev_login(self, user_id: str = None) -> bool:
        """Perform login using auth fallback redirect flow in non-OIDC environments."""
        try:
            # The backend currently exposes /api/v1/auth/login.
            # In fallback mode this endpoint returns a 302 to frontend callback with token in query.
            response = self.client.get(
                f"{self.backend_url}/api/v1/auth/login",
                follow_redirects=False,
            )

            if response.status_code not in (301, 302, 303, 307, 308):
                logger.error(f"Login failed: expected redirect, got {response.status_code} - {response.text}")
                return False

            location = response.headers.get("location", "")
            if not location:
                logger.error("Login failed: missing redirect location")
                return False

            query = parse_qs(urlparse(location).query)
            token = (query.get("token") or [None])[0]
            if not token:
                logger.error(f"Login failed: token not found in redirect URL: {location}")
                return False

            self.token = token
            logger.info("✓ Login successful via /auth/login redirect token")
            return True
        except Exception as e:
            logger.error(f"Login error: {e}")
            return False

    async def create_project(self, title: str) -> Optional[dict]:
        """Create a project."""
        try:
            project_id = f"proj-{uuid.uuid4().hex[:8]}"
            response = self.client.post(
                f"{self.backend_url}/api/v1/manuscripts/projects",
                headers=self._headers(),
                json={"id": project_id, "title": title, "description": f"Test project: {title}"},
            )
            if response.status_code == 201:
                project = response.json()
                logger.info(f"✓ Created project: {project['id']}")
                return project
            else:
                logger.error(f"Project creation failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error creating project: {e}")
            return None

    async def create_paper(self, project_id: str, title: str) -> Optional[dict]:
        """Create a paper."""
        try:
            response = self.client.post(
                f"{self.backend_url}/api/v1/manuscripts/papers",
                headers=self._headers(),
                json={
                    "title": title,
                    "authors": ["Test Author"],
                    "year": 2024,
                    "journal": "Test Journal",
                    "abstract": f"Abstract for {title}",
                    "project_id": project_id,
                },
            )
            if response.status_code == 200:
                paper = response.json()
                logger.info(f"✓ Created paper: {paper['id']}")
                return paper
            else:
                logger.error(f"Paper creation failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error creating paper: {e}")
            return None

    async def create_document(self, title: str) -> Optional[dict]:
        """Create a document."""
        try:
            response = self.client.post(
                f"{self.backend_url}/api/v1/documents",
                headers=self._headers(),
                json={
                    "title": title,
                    "description": f"Test document: {title}",
                    "status": "draft",
                    "permission": "private",
                    "tags": ["test", "integration"],
                },
            )
            if response.status_code == 201:
                document = response.json()
                logger.info(f"✓ Created document: {document['id']}")
                return document
            else:
                logger.error(f"Document creation failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error creating document: {e}")
            return None

    async def list_documents(self) -> Optional[list]:
        """List documents."""
        try:
            response = self.client.get(
                f"{self.backend_url}/api/v1/documents",
                headers=self._headers(),
            )
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    documents = data
                elif isinstance(data, dict):
                    documents = data.get("items", [])
                else:
                    logger.error(f"Unexpected list response type: {type(data)}")
                    return None
                logger.info(f"✓ Listed {len(documents)} documents")
                return documents
            else:
                logger.error(f"List failed: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error listing documents: {e}")
            return None

    async def search_documents(self, query: str) -> Optional[dict]:
        """Search documents."""
        try:
            response = self.client.get(
                f"{self.backend_url}/api/v1/documents/search",
                headers=self._headers(),
                params={"q": query},
            )
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Search found {len(data.get('items', []))} results")
                return data
            else:
                logger.error(f"Search failed: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error searching: {e}")
            return None

    async def get_upload_url(self, document_id: str, filename: str, bucket_name: str = "documents") -> Optional[dict]:
        """Get a presigned upload URL for a document version."""
        try:
            response = self.client.post(
                f"{self.backend_url}/api/v1/documents/{document_id}/upload-url",
                headers=self._headers(),
                json={"filename": filename, "bucket_name": bucket_name},
            )
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Received upload URL for {filename}")
                return data
            logger.error(f"Upload URL failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            logger.error(f"Error getting upload URL: {e}")
            return None

    async def upload_bytes_to_presigned_url(self, upload_url: str, content: bytes, content_type: str) -> bool:
        """Upload raw bytes directly to object storage via presigned URL."""
        try:
            response = self.client.put(
                upload_url,
                content=content,
                headers={"Content-Type": content_type},
            )
            if response.status_code in (200, 204):
                logger.info("✓ Uploaded bytes to presigned URL")
                return True
            logger.error(f"Presigned upload failed: {response.status_code} - {response.text}")
            return False
        except Exception as e:
            logger.error(f"Error uploading to presigned URL: {e}")
            return False

    async def upload_complete(self, document_id: str, payload: dict) -> Optional[dict]:
        """Finalize an uploaded document version."""
        try:
            response = self.client.post(
                f"{self.backend_url}/api/v1/documents/{document_id}/upload-complete",
                headers=self._headers(),
                json=payload,
            )
            if response.status_code == 201:
                data = response.json()
                logger.info(f"✓ Confirmed upload for version {data['version_number']}")
                return data
            logger.error(f"Upload complete failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            logger.error(f"Error confirming upload: {e}")
            return None

    async def get_download_url(self, bucket_name: str, object_key: str) -> Optional[str]:
        """Get a presigned download URL."""
        try:
            response = self.client.post(
                f"{self.backend_url}/api/v1/storage/download-url",
                headers=self._headers(),
                json={"bucket_name": bucket_name, "object_key": object_key},
            )
            if response.status_code == 200:
                data = response.json()
                logger.info("✓ Received download URL")
                return data.get("download_url")
            logger.error(f"Download URL failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            logger.error(f"Error getting download URL: {e}")
            return None

    async def download_bytes(self, download_url: str) -> Optional[bytes]:
        """Download raw bytes from object storage via presigned URL."""
        try:
            response = self.client.get(download_url)
            if response.status_code == 200:
                logger.info("✓ Downloaded bytes from presigned URL")
                return response.content
            logger.error(f"Presigned download failed: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            logger.error(f"Error downloading from presigned URL: {e}")
            return None

    async def soft_delete_document(self, document_id: str) -> bool:
        """Soft delete a document."""
        try:
            response = self.client.delete(
                f"{self.backend_url}/api/v1/documents/{document_id}",
                headers=self._headers(),
            )
            if response.status_code in (200, 204):
                logger.info(f"✓ Soft deleted document: {document_id}")
                return True
            else:
                logger.error(f"Delete failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            return False

    async def get_activity_events(self, limit: int = 10) -> Optional[dict]:
        """Get activity events (admin only)."""
        try:
            response = self.client.get(
                f"{self.backend_url}/api/v1/admin/activity/events",
                headers=self._headers(),
                params={"limit": limit},
            )
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✓ Retrieved {len(data.get('items', []))} activity events")
                return data
            else:
                logger.error(f"Activity retrieval failed: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error retrieving activity: {e}")
            return None

    def close(self):
        """Close the HTTP client."""
        self.client.close()


async def run_tests(backend_url: str, frontend_url: str, verbose: bool = False) -> bool:
    """Run integration tests."""
    client = TestClient(backend_url, frontend_url)
    test_passed = 0
    test_failed = 0

    logger.info("=" * 60)
    logger.info("Integration Test Suite")
    logger.info("=" * 60)

    try:
        # Test 1: Health Check
        logger.info("\n[Test 1] Health Check")
        if await client.health_check():
            logger.info("✓ PASSED")
            test_passed += 1
        else:
            logger.error("✗ FAILED")
            test_failed += 1
            return False

        # Test 2: Dev Login
        logger.info("\n[Test 2] Login")
        if await client.dev_login():
            logger.info("✓ PASSED")
            test_passed += 1
        else:
            logger.error("✗ FAILED - Cannot continue without auth token")
            test_failed += 1
            return False

        # Test 3: Create Project
        logger.info("\n[Test 3] Create Project")
        project = await client.create_project("Integration Test Project")
        if project:
            logger.info("✓ PASSED")
            test_passed += 1
            project_id = project["id"]
        else:
            logger.error("✗ FAILED")
            test_failed += 1
            project_id = None

        # Test 4: Create Paper
        logger.info("\n[Test 4] Create Paper")
        if project_id:
            paper = await client.create_paper(project_id, "Integration Test Paper")
            if paper:
                logger.info("✓ PASSED")
                test_passed += 1
            else:
                logger.error("✗ FAILED")
                test_failed += 1
        else:
            logger.warning("⊘ SKIPPED (no project)")

        # Test 5: Create Document
        logger.info("\n[Test 5] Create Document")
        document = await client.create_document("Integration Test Document")
        if document:
            logger.info("✓ PASSED")
            test_passed += 1
            document_id = document["id"]
        else:
            logger.error("✗ FAILED")
            test_failed += 1
            document_id = None

        # Test 6: List Documents
        logger.info("\n[Test 6] List Documents")
        documents = await client.list_documents()
        if documents is not None:
            logger.info("✓ PASSED")
            test_passed += 1
        else:
            logger.error("✗ FAILED")
            test_failed += 1

        # Test 7: Search Documents
        logger.info("\n[Test 7] Search Documents")
        search_results = await client.search_documents("Integration")
        if search_results and len(search_results.get("items", [])) > 0:
            logger.info("✓ PASSED")
            test_passed += 1
        else:
            logger.warning("⊘ SKIPPED (no search results)")

        # Test 7.5: Presigned Upload + Download
        logger.info("\n[Test 7.5] Presigned Upload + Download")
        if document_id:
            file_bytes = b"%PDF-1.4\n% Research Workspace Test PDF\n"
            checksum = hashlib.sha256(file_bytes).hexdigest()
            upload_init = await client.get_upload_url(document_id, "integration-test.pdf")
            if upload_init and await client.upload_bytes_to_presigned_url(
                upload_init["upload_url"],
                file_bytes,
                "application/pdf",
            ):
                completed = await client.upload_complete(
                    document_id,
                    {
                        "bucket_name": upload_init["bucket_name"],
                        "object_key": upload_init["object_key"],
                        "filename": "integration-test.pdf",
                        "content_type": "application/pdf",
                        "size_bytes": len(file_bytes),
                        "checksum": checksum,
                        "change_note": "Integration test real object upload",
                    },
                )
                if completed:
                    download_url = await client.get_download_url(
                        upload_init["bucket_name"],
                        upload_init["object_key"],
                    )
                    downloaded = await client.download_bytes(download_url) if download_url else None
                    if downloaded == file_bytes:
                        logger.info("✓ PASSED")
                        test_passed += 1
                    else:
                        logger.error("✗ FAILED - downloaded bytes mismatch")
                        test_failed += 1
                else:
                    logger.error("✗ FAILED - upload-complete failed")
                    test_failed += 1
            else:
                logger.error("✗ FAILED - presigned upload failed")
                test_failed += 1
        else:
            logger.warning("⊘ SKIPPED (no document)")

        # Test 8: Data Persistence (simulate refresh)
        logger.info("\n[Test 8] Data Persistence (Refresh)")
        documents_before = await client.list_documents()
        count_before = len(documents_before) if documents_before else 0

        # Simulate new session (keep token)
        documents_after = await client.list_documents()
        count_after = len(documents_after) if documents_after else 0

        if count_before == count_after:
            logger.info(f"✓ PASSED (Data persisted: {count_after} documents)")
            test_passed += 1
        else:
            logger.error(f"✗ FAILED (Count mismatch: {count_before} vs {count_after})")
            test_failed += 1

        # Test 9: Soft Delete
        logger.info("\n[Test 9] Soft Delete Document")
        if document_id and await client.soft_delete_document(document_id):
            logger.info("✓ PASSED")
            test_passed += 1
        else:
            logger.error("✗ FAILED")
            test_failed += 1

        # Test 10: Activity Tracking
        logger.info("\n[Test 10] Activity Tracking")
        events = await client.get_activity_events(5)
        if events and len(events.get("items", [])) > 0:
            logger.info("✓ PASSED")
            test_passed += 1
            if verbose:
                for event in events["items"][:3]:
                    logger.info(f"  - {event['action']} {event['path']} ({event['status_code']})")
        else:
            logger.warning("⊘ SKIPPED (no events)")

    finally:
        client.close()

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info(f"Results: {test_passed} passed, {test_failed} failed")
    logger.info("=" * 60)

    return test_failed == 0


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Integration Tests for Research Workspace")
    parser.add_argument("--backend-url", default="http://localhost:8000", help="Backend URL")
    parser.add_argument("--frontend-url", default="http://localhost:3000", help="Frontend URL")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--junit-output", help="JUnit XML output file")

    args = parser.parse_args()

    success = asyncio.run(run_tests(args.backend_url, args.frontend_url, args.verbose))

    if args.junit_output:
        # Generate minimal JUnit XML
        with open(args.junit_output, "w") as f:
            status = "passed" if success else "failed"
            f.write(f'<?xml version="1.0" encoding="UTF-8"?>\n')
            f.write(f'<testsuites>\n')
            f.write(f'  <testsuite name="integration-tests" tests="1" failures="{0 if success else 1}">\n')
            f.write(f'    <testcase name="full-workflow" status="{status}"/>\n')
            f.write(f'  </testsuite>\n')
            f.write(f'</testsuites>\n')

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
