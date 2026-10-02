from fastapi import FastAPI

app = FastAPI(title="Demo Users Service")


@app.get("/health")
def health():
    return {"status": "ok", "service": "users-service"}


@app.get("/api/users")
def get_users():
    return [
        {"id": 1, "username": "alice", "role": "engineer"},
        {"id": 2, "username": "bob", "role": "analyst"},
        {"id": 3, "username": "charlie", "role": "devops"},
    ]


@app.post("/api/login")
def login(creds: dict):
    if creds.get("username") == "admin" and creds.get("password") == "pass":
        return {"token": "demo_jwt_token_12345"}
    return {"error": "Invalid credentials"}, 401
