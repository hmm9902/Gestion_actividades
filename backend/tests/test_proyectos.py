from fastapi.testclient import TestClient

def test_desarrollador_cannot_create_proyecto(client: TestClient, dev_token: str):
    response = client.post(
        "/api/proyectos",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={
            "nombre_proyecto": "PROYECTO DEV FAIL",
            "equipo_solicitante": "DEV TEAM"
        }
    )
    # Solo ADMIN y SWE pueden crear proyectos
    assert response.status_code == 403

def test_swe_can_create_proyecto_and_list(client: TestClient, swe_token: str):
    response = client.post(
        "/api/proyectos",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_proyecto": "MIGRACION CLOUD 2026",
            "descripcion_proyecto": "Migración de servicios legacy a microservicios cloud",
            "equipo_solicitante": "ARQUITECTURA DIGITAL",
            "posibles_impedimentos": "Ventana de mantenimiento limitada",
            "fecha_dead_line": "2026-12-31"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["nombre_proyecto"] == "MIGRACION CLOUD 2026"
    assert data["equipo_solicitante"] == "ARQUITECTURA DIGITAL"
    assert data["estado"] == "Activo"
    proyecto_id = data["proyecto_id"]

    # Listar proyectos
    list_res = client.get(
        "/api/proyectos",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert list_res.status_code == 200
    nombres = [p["nombre_proyecto"] for p in list_res.json()]
    assert "MIGRACION CLOUD 2026" in nombres

    # Actualizar proyecto a standBy
    update_res = client.put(
        f"/api/proyectos/{proyecto_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "descripcion_proyecto": "Descripción actualizada",
            "estado": "standBy"
        }
    )
    assert update_res.status_code == 200
    assert update_res.json()["descripcion_proyecto"] == "Descripción actualizada"
    assert update_res.json()["estado"] == "standBy"

    # Actualizar proyecto a Entregado
    entregado_res = client.put(
        f"/api/proyectos/{proyecto_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "estado": "Entregado"
        }
    )
    assert entregado_res.status_code == 200
    assert entregado_res.json()["estado"] == "Entregado"

def test_crear_actividad_con_nombre_proyecto(client: TestClient, swe_token: str):
    # 1. Crear proyecto
    proy_res = client.post(
        "/api/proyectos",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_proyecto": "CORE BANKING V3",
            "equipo_solicitante": "TRIBUS DIGITALES"
        }
    )
    assert proy_res.status_code in [201, 400]  # si ya existía o nuevo

    # 2. Crear actividad asociada a dicho proyecto
    act_res = client.post(
        "/api/actividades",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "codigo_actividad": "ACT-PROY-01",
            "titulo": "Implementar módulo de pagos",
            "tipo_actividad": "TAREA",
            "nombre_proyecto": "CORE BANKING V3",
            "codigo_grupo": "SQUAD-ALPHA",
            "asignado_registro": "X15400"
        }
    )
    assert act_res.status_code == 201
    act_data = act_res.json()
    assert act_data["codigo_actividad"] == "ACT-PROY-01"
    assert act_data["nombre_proyecto"] == "CORE BANKING V3"

    # 3. Obtener detalle de actividad
    get_res = client.get(
        "/api/actividades/ACT-PROY-01",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert get_res.status_code == 200
    assert get_res.json()["nombre_proyecto"] == "CORE BANKING V3"

def test_proyecto_estado_validation(client: TestClient, swe_token: str):
    # Intentar crear con estado inválido
    bad_res = client.post(
        "/api/proyectos",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_proyecto": "PROYECTO ESTADO INVALIDO",
            "equipo_solicitante": "QA TEAM",
            "estado": "CANCELADO"
        }
    )
    assert bad_res.status_code == 422

    # Intentar con Activo, standBy y Entregado
    for valid_estado in ["Activo", "standBy", "Entregado"]:
        good_res = client.post(
            "/api/proyectos",
            headers={"Authorization": f"Bearer {swe_token}"},
            json={
                "nombre_proyecto": f"PROYECTO VALIDO {valid_estado}",
                "equipo_solicitante": "QA TEAM",
                "estado": valid_estado
            }
        )
        assert good_res.status_code in [201, 400]
        if good_res.status_code == 201:
            assert good_res.json()["estado"] == valid_estado

def test_proyecto_visible_creation_and_filtering(client: TestClient, swe_token: str):
    # 1. Crear proyecto visible por defecto (SI)
    res_si = client.post(
        "/api/proyectos",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_proyecto": "PROYECTO VISIBLE SI TEST",
            "equipo_solicitante": "TRIBU VISIBLE",
            "visible": "SI"
        }
    )
    assert res_si.status_code == 201
    data_si = res_si.json()
    assert data_si["visible"] == "SI"
    proy_si_id = data_si["proyecto_id"]

    # 2. Crear proyecto con visible = NO
    res_no = client.post(
        "/api/proyectos",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_proyecto": "PROYECTO OCULTO NO TEST",
            "equipo_solicitante": "TRIBU OCULTA",
            "visible": "NO"
        }
    )
    assert res_no.status_code == 201
    data_no = res_no.json()
    assert data_no["visible"] == "NO"
    proy_no_id = data_no["proyecto_id"]

    # 3. Validar filtro visible=SI
    list_si = client.get(
        "/api/proyectos?visible=SI",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert list_si.status_code == 200
    nombres_si = [p["nombre_proyecto"] for p in list_si.json()]
    assert "PROYECTO VISIBLE SI TEST" in nombres_si
    assert "PROYECTO OCULTO NO TEST" not in nombres_si

    # 4. Validar filtro visible=NO
    list_no = client.get(
        "/api/proyectos?visible=NO",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert list_no.status_code == 200
    nombres_no = [p["nombre_proyecto"] for p in list_no.json()]
    assert "PROYECTO OCULTO NO TEST" in nombres_no
    assert "PROYECTO VISIBLE SI TEST" not in nombres_no

    # 5. Modificar proyecto de SI a NO en "Editar Proyecto"
    update_res = client.put(
        f"/api/proyectos/{proy_si_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "visible": "NO"
        }
    )
    assert update_res.status_code == 200
    assert update_res.json()["visible"] == "NO"

    # 6. Validar que valores inválidos para visible sean rechazados (422)
    bad_visible = client.post(
        "/api/proyectos",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "nombre_proyecto": "PROYECTO INVALIDO VISIBLE",
            "equipo_solicitante": "TRIBU INVALIDA",
            "visible": "TAL_VEZ"
        }
    )
    assert bad_visible.status_code == 422
