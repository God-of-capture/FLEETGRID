"""Storage abstraction — local filesystem today, S3-compatible later."""
import os
import secrets
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO, Optional, Tuple

ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "application/pdf",
}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


class StorageBackend(ABC):
    @abstractmethod
    async def save(self, file: BinaryIO, filename: str, content_type: str) -> Tuple[str, str]:
        """Return (storage_key, public_url)."""

    @abstractmethod
    async def delete(self, storage_key: str) -> None:
        pass


class LocalStorageBackend(StorageBackend):
    def __init__(self, upload_dir: Path, base_url: str):
        self.upload_dir = upload_dir
        self.base_url = base_url.rstrip("/")
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, file: BinaryIO, filename: str, content_type: str) -> Tuple[str, str]:
        ext = Path(filename).suffix.lower() or ".bin"
        key = f"{uuid.uuid4().hex}{ext}"
        dest = self.upload_dir / key
        data = file.read()
        if len(data) > MAX_FILE_BYTES:
            raise ValueError(f"File exceeds {MAX_FILE_BYTES // (1024*1024)} MB limit")
        dest.write_bytes(data)
        return key, f"{self.base_url}/api/files/{key}"

    async def delete(self, storage_key: str) -> None:
        path = self.upload_dir / storage_key
        if path.exists():
            path.unlink()


class S3StorageBackend(StorageBackend):
    """Placeholder for future S3 integration — not wired by default."""

    def __init__(self, bucket: str, region: str, public_base: str):
        self.bucket = bucket
        self.region = region
        self.public_base = public_base

    async def save(self, file: BinaryIO, filename: str, content_type: str) -> Tuple[str, str]:
        raise NotImplementedError("Configure STORAGE_BACKEND=s3 and implement boto3 upload")

    async def delete(self, storage_key: str) -> None:
        raise NotImplementedError("S3 delete not implemented")


def get_storage() -> StorageBackend:
    backend = os.environ.get("STORAGE_BACKEND", "local")
    if backend == "s3":
        return S3StorageBackend(
            bucket=os.environ["S3_BUCKET"],
            region=os.environ.get("S3_REGION", "ap-south-1"),
            public_base=os.environ.get("S3_PUBLIC_BASE", ""),
        )
    upload_dir = Path(os.environ.get("UPLOAD_DIR", Path(__file__).parent / "uploads"))
    base_url = os.environ.get("APP_URL", "http://localhost:8000")
    return LocalStorageBackend(upload_dir, base_url)


def validate_upload(content_type: str, size: int) -> None:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Unsupported file type: {content_type}")
    if size > MAX_FILE_BYTES:
        raise ValueError(f"File too large (max {MAX_FILE_BYTES // (1024*1024)} MB)")
