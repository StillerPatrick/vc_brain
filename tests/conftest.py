import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


test_directory = Path(tempfile.mkdtemp(prefix="vc-brain-tests-"))
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{test_directory / 'test.db'}"

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
