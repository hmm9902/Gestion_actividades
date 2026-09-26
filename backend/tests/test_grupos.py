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

def test_actualizar_titulo_grupo_success(client: TestClient, admin_token: str):
    response = client.put(
        "/api/grupos/SQUAD-ALPHA",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "nombre_grupo": "Squad Alpha Canales Renovados"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["codigo_grupo"] == "SQUAD-ALPHA"
    assert data["nombre_grupo"] == "Squad Alpha Canales Renovados"

def test_actualizar_titulo_grupo_empty_fails(client: TestClient, admin_token: str):
    response = client.put(
        "/api/grupos/SQUAD-ALPHA",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "nombre_grupo": "   "
        }
    )
    assert response.status_code == 400
    assert "vacío" in response.json()["detail"]

def test_cambiar_lider_non_swe_fails(client: TestClient, admin_token: str):
    response = client.put(
        "/api/grupos/SQUAD-ALPHA",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "registro_principal": "X15400"  # Perfil DESARROLLADOR
        }
    )
    assert response.status_code == 400
    assert "SWE" in response.json()["detail"]

def test_cambiar_lider_swe_success(client: TestClient, admin_token: str):
    # Cambiar líder a otro SWE válido
    response = client.put(
        "/api/grupos/SQUAD-ALPHA",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "registro_principal": "S38454"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["codigo_grupo"] == "SQUAD-ALPHA"
    assert data["registro_principal"] == "S38454"
    # Verificar que el nuevo líder único está en la lista de miembros
    miembros_regs = [m["registro"] for m in data["miembros"]]
    assert "S38454" in miembros_regs

def test_actualizar_codigo_grupo_duplicado_fails(client: TestClient, admin_token: str):
    # Crear un grupo secundario
    create_res = client.post(
        "/api/grupos",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "codigo_grupo": "SQUAD-EXTRA",
            "nombre_grupo": "Squad Extra",
            "registro_principal": "XS454"
        }
    )
    assert create_res.status_code == 201

    # Intentar cambiar su código a SQUAD-ALPHA que ya existe
    response = client.put(
        "/api/grupos/SQUAD-EXTRA",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "codigo_grupo": "SQUAD-ALPHA"
        }
    )
    assert response.status_code == 400
    assert "Ya existe un grupo con el código" in response.json()["detail"]

def test_actualizar_codigo_grupo_vacio_fails(client: TestClient, admin_token: str):
    response = client.put(
        "/api/grupos/SQUAD-EXTRA",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "codigo_grupo": "   "
        }
    )
    assert response.status_code == 400
    assert "vacío" in response.json()["detail"]

def test_actualizar_codigo_grupo_success(client: TestClient, admin_token: str):
    # Renombrar código de grupo válidamente
    response = client.put(
        "/api/grupos/SQUAD-EXTRA",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "codigo_grupo": "SQUAD-RENOMBRADO",
            "nombre_grupo": "Squad Renombrado Oficial"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["codigo_grupo"] == "SQUAD-RENOMBRADO"
    assert data["nombre_grupo"] == "Squad Renombrado Oficial"

    # Verificar que el código viejo ya no existe
    res_old = client.get(
        "/api/grupos/SQUAD-EXTRA",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_old.status_code == 404

    # Verificar que el nuevo código es consultable
    res_new = client.get(
        "/api/grupos/SQUAD-RENOMBRADO",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_new.status_code == 200
