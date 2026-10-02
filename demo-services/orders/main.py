from fastapi import FastAPI

app = FastAPI(title="Demo Orders Service")


@app.get("/health")
def health():
    return {"status": "ok", "service": "orders-service"}


@app.get("/api/orders")
def get_orders():
    return [
        {"order_id": "ord_101", "total_usd": 149.99, "status": "completed"},
        {"order_id": "ord_102", "total_usd": 29.50, "status": "pending"},
    ]
