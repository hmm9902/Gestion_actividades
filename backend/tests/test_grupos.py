from fastapi.testclient import TestClient

def test_grupo_requires_swe_as_principal(client: TestClient, admin_token: str):
    # Intentar crear grupo con X15400 (DESARROLLADOR) como principal
    response = client.post(
        "/api/grupos",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "codigo_grupo": "SQUAD-DEV-FAIL",
            "nombre_grupo": "Squad Fallido",
            "registro_principal": "X15400"
        }
    )
    # REGLA 4: REGISTRO_PRINCIPAL solo puede tener perfil SWE
    assert response.status_code == 400
    assert "SWE" in response.json()["detail"]

def test_cannot_inactivate_grupo_with_prd_or_finalizado(client: TestClient, admin_token: str):
    # SQUAD-ALPHA tiene ACT-1005 en estado 'EN_PRD'
    response = client.put(
        "/api/grupos/SQUAD-ALPHA",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "estado_grupo": "INACTIVO"
        }
    )
    # REGLA 5: No permitir inactivar un grupo si existen actividades EN_PRD o Finalizado
    assert response.status_code == 400
    assert "EN_PRD" in response.json()["detail"]
