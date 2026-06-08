import os
import requests
import pytest
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env for EXPO_PUBLIC_BACKEND_URL (the URL users hit)
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")

# Public external URL for testing (as provided in review request)
PUBLIC_URL = "https://8f89aca5-4984-413b-b178-43fede044b5b.preview.emergentagent.com"
BASE_URL = PUBLIC_URL.rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def cleanup_expenses(api_client):
    created = []
    yield created
    for eid in created:
        try:
            api_client.delete(f"{BASE_URL}/api/expenses/{eid}", timeout=10)
        except Exception:
            pass
