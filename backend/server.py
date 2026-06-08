from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

ALLOWED_CATEGORIES = [
    "Food", "Transport", "Shopping", "Bills",
    "Entertainment", "Health", "Others"
]


# ===== Models =====
class ExpenseCreate(BaseModel):
    amount: float
    category: str
    note: Optional[str] = ""
    date: Optional[str] = None  # ISO date string (YYYY-MM-DD). Default today.


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    note: Optional[str] = None
    date: Optional[str] = None


class Expense(BaseModel):
    id: str
    amount: float
    category: str
    note: str
    date: str  # YYYY-MM-DD
    created_at: str


class BudgetSet(BaseModel):
    weekly_limit: float
    currency: Optional[str] = "USD"


class Budget(BaseModel):
    weekly_limit: float
    currency: str


class WeekSummary(BaseModel):
    week_start: str
    week_end: str
    total: float
    by_category: dict
    by_day: dict
    weekly_limit: float
    currency: str
    percent_used: float
    over_limit: bool


class Suggestion(BaseModel):
    title: str
    body: str


class SuggestionsResponse(BaseModel):
    suggestions: List[Suggestion]
    summary: str


# ===== Helpers =====
def serialize_expense(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "amount": doc["amount"],
        "category": doc["category"],
        "note": doc.get("note", ""),
        "date": doc["date"],
        "created_at": doc["created_at"],
    }


def current_week_range(today: Optional[datetime] = None):
    """Return (monday_date, sunday_date) as YYYY-MM-DD strings for the current week."""
    today = today or datetime.now(timezone.utc)
    weekday = today.weekday()  # Mon=0
    monday = today - timedelta(days=weekday)
    sunday = monday + timedelta(days=6)
    return monday.strftime("%Y-%m-%d"), sunday.strftime("%Y-%m-%d")


async def get_budget_doc() -> dict:
    doc = await db.budget.find_one({"_id": "global"}, {"_id": 0})
    if not doc:
        return {"weekly_limit": 0.0, "currency": "USD"}
    return doc


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"message": "Expense Tracker API"}


@api_router.get("/categories")
async def categories():
    return {"categories": ALLOWED_CATEGORIES}


@api_router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseCreate):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if payload.category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")

    date_str = payload.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # Validate date
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    doc = {
        "id": str(uuid.uuid4()),
        "amount": float(payload.amount),
        "category": payload.category,
        "note": (payload.note or "").strip(),
        "date": date_str,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.expenses.insert_one(doc)
    return serialize_expense(doc)


@api_router.get("/expenses", response_model=List[Expense])
async def list_expenses(start: Optional[str] = None, end: Optional[str] = None, limit: int = 200):
    query = {}
    if start or end:
        date_q = {}
        if start:
            date_q["$gte"] = start
        if end:
            date_q["$lte"] = end
        query["date"] = date_q
    cursor = db.expenses.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(limit)
    return [serialize_expense(d) for d in docs]


@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, payload: ExpenseUpdate):
    existing = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")

    update = {}
    if payload.amount is not None:
        if payload.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")
        update["amount"] = float(payload.amount)
    if payload.category is not None:
        if payload.category not in ALLOWED_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category")
        update["category"] = payload.category
    if payload.note is not None:
        update["note"] = payload.note.strip()
    if payload.date is not None:
        try:
            datetime.strptime(payload.date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
        update["date"] = payload.date

    if update:
        await db.expenses.update_one({"id": expense_id}, {"$set": update})
    refreshed = await db.expenses.find_one({"id": expense_id}, {"_id": 0})
    return serialize_expense(refreshed)


@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"deleted": True}


@api_router.get("/expenses/week", response_model=WeekSummary)
async def week_summary():
    week_start, week_end = current_week_range()
    cursor = db.expenses.find(
        {"date": {"$gte": week_start, "$lte": week_end}},
        {"_id": 0},
    )
    docs = await cursor.to_list(1000)

    total = 0.0
    by_category = {c: 0.0 for c in ALLOWED_CATEGORIES}
    by_day = {}
    # Init each day of week
    start_dt = datetime.strptime(week_start, "%Y-%m-%d")
    for i in range(7):
        day = (start_dt + timedelta(days=i)).strftime("%Y-%m-%d")
        by_day[day] = 0.0

    for d in docs:
        amt = float(d["amount"])
        total += amt
        if d["category"] in by_category:
            by_category[d["category"]] += amt
        if d["date"] in by_day:
            by_day[d["date"]] += amt

    budget = await get_budget_doc()
    weekly_limit = float(budget.get("weekly_limit", 0.0))
    currency = budget.get("currency", "USD")
    percent_used = (total / weekly_limit * 100.0) if weekly_limit > 0 else 0.0

    return WeekSummary(
        week_start=week_start,
        week_end=week_end,
        total=round(total, 2),
        by_category={k: round(v, 2) for k, v in by_category.items()},
        by_day={k: round(v, 2) for k, v in by_day.items()},
        weekly_limit=weekly_limit,
        currency=currency,
        percent_used=round(percent_used, 1),
        over_limit=(weekly_limit > 0 and total > weekly_limit),
    )


@api_router.get("/budget", response_model=Budget)
async def get_budget():
    doc = await get_budget_doc()
    return Budget(
        weekly_limit=float(doc.get("weekly_limit", 0.0)),
        currency=doc.get("currency", "USD"),
    )


@api_router.put("/budget", response_model=Budget)
async def set_budget(payload: BudgetSet):
    if payload.weekly_limit < 0:
        raise HTTPException(status_code=400, detail="Weekly limit must be non-negative")
    update = {
        "weekly_limit": float(payload.weekly_limit),
        "currency": (payload.currency or "USD"),
    }
    await db.budget.update_one(
        {"_id": "global"},
        {"$set": update},
        upsert=True,
    )
    return Budget(**update)


@api_router.get("/suggestions", response_model=SuggestionsResponse)
async def ai_suggestions():
    """Use LLM (Claude via Emergent key) to give personalized expense saving suggestions."""
    summary = await week_summary()

    # Build a short prompt summarizing weekly spend
    cat_breakdown = ", ".join(
        f"{k}: {summary.currency} {v}" for k, v in summary.by_category.items() if v > 0
    ) or "no spending yet"
    over_text = (
        f"User is OVER weekly budget ({summary.currency} {summary.weekly_limit})."
        if summary.over_limit
        else (
            f"User has used {summary.percent_used}% of their weekly budget "
            f"({summary.currency} {summary.weekly_limit})."
            if summary.weekly_limit > 0
            else "User hasn't set a weekly budget yet."
        )
    )

    prompt = (
        f"You are a friendly personal finance coach. Here is the user's weekly spend "
        f"({summary.week_start} to {summary.week_end}):\n"
        f"Total: {summary.currency} {summary.total}\n"
        f"By category: {cat_breakdown}\n"
        f"{over_text}\n\n"
        "Give 3 concise, specific, and actionable money-saving suggestions tailored "
        "to where they are spending the most. Respond ONLY with valid JSON in this "
        "exact shape:\n"
        '{"summary": "one short empathetic sentence (max 18 words)", '
        '"suggestions": [{"title": "short title (max 6 words)", '
        '"body": "1-2 sentence tip (max 35 words)"}]}'
    )

    fallback = SuggestionsResponse(
        summary=(
            "Track every expense for one week to find your top savings opportunity."
            if summary.total == 0
            else f"You spent {summary.currency} {summary.total} this week — here's where to optimize."
        ),
        suggestions=[
            Suggestion(
                title="Set a weekly budget",
                body="Define a realistic weekly cap so you can spot overspending early and adjust.",
            ),
            Suggestion(
                title="Cap food delivery",
                body="Cook two extra meals at home this week — typical savings: 15-25% of food spend.",
            ),
            Suggestion(
                title="Review subscriptions",
                body="Cancel one streaming or app subscription you haven't used in 30 days.",
            ),
        ],
    )

    if not EMERGENT_LLM_KEY:
        return fallback

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import json

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"expense-suggest-{uuid.uuid4()}",
            system_message=(
                "You are a friendly, concise personal finance coach. "
                "Always reply with strict JSON only — no preamble, no markdown."
            ),
        ).with_model("anthropic", "claude-sonnet-4-6")

        reply = await chat.send_message(UserMessage(text=prompt))
        text = reply if isinstance(reply, str) else str(reply)

        # Try to extract JSON
        start_i = text.find("{")
        end_i = text.rfind("}")
        if start_i == -1 or end_i == -1:
            return fallback
        parsed = json.loads(text[start_i:end_i + 1])
        suggestions = [
            Suggestion(title=s.get("title", "Tip"), body=s.get("body", ""))
            for s in parsed.get("suggestions", [])
        ][:5]
        if not suggestions:
            return fallback
        return SuggestionsResponse(
            summary=parsed.get("summary", fallback.summary),
            suggestions=suggestions,
        )
    except Exception as e:
        logging.exception("LLM suggestions failed: %s", e)
        return fallback


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
