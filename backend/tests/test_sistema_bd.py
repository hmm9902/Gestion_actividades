import pytest
from fastapi.testclient import TestClient

def test_sistema_bd_info_unauthorized(client: TestClient):
    response = client.get("/api/sistema/bd/info")
    assert response.status_code == 401

def test_sistema_bd_info_admin(client: TestClient, admin_token: str):
    response = client.get(
        "/api/sistema/bd/info",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "current_provider" in data
    assert "local" in data
    assert "turso" in data
    assert data["local"]["source"] == "sqlite:///./gestor_actividades.db"
    assert data["turso"]["source"] == "Turso / libSQL"
    # Verificar que los tokens no se expongan completos
    assert "..." in data["turso"]["auth_token_masked"] or data["turso"]["auth_token_masked"] == "***" or "No configurado" in data["turso"]["auth_token_masked"]
    assert "..." in data["turso"]["platform_token_masked"] or data["turso"]["platform_token_masked"] == "***" or "No configurado" in data["turso"]["platform_token_masked"]

def test_sistema_bd_info_swe_authorized(client: TestClient, swe_token: str):
    response = client.get(
        "/api/sistema/bd/info",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert response.status_code == 200

def test_sistema_bd_forbidden_for_dev(client: TestClient, dev_token: str):
    # DESARROLLADOR no debe tener acceso
    response = client.get(
        "/api/sistema/bd/info",
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert response.status_code == 403

def test_sistema_bd_test_connection_local(client: TestClient, admin_token: str):
    response = client.post(
        "/api/sistema/bd/test",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"provider": "LOCAL"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["provider"] == "LOCAL"
