import pytest
from fastapi.testclient import TestClient

def test_root_incluye_enlaces_descarga(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "descarga_directa_pdf" in data
    assert data["descarga_directa_pdf"] == "/descargas/Documento_Nora.pdf"
    assert "ver_online_pdf" in data
    assert data["ver_online_pdf"] == "/ver/Documento_Nora.pdf"

def test_descargar_documento_nora(client: TestClient):
    # Probar endpoint de descarga directa con Content-Disposition: attachment
    response = client.get("/descargas/Documento_Nora.pdf")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/pdf"
    assert "attachment" in response.headers.get("content-disposition", "")
    assert "Documento_Nora.pdf" in response.headers.get("content-disposition", "")

def test_ver_documento_nora_inline(client: TestClient):
    # Probar endpoint de visualización con Content-Disposition: inline
    response = client.get("/ver/Documento_Nora.pdf")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/pdf"
    assert "inline" in response.headers.get("content-disposition", "")
    assert "Documento_Nora.pdf" in response.headers.get("content-disposition", "")
