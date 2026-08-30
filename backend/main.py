from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
import time
import hashlib

from database import engine, Base, get_db
from models import MenuItemDB, OrderDB, UserDB, RestaurantTableDB

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Restaurant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STAFF_PASSCODE = "RESTO2026"

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

# Seed initial tables, menu, and admin
def seed_data():
    db = next(get_db())
    if db.query(MenuItemDB).count() == 0:
        sample_items = [
            MenuItemDB(name="Classic Margherita Pizza", description="Fresh tomato sauce, mozzarella, and basil", price=299, category="Pizza"),
            MenuItemDB(name="Paneer Tikka Burger", description="Crispy paneer patty with mint mayo and fresh lettuce", price=179, category="Burgers"),
            MenuItemDB(name="Cold Brew Coffee", description="Slow-steeped artisan coffee over ice", price=149, category="Beverages"),
            MenuItemDB(name="Garlic Breadsticks", description="Warm breadsticks topped with melted garlic butter", price=129, category="Sides"),
        ]
        db.add_all(sample_items)
        db.commit()
        
    admin_exists = db.query(UserDB).filter(UserDB.username == "admin").first()
    if not admin_exists:
        admin_user = UserDB(
            username="admin",
            hashed_password=hash_password("admin123"),
            role="admin"
        )
        db.add(admin_user)
        db.commit()

    if db.query(RestaurantTableDB).count() == 0:
        default_tables = [
            RestaurantTableDB(table_number=1, capacity=2),
            RestaurantTableDB(table_number=2, capacity=4),
            RestaurantTableDB(table_number=3, capacity=4),
            RestaurantTableDB(table_number=4, capacity=6),
            RestaurantTableDB(table_number=5, capacity=8),
        ]
        db.add_all(default_tables)
        db.commit()

seed_data()

# Schemas
class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str
    secret_code: str

class CartItem(BaseModel):
    id: int
    name: str
    price: int
    quantity: int

class OrderRequest(BaseModel):
    customer_name: str
    table_number: int
    items: List[CartItem]
    total_amount: int

class StatusUpdate(BaseModel):
    status: str

class MenuItemCreate(BaseModel):
    name: str
    description: str
    price: int
    category: str

class TableCreate(BaseModel):
    table_number: int
    capacity: int

# Auth Routes
@app.post("/api/auth/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    if user.secret_code != STAFF_PASSCODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Secret Passcode! Only authorized staff can register."
        )

    db_user = db.query(UserDB).filter(UserDB.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    new_user = UserDB(
        username=user.username,
        hashed_password=hash_password(user.password),
        role="staff"
    )
    db.add(new_user)
    db.commit()
    return {"message": "Staff account created successfully! Please log in."}

@app.post("/api/auth/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(UserDB).filter(UserDB.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    
    token = f"token_{db_user.username}_{int(time.time())}"
    return {
        "access_token": token,
        "username": db_user.username,
        "role": db_user.role
    }

# Table Routes
@app.get("/api/tables")
def get_tables(db: Session = Depends(get_db)):
    return db.query(RestaurantTableDB).order_by(RestaurantTableDB.table_number.asc()).all()

@app.post("/api/tables")
def create_table(table: TableCreate, db: Session = Depends(get_db)):
    existing = db.query(RestaurantTableDB).filter(RestaurantTableDB.table_number == table.table_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Table number already exists")
    
    new_table = RestaurantTableDB(
        table_number=table.table_number,
        capacity=table.capacity
    )
    db.add(new_table)
    db.commit()
    db.refresh(new_table)
    return new_table

@app.delete("/api/tables/{table_id}")
def delete_table(table_id: int, db: Session = Depends(get_db)):
    t = db.query(RestaurantTableDB).filter(RestaurantTableDB.id == table_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Table not found")
    db.delete(t)
    db.commit()
    return {"message": "Table deleted successfully"}

# Menu Routes
@app.get("/api/menu")
def get_menu(db: Session = Depends(get_db)):
    return db.query(MenuItemDB).all()

@app.post("/api/menu")
def create_menu_item(item: MenuItemCreate, db: Session = Depends(get_db)):
    new_item = MenuItemDB(
        name=item.name,
        description=item.description,
        price=item.price,
        category=item.category
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@app.delete("/api/menu/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItemDB).filter(MenuItemDB.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"message": "Item deleted successfully"}

# Order Routes
@app.get("/api/orders")
def get_orders(db: Session = Depends(get_db)):
    orders = db.query(OrderDB).all()
    result = []
    for o in orders:
        formatted_items = []
        for line in o.items_summary.split(";"):
            if line:
                parts = line.split(":")
                if len(parts) == 2:
                    formatted_items.append({"name": parts[0], "quantity": int(parts[1])})
        result.append({
            "order_id": o.order_id,
            "customer_name": o.customer_name,
            "table_number": o.table_number,
            "items": formatted_items,
            "total_amount": o.total_amount,
            "status": o.status,
            "timestamp": o.timestamp
        })
    return result

@app.post("/api/orders")
def place_order(order: OrderRequest, db: Session = Depends(get_db)):
    summary = ";".join([f"{item.name}:{item.quantity}" for item in order.items])
    new_order = OrderDB(
        customer_name=order.customer_name,
        table_number=order.table_number,
        items_summary=summary,
        total_amount=order.total_amount,
        status="Preparing",
        timestamp=time.strftime("%H:%M:%S")
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return {
        "message": "Order saved to database!",
        "order": {
            "order_id": new_order.order_id,
            "customer_name": new_order.customer_name,
            "status": new_order.status
        }
    }

@app.patch("/api/orders/{order_id}/status")
def update_order_status(order_id: int, update: StatusUpdate, db: Session = Depends(get_db)):
    order = db.query(OrderDB).filter(OrderDB.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = update.status
    db.commit()
    return {"message": "Status updated successfully"}

# Delete Order Route (Admin / Staff cleanup)
@app.delete("/api/orders/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(OrderDB).filter(OrderDB.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    db.delete(order)
    db.commit()
    return {"message": "Order deleted successfully"}