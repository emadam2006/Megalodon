from fastapi import FastAPI

app = FastAPI(title="Demo Products Service")


@app.get("/health")
def health():
    return {"status": "ok", "service": "products-service"}


@app.get("/api/products")
def get_products():
    return [
        {"product_id": "prod_1", "name": "Secure Gateway License", "price": 499.0},
        {"product_id": "prod_2", "name": "Network Discovery Probe", "price": 199.0},
    ]
