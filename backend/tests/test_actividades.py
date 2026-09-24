from fastapi.testclient import TestClient

def test_desarrollador_cannot_create_actividad(client: TestClient, dev_token: str):
    response = client.post(
        "/api/actividades",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={
            "codigo_actividad": "ACT-TEST-01",
            "titulo": "Intento de creación por Desarrollador",
            "tipo_actividad": "TAREA"
        }
    )
    # REGLA 1: No permitir crear actividades a DESARROLLADOR, QA o INTEGRADOR
    assert response.status_code == 403

def test_swe_can_create_actividad_and_defaults_swe_encargado(client: TestClient, swe_token: str):
    response = client.post(
        "/api/actividades",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "codigo_actividad": "ACT-TEST-02",
            "titulo": "Creación válida por SWE",
            "tipo_actividad": "TAREA",
            "codigo_grupo": "SQUAD-ALPHA",
            "asignado_registro": "X15400"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["codigo_actividad"] == "ACT-TEST-02"
    # SWE_ENCARGADO por defecto debe ser XS454 (quien la creó)
    assert data["swe_encargado"] == "XS454"
    assert data["estado"] == "registrado"

def test_cambio_estado_requires_mandatory_motivo(client: TestClient, dev_token: str):
    # Sin motivo o motivo vacío debe fallar
    response = client.post(
        "/api/actividades/ACT-1001/estado",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={
            "nuevo_estado": "certificacion",
            "motivo": ""
        }
    )
    assert response.status_code == 400

    # Con motivo debe prosperar
    response_ok = client.post(
        "/api/actividades/ACT-1001/estado",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={
            "nuevo_estado": "certificacion",
            "motivo": "Completadas pruebas unitarias satisfactorias"
        }
    )
    assert response_ok.status_code == 200
    assert response_ok.json()["estado"] == "certificacion"

def test_actualizar_posicion_drag_and_drop(client: TestClient, dev_token: str):
    response = client.put(
        "/api/actividades/ACT-1001/posicion",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={"nueva_posicion": 5}
    )
    assert response.status_code == 200
    assert response.json()["posicion"] == 5

def test_actividad_finalizada_cannot_change_estado_or_be_deleted(client: TestClient, dev_token: str, swe_token: str, admin_token: str):
    # 1. Crear actividad de prueba
    create_res = client.post(
        "/api/actividades",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "codigo_actividad": "ACT-FIN-LOCK",
            "titulo": "Prueba de bloqueo en Finalizado",
            "tipo_actividad": "TAREA",
            "codigo_grupo": "SQUAD-ALPHA",
            "asignado_registro": "XS454"
        }
    )
    assert create_res.status_code == 201

    # 2. Transicionar a Finalizado
    fin_res = client.post(
        "/api/actividades/ACT-FIN-LOCK/estado",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nuevo_estado": "Finalizado",
            "motivo": "Pase a producción completado y cerrado"
        }
    )
    assert fin_res.status_code == 200
    assert fin_res.json()["estado"] == "Finalizado"

    # 3. Intentar cambiar de estado con DESARROLLADOR -> Debe fallar (400)
    dev_change = client.post(
        "/api/actividades/ACT-FIN-LOCK/estado",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={
            "nuevo_estado": "desarrollo",
            "motivo": "Intento de reapertura por Desarrollador"
        }
    )
    assert dev_change.status_code == 400
    assert "Finalizado" in dev_change.json()["detail"]

    # 4. Intentar cambiar de estado con SWE -> Debe fallar (400)
    swe_change = client.post(
        "/api/actividades/ACT-FIN-LOCK/estado",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nuevo_estado": "certificacion",
            "motivo": "Intento de reapertura por SWE"
        }
    )
    assert swe_change.status_code == 400
    assert "Finalizado" in swe_change.json()["detail"]

    # 5. Intentar cambiar de estado con ADMIN -> Debe fallar (400)
    admin_change = client.post(
        "/api/actividades/ACT-FIN-LOCK/estado",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "nuevo_estado": "registrado",
            "motivo": "Intento de reapertura por ADMIN"
        }
    )
    assert admin_change.status_code == 400
    assert "Finalizado" in admin_change.json()["detail"]

    # 6. Intentar eliminar con DESARROLLADOR -> Debe fallar por rol (403)
    dev_del = client.delete(
        "/api/actividades/ACT-FIN-LOCK",
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert dev_del.status_code == 403

    # 7. Eliminar actividad en estado Finalizado con SWE -> Debe ser exitoso (200)
    swe_del = client.delete(
        "/api/actividades/ACT-FIN-LOCK",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert swe_del.status_code == 200
    assert "eliminada correctamente" in swe_del.json()["mensaje"]

    # 8. Verificar que la actividad ya no existe (404)
    get_res = client.get(
        "/api/actividades/ACT-FIN-LOCK",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert get_res.status_code == 404

    # 9. Crear otra actividad en Finalizado y verificar que ADMIN también puede eliminarla (200)
    client.post(
        "/api/actividades",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "codigo_actividad": "ACT-FIN-ADMIN",
            "titulo": "Prueba de borrado finalizado por ADMIN",
            "tipo_actividad": "TAREA",
            "codigo_grupo": "SQUAD-ALPHA",
            "asignado_registro": "XS454"
        }
    )
    client.post(
        "/api/actividades/ACT-FIN-ADMIN/estado",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "nuevo_estado": "Finalizado",
            "motivo": "Pase a producción completado"
        }
    )
    admin_del = client.delete(
        "/api/actividades/ACT-FIN-ADMIN",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_del.status_code == 200
    assert "eliminada correctamente" in admin_del.json()["mensaje"]

