from fastapi.testclient import TestClient

def test_desarrollador_cannot_access_tickets(client: TestClient, dev_token: str):
    # GET list no permitido para desarrollador (solo ADMIN y SWE)
    res_get = client.get(
        "/api/tickets",
        headers={"Authorization": f"Bearer {dev_token}"}
    )
    assert res_get.status_code == 403

    # POST no permitido para desarrollador
    res_post = client.post(
        "/api/tickets",
        headers={"Authorization": f"Bearer {dev_token}"},
        json={
            "tipo": "Incident",
            "ticket": "TKT-TEST-DEV",
            "descripcion": "Intento de creación no autorizada"
        }
    )
    assert res_post.status_code == 403

def test_swe_can_create_and_list_tickets(client: TestClient, swe_token: str):
    res = client.post(
        "/api/tickets",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo": "Incident",
            "ticket": "TKT-TEST-001",
            "descripcion": "Error al procesar transaccion en canal digital",
            "proyecto": "C2C-FCD",
            "aplicativo": "FCD",
            "ambiente": "UAT",
            "estado": "ABIERTO",
            "ibm_asignado": "IBM.Mirez Florian, Cesar",
            "cel_contacto": "999888777",
            "comentario": "Ticket de prueba automatizada"
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert data["ticket"] == "TKT-TEST-001"
    assert data["tipo"] == "Incident"
    assert data["estado"] == "ABIERTO"
    ticket_id = data["ticket_id"]

    # Listar con filtro por ticket
    list_res = client.get(
        "/api/tickets?ticket=TKT-TEST-001",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    assert any(t["ticket_id"] == ticket_id for t in items)

def test_ticket_filters_tipo_ticket_descripcion(client: TestClient, swe_token: str):
    # Crear ticket especifico para test de filtros
    res = client.post(
        "/api/tickets",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo": "OC",
            "ticket": "OC-99887766",
            "descripcion": "Orden de Cambio Exclusiva Para Certificados SSL",
            "proyecto": "C2C-FCD",
            "aplicativo": "FCD",
            "ambiente": "PRD",
            "estado": "ASIGNADO"
        }
    )
    assert res.status_code == 201
    tkt_id = res.json()["ticket_id"]

    # 1. Filtro por tipo
    res_tipo = client.get(
        "/api/tickets?tipo=OC",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_tipo.status_code == 200
    assert all(t["tipo"] == "OC" for t in res_tipo.json())

    # 2. Filtro por ticket
    res_tkt = client.get(
        "/api/tickets?ticket=OC-99887766",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_tkt.status_code == 200
    assert any(t["ticket_id"] == tkt_id for t in res_tkt.json())

    # 3. Filtro por descripcion
    res_desc = client.get(
        "/api/tickets?descripcion=Exclusiva Para Certificados",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_desc.status_code == 200
    assert any(t["ticket_id"] == tkt_id for t in res_desc.json())

def test_ticket_terminal_states_rule(client: TestClient, swe_token: str):
    """
    Regla: CUANDO ESTE EN ESTADO (SOLUCIONADO/ANULADO Y RECHAZADO) YA NO PODRA CAMBIAR DE ESTADO
    """
    # 1. Crear ticket en ABIERTO
    res = client.post(
        "/api/tickets",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo": "Request",
            "ticket": "TKT-TERMINAL-TEST",
            "descripcion": "Ticket para probar bloqueo de estados terminales",
            "estado": "EN_PROCESO"
        }
    )
    assert res.status_code == 201
    ticket_id = res.json()["ticket_id"]

    # 2. Cambiar de EN_PROCESO a SOLUCIONADO (debe permitirse)
    res_sol = client.put(
        f"/api/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={"estado": "SOLUCIONADO"}
    )
    assert res_sol.status_code == 200
    assert res_sol.json()["estado"] == "SOLUCIONADO"

    # 3. Intentar cambiar de SOLUCIONADO a ABIERTO (debe fallar con HTTP 400)
    res_fail = client.put(
        f"/api/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={"estado": "ABIERTO"}
    )
    assert res_fail.status_code == 400
    assert "estado terminal" in res_fail.json()["detail"].lower()

    # 4. Probar con ANULADO
    res2 = client.post(
        "/api/tickets",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo": "Incident",
            "ticket": "TKT-ANULADO-TEST",
            "descripcion": "Ticket anulado",
            "estado": "ANULADO"
        }
    )
    tkt_anulado_id = res2.json()["ticket_id"]
    res_fail2 = client.put(
        f"/api/tickets/{tkt_anulado_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={"estado": "EN_PROCESO"}
    )
    assert res_fail2.status_code == 400

    # 5. Probar con RECHAZADO
    res3 = client.post(
        "/api/tickets",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo": "Incident",
            "ticket": "TKT-RECHAZADO-TEST",
            "descripcion": "Ticket rechazado",
            "estado": "RECHAZADO"
        }
    )
    tkt_rechazado_id = res3.json()["ticket_id"]
    res_fail3 = client.put(
        f"/api/tickets/{tkt_rechazado_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={"estado": "DEVUELTO"}
    )
    assert res_fail3.status_code == 400

    # 6. Modificar otros campos manteniendo el estado terminal (debe permitirse)
    res_ok = client.put(
        f"/api/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={"comentario": "Comentario adicional de cierre", "estado": "SOLUCIONADO"}
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["comentario"] == "Comentario adicional de cierre"

def test_delete_ticket(client: TestClient, swe_token: str):
    res = client.post(
        "/api/tickets",
        headers={"Authorization": f"Bearer {swe_token}"},
        json={
            "tipo": "Request",
            "ticket": "TKT-PARA-ELIMINAR",
            "descripcion": "Ticket temporal"
        }
    )
    ticket_id = res.json()["ticket_id"]

    res_del = client.delete(
        f"/api/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_del.status_code == 200

    # Verificar que ya no existe
    res_get = client.get(
        f"/api/tickets/{ticket_id}",
        headers={"Authorization": f"Bearer {swe_token}"}
    )
    assert res_get.status_code == 404
