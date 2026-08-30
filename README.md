# 🍕 Bistro & Bites - Full-Stack Restaurant Management System

A full-stack restaurant ordering and kitchen workflow management web application built with **React (Vite)**, **FastAPI**, and **SQLite**.

---

## 🌐 Live Demos

* **Frontend App:** [restaurant-management-app-beta.vercel.app](https://restaurant-management-app-beta.vercel.app)
* **Backend API (Docs):** [restaurant-management-app-po7q.onrender.com/docs](https://restaurant-management-app-po7q.onrender.com/docs)

---

## ✨ Features

* **Customer Ordering:** Dynamic menu exploration, category filtering, live search, reactive cart management, and table selection.
* **Live Kitchen Board:** Real-time ticket updates with order status transitions (`Preparing` → `Ready` → `Served`) and order dismissal.
* **Admin Dashboard:** Dynamic menu item catalog management (add/delete dishes) and restaurant table management with custom seating capacities.
* **Authentication & Security:** Role-based access control (Admin / Staff) with password hashing and manager passcode verification (`RESTO2026`).
* **Modern UI:** Glassmorphism card overlays, responsive layouts, and modern typography.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, Vite, Modern CSS & Glassmorphism
* **Backend:** FastAPI, Python 3, Pydantic, Uvicorn
* **Database & ORM:** SQLite, SQLAlchemy
* **Deployment:** Vercel (Frontend), Render (Backend)

---

## 🚀 Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload