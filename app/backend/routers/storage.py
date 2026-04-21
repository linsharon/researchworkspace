import logging
from pathlib import Path

from dependencies.auth import get_admin_user, get_current_user
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse, Response
from schemas.auth import UserResponse
from schemas.storage import (
    BucketListResponse,
    BucketRequest,
    BucketResponse,
    DeleteResponse,
    DirectUploadResponse,
    FileUpDownRequest,
    FileUpDownResponse,
    ObjectInfo,
    ObjectListResponse,
    ObjectRequest,
    OSSBaseModel,
    RenameRequest,
    RenameResponse,
)
from services.storage import StorageService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/storage", tags=["storage"])
LOCAL_VISUAL_UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "visualizations"


def _get_local_visual_uploads_dir() -> Path:
    try:
        LOCAL_VISUAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        return LOCAL_VISUAL_UPLOADS_DIR
    except Exception:
        fallback = Path("/tmp/researchworkspace-visualizations")
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


def _resolve_local_visual_path(object_key: str) -> Path:
    base_dir = _get_local_visual_uploads_dir().resolve()
    target = (base_dir / object_key).resolve()
    if not str(target).startswith(str(base_dir)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid local visualization path")
    return target


@router.post("/create-bucket", response_model=BucketResponse)
async def create_bucket(request: BucketRequest, _current_user: UserResponse = Depends(get_admin_user)):
    """
    Create a new bucket
    """
    try:
        service = StorageService()
        return await service.create_bucket(request)
    except ValueError as e:
        logger.error(f"Invalid create bucket request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create bucket: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.get("/list-buckets", response_model=BucketListResponse)
async def list_buckets(_current_user: UserResponse = Depends(get_current_user)):
    """
    List buckets of the user
    """
    try:
        service = StorageService()
        return await service.list_buckets()
    except ValueError as e:
        logger.error(f"Invalid list buckets request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to list buckets: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.get("/list-objects", response_model=ObjectListResponse)
async def list_objects(request: OSSBaseModel = Depends(), _current_user: UserResponse = Depends(get_current_user)):
    """
    List objects under the bucket
    """
    try:
        service = StorageService()
        return await service.list_objects(request)
    except ValueError as e:
        logger.error(f"Invalid list objects request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to list objects: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.get("/get-object-info", response_model=ObjectInfo)
async def get_object_info(request: ObjectRequest = Depends(), _current_user: UserResponse = Depends(get_current_user)):
    """
    Get object metadata from the bucket
    """
    try:
        service = StorageService()
        return await service.get_object_info(request)
    except ValueError as e:
        logger.error(f"Invalid get object metadata request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get object metadata: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.post("/rename-object", response_model=RenameResponse)
async def rename_object(request: RenameRequest, _current_user: UserResponse = Depends(get_current_user)):
    """
    Rename object inside the bucket
    """
    try:
        service = StorageService()
        return await service.rename_object(request)
    except ValueError as e:
        logger.error(f"Invalid rename object: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to rename object: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.delete("/delete-object", response_model=DeleteResponse)
async def delete_object(request: ObjectRequest, _current_user: UserResponse = Depends(get_current_user)):
    """
    Delete object inside the bucket
    """
    try:
        service = StorageService()
        return await service.delete_object(request)
    except ValueError as e:
        logger.error(f"Invalid delete object: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete object: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.post("/upload-bytes", response_model=DirectUploadResponse)
async def upload_bytes(
    request: Request,
    bucket_name: str = Form(...),
    object_key: str = Form(...),
    file: UploadFile = File(...),
    _current_user: UserResponse = Depends(get_current_user),
):
    """Upload object bytes through the backend to avoid browser-side presigned URL issues."""
    try:
        validated = FileUpDownRequest(bucket_name=bucket_name, object_key=object_key)
        content = await file.read()
        access_url = ""
        try:
            service = StorageService()
            await service.upload_bytes(
                bucket_name=validated.bucket_name,
                object_key=validated.object_key,
                content=content,
                content_type=file.content_type or "application/octet-stream",
            )
        except Exception as exc:
            logger.warning("Storage upload-bytes failed for %s/%s, falling back to local file: %s", validated.bucket_name, validated.object_key, exc)
            local_path = _resolve_local_visual_path(validated.object_key)
            local_path.parent.mkdir(parents=True, exist_ok=True)
            local_path.write_bytes(content)
            access_url = f"{str(request.base_url).rstrip('/')}/api/v1/storage/local-visual/{validated.object_key}"
        return DirectUploadResponse(
            bucket_name=validated.bucket_name,
            object_key=validated.object_key,
            size_bytes=len(content),
            content_type=file.content_type or "application/octet-stream",
            access_url=access_url,
        )
    except ValueError as e:
        logger.error(f"Invalid upload-bytes request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to upload bytes: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.get("/local-visual/{object_key:path}")
async def get_local_visual(object_key: str):
    """Serve locally-fallback visualization files for in-app previews."""
    path = _resolve_local_visual_path(object_key)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visualization file not found")
    return FileResponse(path)


@router.get("/proxy/{bucket_name}/{object_key:path}")
async def proxy_object(
    bucket_name: str,
    object_key: str,
    _current_user: UserResponse = Depends(get_current_user),
):
    """Proxy an object from MinIO/S3 through the backend to the browser.

    This avoids requiring the browser to have direct access to the internal
    MinIO endpoint (MINIO_PUBLIC_ENDPOINT). The object is fetched using the
    internal S3 client and streamed to the authenticated caller.
    """
    # Validate bucket_name and object_key to prevent SSRF / path traversal
    if "/" in bucket_name or ".." in bucket_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid bucket name")
    safe_key = object_key.replace("\\", "/")
    if ".." in safe_key.split("/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid object key")

    try:
        service = StorageService()
        s3_response = service.s3_client.get_object(Bucket=bucket_name, Key=safe_key)
        content = s3_response["Body"].read()
        content_type = s3_response.get("ContentType", "application/octet-stream")
        return Response(
            content=content,
            media_type=content_type,
            headers={"Cache-Control": "private, max-age=3600"},
        )
    except Exception as exc:
        logger.error("Failed to proxy object %s/%s: %s", bucket_name, safe_key, exc)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Object not found")


@router.post("/upload-url", response_model=FileUpDownResponse)
async def upload_file(request: FileUpDownRequest, _current_user: UserResponse = Depends(get_current_user)):
    """
    Get a presigned URL for uploading a file to StorageService.

    Steps:
    1. Client calls this endpoint with file details
    2. Server validates and calls OSS service
    3. Returns presigned URL and access_url from OSS service
    4. Client uploads file directly to ObjectStorage using the presigned URL
    5. File is accessible at the returned access_url
    """
    try:
        service = StorageService()
        return await service.create_upload_url(request)
    except ValueError as e:
        logger.error(f"Invalid upload request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to generate upload URL: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")


@router.post("/download-url", response_model=FileUpDownResponse)
async def download_file(request: FileUpDownRequest, _current_user: UserResponse = Depends(get_current_user)):
    """
    Get a presigned URL for downloading a file to StorageService.
    """
    try:
        service = StorageService()
        return await service.create_download_url(request)
    except ValueError as e:
        logger.error(f"Invalid download request: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to generate download URL: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"{e}")
