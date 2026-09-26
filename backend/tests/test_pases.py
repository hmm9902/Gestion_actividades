from fastapi.testclient import TestClient

def test_desarrollador_cannot_access_pases(client: TestClient, dev_token: str):
    # GET list no permitido para desarrollador
    res_get = client.get(
        "/api/pases",
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res_get.status_code == 403

    # POST no permitido para desarrollador
    res_post = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={
            "tipo_ambiente": "D",
            "titulo": "Intento no autorizado",
            "estado_srt": "REGISTRADO"
        }
    )
    assert res_post.status_code == 403

def test_swe_can_create_and_list_pases(client: TestClient, swe_token: str):
    res = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "A",
            "proyecto": "PUN-FCD",
            "app": "FCD",
            "codigo_srt": "SRT_2026-99999",
            "titulo": "Pase Automatizado Test SWE",
            "estado_srt": "REGISTRADO",
            "conformes_prd": "CONF. TL,CONF.CHAPTER",
            "qa": "Karen Otoya",
            "dev": "Piero Yalan",
            "oc": "999999",
            "fecha_registro_srt": "2026-09-01"
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert data["codigo_srt"] == "SRT_2026-99999"
    assert data["tipo_ambiente"] == "A"
    assert data["estado_srt"] == "REGISTRADO"
    pase_id = data["pase_id"]

    # Listar con filtro por CODIGO_SRT
    list_res = client.get(
        "/api/pases?codigo_srt=SRT_2026-99999",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    assert any(p["pase_id"] == pase_id for p in items)

def test_pases_validation_rechazado_anulado_requires_motivo(client: TestClient, swe_token: str):
    # 1. Crear con RECHAZADO sin motivo debe fallar (HTTP 400)
    res_fail = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "D",
            "titulo": "Pase Rechazado Sin Motivo",
            "estado_srt": "RECHAZADO"
        }
    )
    assert res_fail.status_code == 400
    assert "motivo" in res_fail.json()["detail"].lower()

    # 2. Crear con ANULADO sin motivo debe fallar (HTTP 400)
    res_fail_anulado = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "D",
            "titulo": "Pase Anulado Sin Motivo",
            "estado_srt": "ANULADO"
        }
    )
    assert res_fail_anulado.status_code == 400
    assert "motivo" in res_fail_anulado.json()["detail"].lower()

    # 3. Crear con RECHAZADO con motivo debe tener éxito
    res_ok = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "D",
            "titulo": "Pase Rechazado Con Motivo",
            "estado_srt": "RECHAZADO",
            "motivo_estado": "Pruebas de regresión arrojaron errores críticos en UAT."
        }
    )
    assert res_ok.status_code == 201
    pase_id = res_ok.json()["pase_id"]
    assert res_ok.json()["motivo_estado"] == "Pruebas de regresión arrojaron errores críticos en UAT."

    # 4. Actualizar a ANULADO sin motivo debe fallar
    res_up_fail = client.put(
        f"/api/pases/{pase_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "estado_srt": "ANULADO",
            "motivo_estado": ""
        }
    )
    assert res_up_fail.status_code == 400

    # 5. Actualizar a ANULADO con motivo debe funcionar
    res_up_ok = client.put(
        f"/api/pases/{pase_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "estado_srt": "ANULADO",
            "motivo_estado": "Se canceló el requerimiento por decisión del PO."
        }
    )
    assert res_up_ok.status_code == 200
    assert res_up_ok.json()["estado_srt"] == "ANULADO"
    assert res_up_ok.json()["motivo_estado"] == "Se canceló el requerimiento por decisión del PO."

def test_delete_pase(client: TestClient, swe_token: str):
    # Crear un pase para eliminar
    res_crear = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "H",
            "titulo": "Pase Temporal para Eliminar",
            "estado_srt": "REGISTRADO"
        }
    )
    assert res_crear.status_code == 201
    pase_id = res_crear.json()["pase_id"]

    # Eliminar pase
    res_del = client.delete(
        f"/api/pases/{pase_id}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_del.status_code == 200

    # Verificar que ya no existe (404)
    res_get = client.get(
        f"/api/pases/{pase_id}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_get.status_code == 404

def test_prd_ejecutado_requires_six_mandatory_fields(client: TestClient, swe_token: str):
    # 1. Crear directamente con PRD_EJECUTADO sin los 6 campos debe fallar (HTTP 400)
    res_fail = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "D",
            "titulo": "Pase PRD Incompleto",
            "estado_srt": "PRD_EJECUTADO"
        }
    )
    assert res_fail.status_code == 400
    detail = res_fail.json()["detail"]
    assert "PRD_EJECUTADO" in detail
    assert "Orden de Cambio (OC)" in detail
    assert "Estado OC" in detail
    assert "Fecha Registro OC" in detail
    assert "Fecha y Hora Pase PRD (*)" in detail
    assert "Fecha Certificación" in detail
    assert "Operador Pase" in detail

    # 2. Crear un pase en REGISTRADO
    res_crear = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "D",
            "titulo": "Pase a Producir Flujo Completo",
            "estado_srt": "REGISTRADO"
        }
    )
    assert res_crear.status_code == 201
    pase_id = res_crear.json()["pase_id"]

    # 3. Intentar actualizar a PRD_EJECUTADO sin completar los 6 campos debe fallar (HTTP 400)
    res_up_fail = client.put(
        f"/api/pases/{pase_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "estado_srt": "PRD_EJECUTADO",
            "oc": "167922"
            # faltan los otros 5 campos
        }
    )
    assert res_up_fail.status_code == 400
    assert "PRD_EJECUTADO" in res_up_fail.json()["detail"]

    # 4. Actualizar a PRD_EJECUTADO con todos los 6 campos requeridos debe funcionar exitosamente
    res_up_ok = client.put(
        f"/api/pases/{pase_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "estado_srt": "PRD_EJECUTADO",
            "oc": "167922",
            "stado_oc": "Aprobado",
            "fecha_registro_oc": "2026-09-20",
            "fecha_hora_pase_prd": "2026-09-21T02:30:00",
            "fecha_certificacion": "2026-09-19",
            "operador_pase": "Carlos Ramirez"
        }
    )
    assert res_up_ok.status_code == 200
    data_prd = res_up_ok.json()
    assert data_prd["estado_srt"] == "PRD_EJECUTADO"
    assert data_prd["oc"] == "167922"
    assert data_prd["stado_oc"] == "Aprobado"
    assert data_prd["operador_pase"] == "Carlos Ramirez"

def test_prd_ejecutado_is_final_and_immutable(client: TestClient, swe_token: str):
    # 1. Crear un pase y pasarlo a PRD_EJECUTADO con todos los campos
    res_crear = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "A",
            "titulo": "Pase para Probar Inmutabilidad",
            "estado_srt": "REGISTRADO"
        }
    )
    assert res_crear.status_code == 201
    pase_id = res_crear.json()["pase_id"]

    res_up = client.put(
        f"/api/pases/{pase_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "estado_srt": "PRD_EJECUTADO",
            "oc": "168000",
            "stado_oc": "Cerrado",
            "fecha_registro_oc": "2026-09-22",
            "fecha_hora_pase_prd": "2026-09-23T01:00:00",
            "fecha_certificacion": "2026-09-22",
            "operador_pase": "Marco Gomez"
        }
    )
    assert res_up.status_code == 200
    assert res_up.json()["estado_srt"] == "PRD_EJECUTADO"

    # 2. Intentar modificar cualquier campo o cambiar el estado cuando ya está en PRD_EJECUTADO
    # DEBE FALLAR con HTTP 400
    res_mod_intento = client.put(
        f"/api/pases/{pase_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "titulo": "Intento de cambiar titulo en pase ejecutado",
            "estado_srt": "QA_CERTIFICADO"
        }
    )
    assert res_mod_intento.status_code == 400
    detail = res_mod_intento.json()["detail"]
    assert "PRD_EJECUTADO" in detail
    assert "ya no se puede modificar" in detail.lower()

    # 3. Intentar eliminar un pase en PRD_EJECUTADO debe fallar con HTTP 400
    res_del_intento = client.delete(
        f"/api/pases/{pase_id}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_del_intento.status_code == 400
    assert "PRD_EJECUTADO" in res_del_intento.json()["detail"]

def test_codigo_srt_uniqueness_and_by_srt_endpoint(client: TestClient, swe_token: str):
    # 1. Crear primer pase con un código SRT único
    codigo_srt_test = "SRT_2026-UNIQUE-TEST"
    res1 = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "D",
            "titulo": "Pase Original SRT Unico",
            "codigo_srt": codigo_srt_test,
            "estado_srt": "REGISTRADO"
        }
    )
    assert res1.status_code == 201
    pase1_id = res1.json()["pase_id"]

    # 2. Consultar por endpoint /by-srt/{codigo_srt}
    res_get = client.get(
        f"/api/pases/by-srt/{codigo_srt_test}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_get.status_code == 200
    assert res_get.json()["pase_id"] == pase1_id
    assert res_get.json()["codigo_srt"] == codigo_srt_test

    # 3. Intentar crear OTRO pase con el MISMO código SRT -> DEBE FALLAR con HTTP 400
    res_dup = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "D",
            "titulo": "Pase Duplicado SRT",
            "codigo_srt": codigo_srt_test,
            "estado_srt": "REGISTRADO"
        }
    )
    assert res_dup.status_code == 400
    assert "ya existe un pase registrado" in res_dup.json()["detail"].lower()

    # 4. Crear un segundo pase con otro SRT y luego intentar actualizarlo con el SRT del primer pase -> DEBE FALLAR con HTTP 400
    res2 = client.post(
        "/api/pases",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo_ambiente": "D",
            "titulo": "Pase Segundo",
            "codigo_srt": "SRT_2026-OTRO-TEST",
            "estado_srt": "REGISTRADO"
        }
    )
    assert res2.status_code == 201
    pase2_id = res2.json()["pase_id"]

    res_up_dup = client.put(
        f"/api/pases/{pase2_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "codigo_srt": codigo_srt_test
        }
    )
    assert res_up_dup.status_code == 400
    assert "ya existe otro pase registrado" in res_up_dup.json()["detail"].lower()

