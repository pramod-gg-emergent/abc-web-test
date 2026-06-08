"""
Expense Tracker backend tests.
Covers: categories, expenses CRUD, week summary, budget, suggestions (LLM).
"""
import time
import pytest


# ----- Categories -----
class TestCategories:
    def test_categories_returns_seven(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/categories", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        expected = ["Food", "Transport", "Shopping", "Bills",
                    "Entertainment", "Health", "Others"]
        assert data.get("categories") == expected


# ----- Expense CRUD -----
class TestExpenseCRUD:
    def test_create_invalid_amount(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/expenses",
                            json={"amount": 0, "category": "Food"})
        assert r.status_code == 400

    def test_create_invalid_category(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/expenses",
                            json={"amount": 10, "category": "Bogus"})
        assert r.status_code == 400

    def test_create_and_list(self, api_client, base_url, cleanup_expenses):
        payload = {"amount": 12.5, "category": "Food", "note": "TEST_lunch"}
        r = api_client.post(f"{base_url}/api/expenses", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body and body["amount"] == 12.5
        assert body["category"] == "Food"
        assert "_id" not in body  # no mongo leak
        eid = body["id"]
        cleanup_expenses.append(eid)

        # GET list
        lr = api_client.get(f"{base_url}/api/expenses")
        assert lr.status_code == 200
        ids = [x["id"] for x in lr.json()]
        assert eid in ids

    def test_update(self, api_client, base_url, cleanup_expenses):
        r = api_client.post(f"{base_url}/api/expenses",
                            json={"amount": 5, "category": "Transport", "note": "TEST_old"})
        eid = r.json()["id"]
        cleanup_expenses.append(eid)

        u = api_client.put(f"{base_url}/api/expenses/{eid}",
                           json={"amount": 9.5, "note": "TEST_new"})
        assert u.status_code == 200, u.text
        assert u.json()["amount"] == 9.5
        assert u.json()["note"] == "TEST_new"

        # invalid update
        bad = api_client.put(f"{base_url}/api/expenses/{eid}",
                             json={"amount": -1})
        assert bad.status_code == 400

    def test_delete_and_404(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/expenses",
                            json={"amount": 1, "category": "Others", "note": "TEST_del"})
        eid = r.json()["id"]
        d = api_client.delete(f"{base_url}/api/expenses/{eid}")
        assert d.status_code == 200
        d2 = api_client.delete(f"{base_url}/api/expenses/{eid}")
        assert d2.status_code == 404

    def test_list_with_date_filter(self, api_client, base_url, cleanup_expenses):
        r = api_client.post(f"{base_url}/api/expenses",
                            json={"amount": 4, "category": "Bills",
                                  "note": "TEST_filter", "date": "2020-01-15"})
        assert r.status_code == 200
        eid = r.json()["id"]
        cleanup_expenses.append(eid)

        lr = api_client.get(f"{base_url}/api/expenses",
                            params={"start": "2020-01-01", "end": "2020-01-31"})
        assert lr.status_code == 200
        ids = [x["id"] for x in lr.json()]
        assert eid in ids

        lr2 = api_client.get(f"{base_url}/api/expenses",
                             params={"start": "2021-01-01", "end": "2021-01-31"})
        assert eid not in [x["id"] for x in lr2.json()]


# ----- Budget -----
class TestBudget:
    def test_set_and_get(self, api_client, base_url):
        s = api_client.put(f"{base_url}/api/budget",
                           json={"weekly_limit": 200.0, "currency": "USD"})
        assert s.status_code == 200
        assert s.json()["weekly_limit"] == 200.0
        assert s.json()["currency"] == "USD"

        g = api_client.get(f"{base_url}/api/budget")
        assert g.status_code == 200
        assert g.json()["weekly_limit"] == 200.0

    def test_negative_limit_rejected(self, api_client, base_url):
        r = api_client.put(f"{base_url}/api/budget",
                           json={"weekly_limit": -1})
        assert r.status_code == 400


# ----- Week Summary -----
class TestWeekSummary:
    def test_week_structure(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/expenses/week")
        assert r.status_code == 200, r.text
        data = r.json()
        for key in ["week_start", "week_end", "total", "by_category",
                    "by_day", "weekly_limit", "currency",
                    "percent_used", "over_limit"]:
            assert key in data
        assert len(data["by_day"]) == 7
        # All 7 categories present
        for c in ["Food", "Transport", "Shopping", "Bills",
                  "Entertainment", "Health", "Others"]:
            assert c in data["by_category"]

    def test_over_limit_logic(self, api_client, base_url, cleanup_expenses):
        # Set a low limit and add an expense above it
        api_client.put(f"{base_url}/api/budget",
                       json={"weekly_limit": 10.0, "currency": "USD"})
        r = api_client.post(f"{base_url}/api/expenses",
                            json={"amount": 50.0, "category": "Food",
                                  "note": "TEST_over"})
        assert r.status_code == 200
        cleanup_expenses.append(r.json()["id"])

        s = api_client.get(f"{base_url}/api/expenses/week").json()
        assert s["over_limit"] is True
        assert s["percent_used"] >= 500.0


# ----- Suggestions (LLM) -----
class TestSuggestions:
    def test_suggestions_returns_three(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/suggestions", timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "summary" in data and isinstance(data["summary"], str)
        assert "suggestions" in data
        assert len(data["suggestions"]) >= 3
        for s in data["suggestions"][:3]:
            assert "title" in s and "body" in s
            assert s["title"] and s["body"]
