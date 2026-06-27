from datetime import datetime


def test_list_transactions_empty(client):
    res = client.get("/api/transactions")
    assert res.status_code == 200
    body = res.json()
    assert body["transactions"] == []
    assert float(body["stats"]["balance"]) == 0
    assert body["total"] == 0


def test_create_and_get_transaction(client):
    payload = {
        "type": "income",
        "amount": "1500.50",
        "category": "Salary",
        "description": "Monthly pay",
        "date": "2026-01-15T09:00:00",
    }
    create_res = client.post("/api/transactions", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["type"] == "income"
    assert float(created["amount"]) == 1500.50

    list_res = client.get("/api/transactions")
    assert list_res.status_code == 200
    body = list_res.json()
    assert body["total"] == 1
    assert float(body["stats"]["total_income"]) == 1500.50


def test_create_invalid_amount(client):
    res = client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 0, "category": "Groceries"},
    )
    assert res.status_code == 422


def test_create_invalid_category_for_type(client):
    res = client.post(
        "/api/transactions",
        json={"type": "income", "amount": 100, "category": "Groceries"},
    )
    assert res.status_code == 422


def test_update_transaction(client):
    create_res = client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 25, "category": "Groceries"},
    )
    tx_id = create_res.json()["id"]

    update_res = client.put(
        f"/api/transactions/{tx_id}",
        json={"type": "expense", "amount": 30, "category": "Groceries"},
    )
    assert update_res.status_code == 200
    assert float(update_res.json()["amount"]) == 30


def test_update_missing_transaction(client):
    res = client.put(
        "/api/transactions/9999",
        json={"type": "expense", "amount": 10, "category": "Groceries"},
    )
    assert res.status_code == 404


def test_delete_transaction(client):
    create_res = client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 12, "category": "Transport"},
    )
    tx_id = create_res.json()["id"]

    delete_res = client.delete(f"/api/transactions/{tx_id}")
    assert delete_res.status_code == 204

    list_res = client.get("/api/transactions")
    assert list_res.json()["total"] == 0


def test_delete_missing_transaction(client):
    res = client.delete("/api/transactions/9999")
    assert res.status_code == 404


def test_filter_by_type(client):
    client.post(
        "/api/transactions",
        json={"type": "income", "amount": 100, "category": "Salary"},
    )
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 40, "category": "Groceries"},
    )

    res = client.get("/api/transactions", params={"type": "expense"})
    body = res.json()
    assert body["total"] == 1
    assert body["transactions"][0]["type"] == "expense"
    assert float(body["stats"]["total_expense"]) == 40


def test_search_transactions(client):
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 15,
            "category": "Dining Out",
            "description": "Pizza night",
        },
    )
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 5, "category": "Transport"},
    )

    res = client.get("/api/transactions", params={"search": "pizza"})
    assert res.json()["total"] == 1


def test_export_csv(client):
    client.post(
        "/api/transactions",
        json={"type": "income", "amount": 50, "category": "Salary"},
    )
    res = client.get("/api/transactions/export")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Salary" in res.text


def test_analytics(client):
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 20,
            "category": "Groceries",
            "date": datetime.now().isoformat(),
        },
    )
    res = client.get("/api/analytics")
    assert res.status_code == 200
    body = res.json()
    assert len(body["by_category"]) == 1
    assert body["by_category"][0]["category"] == "Groceries"


def test_budget_crud(client):
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 30, "category": "Groceries"},
    )

    set_res = client.put("/api/budgets", json={"category": "Groceries", "amount": 200})
    assert set_res.status_code == 200

    list_res = client.get("/api/budgets")
    assert list_res.status_code == 200
    budgets = list_res.json()
    assert len(budgets) == 1
    assert float(budgets[0]["spent"]) == 30
    assert float(budgets[0]["remaining"]) == 170

    delete_res = client.delete(f"/api/budgets/{budgets[0]['id']}")
    assert delete_res.status_code == 204


def test_recurring_post(client):
    create_res = client.post(
        "/api/recurring",
        json={
            "type": "expense",
            "amount": 50,
            "category": "Rent",
            "frequency": "monthly",
            "next_date": "2026-02-01T00:00:00",
        },
    )
    recurring_id = create_res.json()["id"]

    post_res = client.post(f"/api/recurring/{recurring_id}/post")
    assert post_res.status_code == 201

    list_res = client.get("/api/transactions")
    assert list_res.json()["total"] == 1


def test_get_categories(client):
    res = client.get("/api/categories")
    assert res.status_code == 200
    body = res.json()
    assert "Salary" in body["income"]
    assert "Groceries" in body["expense"]
