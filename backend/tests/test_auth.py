from fastapi.testclient import TestClient

def test_login_success_and_no_password_domain(client: TestClient):
    response = client.post("/api/auth/login", json={
        "registro": "XS454",
        "password": "Password123*"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "usuario" in data
    
    # REGLA CRÍTICA: PASSWORD_DOMAIN nunca debe exponerse
    raw_text = response.text
    assert "PASSWORD_DOMAIN" not in raw_text
    assert "password_domain" not in raw_text
    assert data["usuario"]["perfil"] == "SWE"

def test_login_invalid_password(client: TestClient):
    response = client.post("/api/auth/login", json={
        "registro": "XS454",
        "password": "PasswordIncorrecto"
    })
    assert response.status_code == 401

def test_me_endpoint_and_expiration_alert(client: TestClient, swe_token: str):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["registro"] == "XS454"
    assert data["perfil"] == "SWE"
    # XS454 tiene fecha_expiracion a 7 días, debe mostrar alerta
    assert data["alerta_expiracion"] is not None
    assert "PASSWORD_DOMAIN" not in response.text
