from fastapi.testclient import TestClient

def test_desarrollador_cannot_create_aplicacion(client: TestClient, dev_token: str):
    response = client.post(
        "/api/aplicaciones",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={
            "nombre_aplicacion": "APLICACION DEV FAIL",
            "siglas": "ADF",
            "lider_tecno": "DEV LEAD"
        }
    )
    # Solo ADMIN y SWE pueden crear aplicaciones
    assert response.status_code == 403

def test_desarrollador_cannot_update_or_delete_aplicacion(client: TestClient, dev_token: str, swe_token: str):
    # 1. SWE crea aplicación
    create_res = client.post(
        "/api/aplicaciones",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_aplicacion": "SISTEMA SEGURO DEV",
            "siglas": "SSD"
        }
    )
    assert create_res.status_code == 201
    app_id = create_res.json()["aplicacion_id"]

    # 2. DEV intenta actualizar
    update_res = client.put(
        f"/api/aplicaciones/{app_id}",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={"siglas": "HACK"}
    )
    assert update_res.status_code == 403

    # 3. DEV intenta eliminar
    delete_res = client.delete(
        f"/api/aplicaciones/{app_id}",
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert delete_res.status_code == 403

def test_swe_and_admin_crud_aplicacion(client: TestClient, swe_token: str, admin_token: str):
    # 1. SWE crea aplicación
    res = client.post(
        "/api/aplicaciones",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_aplicacion": "PORTAL CLIENTES FCD",
            "siglas": "PCF",
            "lider_tecno": "Carlos Mendoza",
            "po_contacto": "Ana Gomez",
            "scrum_datos": "Sprint 2026-Q1",
            "descripcion_actividad": "Módulo principal para gestión de trámites y solicitudes",
            "estado": "Activo"
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert data["nombre_aplicacion"] == "PORTAL CLIENTES FCD"
    assert data["siglas"] == "PCF"
    assert data["lider_tecno"] == "Carlos Mendoza"
    assert data["po_contacto"] == "Ana Gomez"
    assert data["scrum_datos"] == "Sprint 2026-Q1"
    assert data["descripcion_actividad"] == "Módulo principal para gestión de trámites y solicitudes"
    assert data["estado"] == "Activo"
    app_id = data["aplicacion_id"]

    # 2. Listar aplicaciones
    list_res = client.get(
        "/api/aplicaciones",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert list_res.status_code == 200
    nombres = [a["nombre_aplicacion"] for a in list_res.json()]
    assert "PORTAL CLIENTES FCD" in nombres

    # 3. Obtener detalle por ID
    get_res = client.get(
        f"/api/aplicaciones/{app_id}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert get_res.status_code == 200
    assert get_res.json()["siglas"] == "PCF"

    # 4. Actualizar aplicación a Inactivo
    update_res = client.put(
        f"/api/aplicaciones/{app_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "lider_tecno": "Carlos Mendoza (Líder Senior)",
            "estado": "Inactivo"
        }
    )
    assert update_res.status_code == 200
    assert update_res.json()["lider_tecno"] == "Carlos Mendoza (Líder Senior)"
    assert update_res.json()["estado"] == "Inactivo"

    # 5. Filtrar por estado Inactivo
    filter_res = client.get(
        "/api/aplicaciones?estado=Inactivo",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert filter_res.status_code == 200
    inactivos = [a["nombre_aplicacion"] for a in filter_res.json()]
    assert "PORTAL CLIENTES FCD" in inactivos

    # 6. ADMIN elimina aplicación
    del_res = client.delete(
        f"/api/aplicaciones/{app_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert del_res.status_code == 200

    # 7. Verificar que ya no existe
    get_deleted = client.get(
        f"/api/aplicaciones/{app_id}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert get_deleted.status_code == 404

def test_aplicacion_validations(client: TestClient, swe_token: str):
    # 1. Nombre obligatorio
    bad_req = client.post(
        "/api/aplicaciones",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_aplicacion": "   ",
            "siglas": "TST"
        }
    )
    assert bad_req.status_code == 400

    # 2. Estado inválido
    bad_estado = client.post(
        "/api/aplicaciones",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_aplicacion": "APP ESTADO INVALIDO",
            "estado": "CANCELADA"
        }
    )
    assert bad_estado.status_code == 422

    # 3. Unicidad de nombre
    client.post(
        "/api/aplicaciones",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_aplicacion": "APP DUPLICADA TEST",
            "siglas": "ADT"
        }
    )
    dup_res = client.post(
        "/api/aplicaciones",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_aplicacion": "APP DUPLICADA TEST",
            "siglas": "ADT2"
        }
    )
    assert dup_res.status_code == 400
    assert "Ya existe" in dup_res.json()["detail"]
