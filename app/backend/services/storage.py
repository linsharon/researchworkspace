import logging
import os
import json
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional, Union
from urllib.parse import urljoin

import boto3
import httpx
import mimetypes
from botocore.client import Config
from core.config import settings
from schemas.storage import (
    BucketInfo,
    BucketListResponse,
    BucketRequest,
    BucketResponse,
    DeleteResponse,
    FileUpDownRequest,
    FileUpDownResponse,
    ObjectInfo,
    ObjectListResponse,
    ObjectRequest,
    OSSBaseModel,
    RenameRequest,
    RenameResponse,
)

logger = logging.getLogger(__name__)


class StorageService:
    """Service for handling file upload and display with ObjectStorage service integration."""

    def __init__(self):
        self.oss_service_url = os.getenv("OSS_SERVICE_URL", "")
        self.oss_api_key = os.getenv("OSS_API_KEY", "")

        self.storage_provider = os.getenv("STORAGE_PROVIDER", "minio").lower()
        self.minio_endpoint = os.getenv("MINIO_ENDPOINT", "http://minio:9000")
        self.minio_public_endpoint = os.getenv("MINIO_PUBLIC_ENDPOINT", "http://localhost:9000")
        self.minio_access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.minio_secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.minio_region = os.getenv("MINIO_REGION", "us-east-1")

        if self.storage_provider not in {"minio", "s3", "oss"}:
            raise ValueError("Invalid STORAGE_PROVIDER. Supported: minio, s3, oss")

        if self.storage_provider == "oss":
            if not self.oss_service_url or not self.oss_api_key:
                raise ValueError("OSS service not configured. Set OSS_SERVICE_URL and OSS_API_KEY.")
            self.headers = {
                "Authorization": f"Bearer {self.oss_api_key}",
                "Content-Type": "application/json",
            }
        else:
            s3_config = Config(signature_version="s3v4", s3={"addressing_style": "path"})
            # Internal client for bucket/object operations in container network.
            self.s3_client = boto3.client(
                "s3",
                endpoint_url=self.minio_endpoint,
                aws_access_key_id=self.minio_access_key,
                aws_secret_access_key=self.minio_secret_key,
                region_name=self.minio_region,
                config=s3_config,
            )
            # Public client for presigned URLs consumed by browser/tests outside container network.
            self.s3_public_client = boto3.client(
                "s3",
                endpoint_url=self.minio_public_endpoint,
                aws_access_key_id=self.minio_access_key,
                aws_secret_access_key=self.minio_secret_key,
                region_name=self.minio_region,
                config=s3_config,
            )

    async def create_bucket(self, request: BucketRequest) -> BucketResponse:
        """
        Create a bucket name
        """
        if self.storage_provider == "oss":
            endpoint = "api/v1/infra/client/oss/buckets"
            payload = {"bucket_name": request.bucket_name, "visibility": request.visibility}
            try:
                result = await self._apost_oss_service(endpoint, payload)
                return BucketResponse(bucket_name=result.get("bucket_name"), created_at=result.get("created_at"))
            except Exception as e:
                logger.error(f"Failed to create bucket: {e}")
                raise

        # MinIO/S3 path
        if request.visibility == "public" and not settings.allow_public_buckets:
            raise ValueError("Public buckets are disabled by policy")

        try:
            self.s3_client.create_bucket(Bucket=request.bucket_name)
        except Exception:
            # Bucket may already exist; keep operation idempotent for staging/dev
            pass

        await self._apply_bucket_visibility_policy(request.bucket_name, request.visibility)

        return BucketResponse(
            bucket_name=request.bucket_name,
            visibility=request.visibility,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

    async def _apply_bucket_visibility_policy(self, bucket_name: str, visibility: str) -> None:
        """Apply explicit bucket policy to avoid accidental public exposure."""
        if visibility == "private":
            # Private mode: remove bucket policy to fall back to authenticated access only.
            try:
                self.s3_client.delete_bucket_policy(Bucket=bucket_name)
            except Exception:
                # Some backends may not have a policy yet; keep behavior idempotent.
                pass
            return

        # Public read is only enabled when explicitly allowed.
        else:
            # Public read is only enabled when explicitly allowed.
            policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Sid": "PublicReadObjects",
                        "Effect": "Allow",
                        "Principal": "*",
                        "Action": ["s3:GetObject"],
                        "Resource": [f"arn:aws:s3:::{bucket_name}/*"],
                    }
                ],
            }

        self.s3_client.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))

    async def list_buckets(self) -> BucketListResponse:
        """
        List buckets of the user
        """
        endpoint = "api/v1/infra/client/oss/buckets"
        try:
            result = await self._aget_oss_service(endpoint=endpoint, params={})
            list_buckets = BucketListResponse()
            for item in result["buckets"]:
                list_buckets.buckets.append(BucketInfo(bucket_name=item["bucket_name"], visibility=item["visibility"]))
            return list_buckets
        except Exception as e:
            logger.error(f"Failed to list buckets: {e}")
            raise

    async def list_objects(self, request: OSSBaseModel) -> ObjectListResponse:
        """
        List objests from the bucket
        """
        endpoint = f"api/v1/infra/client/oss/buckets/{request.bucket_name}/objects"
        try:
            result = await self._aget_oss_service(endpoint=endpoint, params={})
            list_objs = ObjectListResponse()
            for item in result["objects"]:
                list_objs.objects.append(
                    ObjectInfo(
                        bucket_name=request.bucket_name,
                        object_key=item["key"],
                        size=item["size"],
                        last_modified=item["last_modified"],
                        etag=item["etag"],
                    )
                )
            return list_objs
        except Exception as e:
            logger.error(f"Failed to list bucket objects: {e}")
            raise

    async def get_object_info(self, request: ObjectRequest) -> ObjectInfo:
        """
        Get object metadata from the bucket
        """
        try:
            endpoint = f"api/v1/infra/client/oss/buckets/{request.bucket_name}/objects/metadata"
            params = {"object_key": request.object_key}
            result = await self._aget_oss_service(endpoint, params)
            return ObjectInfo(
                bucket_name=request.bucket_name,
                object_key=result["key"],
                size=result["size"],
                last_modified=result["last_modified"],
                etag=result["etag"],
            )
        except Exception as e:
            logger.error(f"Failed to get object metadata: {e}")
            raise

    async def rename_object(self, request: RenameRequest) -> dict:
        endpoint = f"api/v1/infra/client/oss/buckets/{request.bucket_name}/objects/rename"
        payload = {
            "overwrite_key": request.overwrite_key,
            "source_key": request.source_key,
            "target_key": request.target_key,
        }
        try:
            await self._apost_oss_service(endpoint, payload)
            return RenameResponse(success=True)
        except Exception as e:
            logger.error(f"Failed to rename object: {e}")
            raise

    async def delete_object(self, request: ObjectRequest) -> DeleteResponse:
        endpoint = f"api/v1/infra/client/oss/buckets/{request.bucket_name}/objects"
        payload = {"object_keys": [request.object_key]}
        try:
            await self._adelete_oss_service(endpoint, payload)
            return DeleteResponse(success=True)
        except Exception as e:
            logger.error(f"Failed to rename object: {e}")
            raise

    async def create_upload_url(self, request: FileUpDownRequest) -> FileUpDownResponse:
        """
        Create presigned URL for file upload with access URL.
        """
        if self.storage_provider == "oss":
            endpoint = f"/api/v1/infra/client/oss/buckets/{request.bucket_name}/objects/upload_url"
            payload = {"expires_in": 0, "object_key": request.object_key}
            try:
                result = await self._apost_oss_service(endpoint, payload)
                return FileUpDownResponse(
                    upload_url=result.get("upload_url"),
                    expires_at=result.get("expires_at"),
                )
            except Exception as e:
                logger.error(f"Failed to create upload URL: {e}")
                raise

        try:
            await self.create_bucket(BucketRequest(bucket_name=request.bucket_name, visibility="private"))
            expires_in = int(os.getenv("PRESIGNED_URL_EXPIRES_IN", "900"))
            upload_url = self.s3_public_client.generate_presigned_url(
                "put_object",
                Params={"Bucket": request.bucket_name, "Key": request.object_key},
                ExpiresIn=expires_in,
            )
            expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()
            return FileUpDownResponse(upload_url=upload_url, expires_at=expires_at)
        except Exception as e:
            logger.error(f"Failed to create MinIO/S3 upload URL: {e}")
            raise

    async def create_download_url(self, request: FileUpDownRequest) -> FileUpDownResponse:
        """
        Create presigned URL for file download with access URL.
        """
        if self.storage_provider == "oss":
            endpoint = f"/api/v1/infra/client/oss/buckets/{request.bucket_name}/objects/download_url"
            content_type, _ = mimetypes.guess_type(str(request.object_key))
            if not content_type:
                content_type = "application/octet-stream"
            payload = {
                "content_type": content_type,
                "expires_in": 0,
                "object_key": request.object_key,
            }
            try:
                result = await self._apost_oss_service(endpoint, payload)
                return FileUpDownResponse(
                    download_url=result.get("download_url"),
                    expires_at=result.get("expires_at"),
                )
            except Exception as e:
                logger.error(f"Failed to create download URL: {e}")
                raise

        try:
            expires_in = int(os.getenv("PRESIGNED_URL_EXPIRES_IN", "900"))
            download_url = self.s3_public_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": request.bucket_name, "Key": request.object_key},
                ExpiresIn=expires_in,
            )
            expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()
            return FileUpDownResponse(download_url=download_url, expires_at=expires_at)
        except Exception as e:
            logger.error(f"Failed to create MinIO/S3 download URL: {e}")
            raise

    async def _aget_oss_service(self, endpoint: str, params: dict) -> dict:
        return await self._arequest_oss_service("GET", endpoint, params=params)

    async def _apost_oss_service(self, endpoint: str, payload: dict) -> Union[dict, list]:
        return await self._arequest_oss_service("POST", endpoint, payload=payload)

    async def _adelete_oss_service(self, endpoint: str, payload: dict) -> Union[dict, list]:
        return await self._arequest_oss_service("DELETE", endpoint, payload=payload)

    async def _arequest_oss_service(
        self,
        method: Literal["GET", "POST", "DELETE"],
        endpoint: str,
        params: Optional[dict] = None,
        payload: Optional[dict] = None,
    ) -> Union[dict, list]:
        """统一的 OSS 服务请求方法"""
        url = urljoin(self.oss_service_url, endpoint)

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    params=params,
                    json=payload,
                )
                response.raise_for_status()
                result = response.json()

                if result.get("code") != 0:
                    logger.warning(f"ObjectStorage service error: {result}")
                    error_msg = result.get("error", "Unknown error")
                    message = result.get("message", "")
                    raise ValueError(f"ObjectStorage service error: {error_msg}. {message}")

                return result.get("data", [])
        except httpx.HTTPStatusError as e:
            error_msg = f"ObjectStorage service HTTP error: {e.response.status_code} - {e.response.text}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        except Exception as e:
            logger.error(f"Failed to call ObjectStorage service: {e}")
            raise
