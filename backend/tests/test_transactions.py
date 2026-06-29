from datetime import datetime, timedelta


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
    updated = update_res.json()
    assert float(updated["amount"]) == 30
    assert updated["date"] == create_res.json()["date"]


def test_transaction_put_omitted_date_not_reset_to_now(client):
    """PUT must not call _default_date() when date is omitted from the body."""
    original_date = "2026-01-15T09:00:00"
    create_res = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "25",
            "category": "Groceries",
            "date": original_date,
        },
    )
    tx_id = create_res.json()["id"]
    assert create_res.json()["date"].startswith("2026-01-15")

    update_res = client.put(
        f"/api/transactions/{tx_id}",
        json={"type": "expense", "amount": "30", "category": "Groceries"},
    )
    assert update_res.status_code == 200
    assert update_res.json()["date"] == create_res.json()["date"]
    assert update_res.json()["date"].startswith("2026-01-15")


def test_transaction_put_explicit_null_date_preserves_existing(client):
    create_res = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "25",
            "category": "Groceries",
            "date": "2026-01-15T09:00:00",
        },
    )
    tx_id = create_res.json()["id"]
    original_date = create_res.json()["date"]

    update_res = client.put(
        f"/api/transactions/{tx_id}",
        json={
            "type": "expense",
            "amount": "30",
            "category": "Groceries",
            "date": None,
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["date"] == original_date


def test_update_missing_transaction(client):
    res = client.put(
        "/api/transactions/9999",
        json={"type": "expense", "amount": 10, "category": "Groceries"},
    )
    assert res.status_code == 404


def test_transaction_partial_put_preserves_unset_fields(client):
    create_res = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": "25",
            "category": "Groceries",
            "description": "Weekly shop",
            "date": "2026-01-15T09:00:00",
        },
    )
    tx_id = create_res.json()["id"]
    original = create_res.json()

    update_res = client.put(
        f"/api/transactions/{tx_id}",
        json={"amount": "30"},
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert float(updated["amount"]) == 30
    assert updated["type"] == original["type"]
    assert updated["category"] == original["category"]
    assert updated["description"] == original["description"]
    assert updated["date"] == original["date"]


def test_goal_partial_put_preserves_current_amount(client):
    create_res = client.post(
        "/api/goals",
        json={"name": "Emergency fund", "target_amount": 1000},
    )
    goal_id = create_res.json()["id"]

    contribute_res = client.post(
        f"/api/goals/{goal_id}/contribute", json={"amount": 250}
    )
    assert contribute_res.status_code == 200

    update_res = client.put(
        f"/api/goals/{goal_id}",
        json={"name": "Rainy day", "target_amount": 2000},
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["name"] == "Rainy day"
    assert float(updated["target_amount"]) == 2000
    assert float(updated["current_amount"]) == 250


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


def test_pagination_defaults_to_10_per_page(client):
    for i in range(12):
        client.post(
            "/api/transactions",
            json={"type": "expense", "amount": i + 1, "category": "Groceries"},
        )

    res = client.get("/api/transactions")
    body = res.json()
    assert body["page_size"] == 10
    assert body["page"] == 1
    assert body["total"] == 12
    assert body["total_pages"] == 2
    assert len(body["transactions"]) == 10

    page2 = client.get("/api/transactions", params={"page": 2}).json()
    assert len(page2["transactions"]) == 2


def test_page_size_can_be_raised_to_50(client):
    res = client.get("/api/transactions", params={"page_size": 50})
    assert res.status_code == 200
    assert res.json()["page_size"] == 50


def test_page_size_above_50_is_rejected(client):
    res = client.get("/api/transactions", params={"page_size": 51})
    assert res.status_code == 422


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


def test_search_treats_underscore_as_literal(client):
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 10,
            "category": "Other Expense",
            "description": "fixed_value",
        },
    )
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 11,
            "category": "Other Expense",
            "description": "fixed1value",
        },
    )

    res = client.get("/api/transactions", params={"search": "fixed_value"})
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


def test_export_csv_formula_injection(client):
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 1,
            "category": "Other Expense",
            "description": "=2+2",
        },
    )
    res = client.get("/api/transactions/export")
    assert res.status_code == 200
    assert "'=2+2" in res.text


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
    # Future date so creation does not auto-post; this exercises manual "Post now".
    create_res = client.post(
        "/api/recurring",
        json={
            "type": "expense",
            "amount": 50,
            "category": "Rent",
            "frequency": "monthly",
            "next_date": "2099-02-01T00:00:00",
        },
    )
    recurring_id = create_res.json()["id"]

    assert client.get("/api/transactions").json()["total"] == 0

    post_res = client.post(f"/api/recurring/{recurring_id}/post")
    assert post_res.status_code == 201

    list_res = client.get("/api/transactions")
    assert list_res.json()["total"] == 1


def test_recurring_auto_posts_on_create_when_due(client):
    past = (datetime.now() - timedelta(days=5)).isoformat()
    create_res = client.post(
        "/api/recurring",
        json={
            "type": "expense",
            "amount": 12,
            "category": "Subscriptions",
            "frequency": "monthly",
            "next_date": past,
        },
    )
    assert create_res.status_code == 201

    # The due occurrence is posted immediately, no manual action needed.
    txs = client.get("/api/transactions").json()
    assert txs["total"] == 1
    assert txs["transactions"][0]["category"] == "Subscriptions"

    # next_date is advanced into the future so it won't double-post.
    assert datetime.fromisoformat(create_res.json()["next_date"]) > datetime.now()


def test_get_categories(client):
    res = client.get("/api/categories")
    assert res.status_code == 200
    body = res.json()
    assert "Salary" in body["income"]
    assert "Groceries" in body["expense"]


def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["database"] in ("default", "e2e")
    assert body["db_ok"] is True
    assert isinstance(body["version"], str) and body["version"]
    assert body["uptime_seconds"] >= 0


def test_stats_balance_is_income_minus_expense(client):
    client.post(
        "/api/transactions",
        json={"type": "income", "amount": 500, "category": "Salary"},
    )
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 125, "category": "Groceries"},
    )

    res = client.get("/api/transactions")
    stats = res.json()["stats"]
    assert float(stats["total_income"]) == 500
    assert float(stats["total_expense"]) == 125
    assert float(stats["balance"]) == 375


def test_filter_by_category(client):
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 10, "category": "Groceries"},
    )
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 20, "category": "Transport"},
    )

    res = client.get("/api/transactions", params={"category": "Transport"})
    body = res.json()
    assert body["total"] == 1
    assert body["transactions"][0]["category"] == "Transport"


def test_filter_by_date_range(client):
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 5,
            "category": "Groceries",
            "date": "2026-01-15T00:00:00",
        },
    )
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 15,
            "category": "Groceries",
            "date": "2026-03-01T00:00:00",
        },
    )

    res = client.get(
        "/api/transactions",
        params={"from": "2026-02-01T00:00:00", "to": "2026-03-31T23:59:59"},
    )
    assert res.json()["total"] == 1
    assert float(res.json()["transactions"][0]["amount"]) == 15


def test_export_respects_filters(client):
    client.post(
        "/api/transactions",
        json={"type": "income", "amount": 50, "category": "Salary"},
    )
    client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 10, "category": "Groceries"},
    )

    res = client.get("/api/transactions/export", params={"type": "income"})
    assert res.status_code == 200
    assert "Salary" in res.text
    assert "Groceries" not in res.text


def test_analytics_includes_monthly_breakdown(client):
    client.post(
        "/api/transactions",
        json={
            "type": "income",
            "amount": 1000,
            "category": "Salary",
            "date": "2026-01-10T00:00:00",
        },
    )
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 40,
            "category": "Groceries",
            "date": "2026-01-20T00:00:00",
        },
    )

    res = client.get("/api/analytics")
    body = res.json()
    assert float(body["stats"]["balance"]) == 960
    assert len(body["by_month"]) >= 1
    assert body["by_month"][0]["income"] is not None
    assert body["by_month"][0]["expense"] is not None


def test_budget_upsert_updates_limit(client):
    client.put("/api/budgets", json={"category": "Groceries", "amount": 100})
    client.put("/api/budgets", json={"category": "Groceries", "amount": 250})

    budgets = client.get("/api/budgets").json()
    assert len(budgets) == 1
    assert float(budgets[0]["amount"]) == 250


def test_budget_delete_missing(client):
    res = client.delete("/api/budgets/9999")
    assert res.status_code == 404


def test_list_recurring_and_delete(client):
    create_res = client.post(
        "/api/recurring",
        json={
            "type": "income",
            "amount": 200,
            "category": "Freelance",
            "frequency": "weekly",
            "next_date": "2099-04-01T00:00:00",
        },
    )
    recurring_id = create_res.json()["id"]

    list_res = client.get("/api/recurring")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["frequency"] == "weekly"

    delete_res = client.delete(f"/api/recurring/{recurring_id}")
    assert delete_res.status_code == 204
    assert client.get("/api/recurring").json() == []


def test_recurring_post_not_found(client):
    res = client.post("/api/recurring/9999/post")
    assert res.status_code == 404


def test_recurring_delete_not_found(client):
    res = client.delete("/api/recurring/9999")
    assert res.status_code == 404


def test_dashboard_summary(client):
    now = datetime.now()
    client.post(
        "/api/transactions",
        json={
            "type": "income",
            "amount": 1000,
            "category": "Salary",
            "date": now.isoformat(),
        },
    )
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 250,
            "category": "Groceries",
            "date": now.isoformat(),
        },
    )

    res = client.get("/api/dashboard")
    assert res.status_code == 200
    body = res.json()
    assert body["month"] == now.strftime("%Y-%m")
    assert float(body["income"]) == 1000
    assert float(body["expense"]) == 250
    assert float(body["balance"]) == 750
    assert body["top_category"] == "Groceries"
    assert body["transaction_count"] == 2
    assert "expense_comparison" in body


def test_dashboard_budget_health(client):
    now = datetime.now()
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "amount": 300,
            "category": "Groceries",
            "date": now.isoformat(),
        },
    )
    client.put("/api/budgets", json={"category": "Groceries", "amount": 100})

    body = client.get("/api/dashboard").json()
    assert body["budgets_total"] == 1
    assert body["budgets_over"] == 1


def test_recurring_auto_post_due_occurrences(db_session):
    from models import RecurringTransaction, Transaction
    from repository import post_due_recurring

    now = datetime.now()
    # Due monthly template from ~45 days ago should catch up two postings.
    db_session.add(
        RecurringTransaction(
            type="expense",
            amount=50,
            category="Rent",
            description=None,
            frequency="monthly",
            next_date=now - timedelta(days=45),
        )
    )
    # Future template should not post.
    db_session.add(
        RecurringTransaction(
            type="expense",
            amount=10,
            category="Transport",
            description=None,
            frequency="weekly",
            next_date=now + timedelta(days=7),
        )
    )
    db_session.commit()

    posted = post_due_recurring(db_session, now=now)
    assert posted == 2

    txs = db_session.query(Transaction).all()
    assert len(txs) == 2
    assert all(t.category == "Rent" for t in txs)

    future = (
        db_session.query(RecurringTransaction).filter_by(category="Transport").one()
    )
    assert future.next_date > now

    # Running again posts nothing new.
    assert post_due_recurring(db_session, now=now) == 0


def test_goals_crud_and_contribute(client):
    create_res = client.post(
        "/api/goals",
        json={"name": "Emergency fund", "target_amount": 1000},
    )
    assert create_res.status_code == 201
    goal = create_res.json()
    assert goal["name"] == "Emergency fund"
    assert float(goal["current_amount"]) == 0
    assert float(goal["remaining"]) == 1000
    assert goal["progress_pct"] == 0
    goal_id = goal["id"]

    contribute_res = client.post(
        f"/api/goals/{goal_id}/contribute", json={"amount": 250}
    )
    assert contribute_res.status_code == 200
    contributed = contribute_res.json()
    assert float(contributed["current_amount"]) == 250
    assert float(contributed["remaining"]) == 750
    assert contributed["progress_pct"] == 25

    update_res = client.put(
        f"/api/goals/{goal_id}",
        json={"name": "Rainy day", "target_amount": 2000, "current_amount": 250},
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Rainy day"

    list_res = client.get("/api/goals")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    delete_res = client.delete(f"/api/goals/{goal_id}")
    assert delete_res.status_code == 204
    assert client.get("/api/goals").json() == []


def test_goal_validation_and_not_found(client):
    bad = client.post("/api/goals", json={"name": "x", "target_amount": 0})
    assert bad.status_code == 422

    assert client.delete("/api/goals/9999").status_code == 404
    assert (
        client.post("/api/goals/9999/contribute", json={"amount": 5}).status_code
        == 404
    )


def test_structured_error_shape(client):
    not_found = client.delete("/api/transactions/9999")
    assert not_found.status_code == 404
    body = not_found.json()
    assert body["error"]["code"] == "not_found"
    assert body["error"]["message"] == "Transaction not found"

    invalid = client.post(
        "/api/transactions",
        json={"type": "expense", "amount": 0, "category": "Groceries"},
    )
    assert invalid.status_code == 422
    error = invalid.json()["error"]
    assert error["code"] == "validation_error"
    # The offending field is surfaced for single-field validation failures.
    assert error["field"] == "amount"
    assert isinstance(error["details"], list)
