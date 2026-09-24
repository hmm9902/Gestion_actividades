import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, get_db
from app.scripts.bootstrap import seed_data
from app.core.config import settings

TEST_DB_PATH = "test_temp.db"
SQLALCHEMY_TEST_DATABASE_URL = f"sqlite:///./{TEST_DB_PATH}"

engine_test = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Remover archivo de BD previa si existe
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

    Base.metadata.create_all(bind=engine_test)
    test_db = TestingSessionLocal()
    try:
        seed_data(test_db)
    finally:
        test_db.close()
    
    yield
    
    Base.metadata.drop_all(bind=engine_test)
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

@pytest.fixture
def db():
    db_sess = TestingSessionLocal()
    try:
        yield db_sess
    finally:
        db_sess.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def admin_token(client):
    response = client.post("/api/auth/login", json={
        "registro": settings.BOOTSTRAP_ADMIN_USER,
        "password": settings.BOOTSTRAP_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login admin failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture
def swe_token(client):
    response = client.post("/api/auth/login", json={
        "registro": "XS454",
        "password": "Password123*"
    })
    assert response.status_code == 200, f"Login swe failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture
def dev_token(client):
    response = client.post("/api/auth/login", json={
        "registro": "X15400",
        "password": "Password123*"
    })
    assert response.status_code == 200, f"Login dev failed: {response.text}"
    return response.json()["access_token"]
