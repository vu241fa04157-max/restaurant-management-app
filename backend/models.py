from sqlalchemy import Column, Integer, String, Boolean
from database import Base

class MenuItemDB(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    price = Column(Integer)
    category = Column(String)
    available = Column(Boolean, default=True)

class OrderDB(Base):
    __tablename__ = "orders"

    order_id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String)
    table_number = Column(Integer)
    items_summary = Column(String)
    total_amount = Column(Integer)
    status = Column(String, default="Preparing")
    timestamp = Column(String)

class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="staff")

class RestaurantTableDB(Base):
    __tablename__ = "restaurant_tables"

    id = Column(Integer, primary_key=True, index=True)
    table_number = Column(Integer, unique=True, index=True)
    capacity = Column(Integer, default=4)
    is_active = Column(Boolean, default=True)