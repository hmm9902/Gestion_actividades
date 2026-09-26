from fastapi.testclient import TestClient

def test_desarrollador_cannot_access_incidentes(client: TestClient, dev_token: str):
    # GET list no permitido para desarrollador (solo ADMIN y SWE)
    res_get = client.get(
        "/api/incidentes",
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res_get.status_code == 403

    # POST no permitido para desarrollador
    res_post = client.post(
        "/api/incidentes",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={
            "job": "JOB-TEST-DEV",
            "dtsx": "test.dtsx",
            "ambiente": "PRD"
        }
    )
    assert res_post.status_code == 403

def test_swe_can_create_and_list_incidentes(client: TestClient, swe_token: str):
    res = client.post(
        "/api/incidentes",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "atendido_por": "HENRY",
            "aplicativo": "FCD",
            "ruta_critica": "SI",
            "job": "EFCD092D034W_TEST",
            "fecha_cancelacion": "2026-05-10",
            "server": "S64rP1",
            "ruta": "\\\\s429vP2\\ISP\\BDD\\FCD\\",
            "dtsx": "FCD_Notifica_Factura_Desembolso_Girador_TEST.dtsx",
            "aplicar": "Force Ok",
            "hora_cancelacion": "02:30 am",
            "descripcion_error": "Error de prueba automatizada",
            "solucion": "Solucion aplicada en test",
            "fecha_hora_solucion": "2026-05-10T23:15:00",
            "ambiente": "PRD"
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert data["job"] == "EFCD092D034W_TEST"
    assert data["aplicativo"] == "FCD"
    assert data["ruta_critica"] == "SI"
    assert data["ambiente"] == "PRD"
    incidente_id = data["incidente_id"]

    # Obtener por ID
    get_res = client.get(
        f"/api/incidentes/{incidente_id}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert get_res.status_code == 200
    assert get_res.json()["incidente_id"] == incidente_id

    # Listar con filtro por job
    list_res = client.get(
        "/api/incidentes?job=EFCD092D034W_TEST",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    assert any(i["incidente_id"] == incidente_id for i in items)

def test_incidente_filters_ambiente_job_dtsx_atendido(client: TestClient, swe_token: str):
    # Crear dos incidentes con distintos valores
    res1 = client.post(
        "/api/incidentes",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "atendido_por": "JUAN PEREZ",
            "aplicativo": "FCD",
            "ruta_critica": "SI",
            "job": "JOB_ALPHA_FILTER",
            "dtsx": "ALPHA_PACKAGE.dtsx",
            "ambiente": "UAT"
        }
    )
    assert res1.status_code == 201
    id1 = res1.json()["incidente_id"]

    res2 = client.post(
        "/api/incidentes",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "atendido_por": "MARIA LOPEZ",
            "aplicativo": "FCD",
            "ruta_critica": "NO",
            "job": "JOB_BETA_FILTER",
            "dtsx": "BETA_PACKAGE.dtsx",
            "ambiente": "PRD"
        }
    )
    assert res2.status_code == 201
    id2 = res2.json()["incidente_id"]

    # 1. Filtro ambiente UAT
    r_amb = client.get(
        "/api/incidentes?ambiente=UAT&job=JOB_ALPHA_FILTER",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert r_amb.status_code == 200
    data_amb = r_amb.json()
    assert all(x["ambiente"] == "UAT" for x in data_amb)
    assert any(x["incidente_id"] == id1 for x in data_amb)

    # 2. Filtro job
    r_job = client.get(
        "/api/incidentes?job=BETA_FILTER",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert r_job.status_code == 200
    assert any(x["incidente_id"] == id2 for x in r_job.json())
    assert not any(x["incidente_id"] == id1 for x in r_job.json())

    # 3. Filtro dtsx
    r_dtsx = client.get(
        "/api/incidentes?dtsx=ALPHA_PACKAGE",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert r_dtsx.status_code == 200
    assert any(x["incidente_id"] == id1 for x in r_dtsx.json())
    assert not any(x["incidente_id"] == id2 for x in r_dtsx.json())

    # 4. Filtro atendido_por
    r_aten = client.get(
        "/api/incidentes?atendido_por=MARIA",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert r_aten.status_code == 200
    assert any(x["incidente_id"] == id2 for x in r_aten.json())
    assert not any(x["incidente_id"] == id1 for x in r_aten.json())

def test_incidente_update_and_delete(client: TestClient, swe_token: str):
    # Crear
    res_crear = client.post(
        "/api/incidentes",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "job": "JOB_TO_UPDATE",
            "ambiente": "PRD",
            "dtsx": "test_upd.dtsx"
        }
    )
    assert res_crear.status_code == 201
    inc_id = res_crear.json()["incidente_id"]

    # Actualizar
    res_upd = client.put(
        f"/api/incidentes/{inc_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "solucion": "Solución actualizada exitosamente",
            "aplicar": "Reelanzar",
            "ruta_critica": "SI"
        }
    )
    assert res_upd.status_code == 200
    data_upd = res_upd.json()
    assert data_upd["solucion"] == "Solución actualizada exitosamente"
    assert data_upd["aplicar"] == "Reelanzar"
    assert data_upd["ruta_critica"] == "SI"

    # Eliminar
    res_del = client.delete(
        f"/api/incidentes/{inc_id}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_del.status_code == 200

    # Verificar que ya no existe
    res_check = client.get(
        f"/api/incidentes/{inc_id}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_check.status_code == 404

def test_incidente_validation_job_required(client: TestClient, swe_token: str):
    res = client.post(
        "/api/incidentes",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "job": "   ",
            "ambiente": "PRD"
        }
    )
    assert res.status_code == 400
