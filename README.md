# 🛒 Grocery Store Management System

> A full-stack web application for managing a grocery store — handling inventory, orders, suppliers, sales reports, and real-time metrics through a secure admin dashboard.

**Made by [Pratham Sorte](https://github.com/prathaaaaaaam)**

---

## 📌 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Installation & Setup](#-installation--setup)
- [Pages & Screens](#-pages--screens)
- [Contributing](#-contributing)
- [Author](#-author)
- [License](#-license)

---

## 📖 About

**Grocery Store Management System** is a complete web-based solution for managing the day-to-day operations of a grocery store. It features a secure admin dashboard where store managers can track inventory, manage suppliers, monitor orders, view sales analytics, and get low-stock alerts — all from a clean, browser-based interface.

The backend is a **Flask REST API** connected to a **MySQL** database, secured with **JWT authentication** and **bcrypt** password hashing. The frontend is built with vanilla **HTML, CSS, and JavaScript** pages that consume the REST API.

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure login, signup, and logout with token-based sessions
- 📦 **Inventory Management** — Add, update, delete, and view all products with stock levels
- ⚠️ **Low Stock Alerts** — Auto-detects products below restock threshold
- 🔄 **Restock Trigger** — One-click restock via stored procedure
- 🏭 **Supplier Management** — Full CRUD for suppliers with product count tracking
- 🧾 **Order Management** — View, update status, and delete orders with product breakdown
- 📊 **Sales Reports** — Revenue and units sold per product; top performers ranked
- 📈 **Admin Dashboard Metrics** — Daily sales, total products, low stock count, 7-day sales chart
- 🛡️ **Protected Routes** — All sensitive endpoints require a valid JWT token
- 🌐 **CORS Enabled** — Frontend and backend can run on different ports

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python, Flask, Flask-CORS |
| **Database** | MySQL (mysql-connector-python) |
| **Auth** | JWT (PyJWT), bcrypt |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **API Style** | RESTful |

**Language breakdown:** JavaScript 38% · Python 24% · HTML 24% · CSS 14%

---

## 📁 Project Structure

```
Grocery-Store-Management/
│
├── app.py                    # Flask REST API (640 lines) — all routes & logic
├── grocery_inventory.sql     # MySQL database schema & seed data
│
├── Landing.html              # Public landing / home page
├── login.html                # Login page
├── signup.html               # Registration page
├── about.html                # About page
│
├── admin_dashboard.html      # Admin dashboard with metrics & charts
├── inventory.html            # Inventory management page
├── orders.html               # Orders management page
├── suppliers.html            # Supplier management page
├── reports.html              # Sales reports page
│
├── admin.js                  # Admin dashboard JS logic
├── login.js                  # Login form handling & JWT storage
├── signup.js                 # Registration form handling
├── logout.js                 # Token clearing & session logout
│
├── styles.css                # Global stylesheet
├── logo.png                  # Store logo
├── landing.jpg               # Landing page hero image
│
├── Mini Project              # Project documentation / report
└── README.md
```

---

## 🗄️ Database Schema

The MySQL database (`grocery_inventory`) contains the following core tables:

| Table | Description |
|---|---|
| `users` | Admin accounts with hashed passwords |
| `product` | Product catalogue with name, category, price, supplier |
| `inventory` | Stock levels and restock thresholds per product |
| `supplier` | Supplier details (name, contact, address) |
| `customer` | Customer information linked to orders |
| `orders` | Order header — date, customer, total, status |
| `order_details` | Line items per order — product, quantity, subtotal |

**Stored Procedure:** `RestockProducts` — called via `/api/restock` to automatically top up low-stock items.

To set up the database:

```bash
mysql -u root -p < grocery_inventory.sql
```

---

## 🔌 API Reference

All protected routes require the header:
```
Authorization: Bearer <your_jwt_token>
```

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/register` | ❌ | Register a new admin user |
| `POST` | `/api/login` | ❌ | Login and receive JWT token |
| `POST` | `/api/logout` | ✅ | Logout (invalidate session) |
| `GET` | `/api/check-auth` | ✅ | Validate token |
| `GET` | `/api/user` | ✅ | Get logged-in user's name |

### Inventory

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/inventory` | ✅ | List all products with stock info |
| `POST` | `/api/inventory/add` | ✅ | Add a new product |
| `GET` | `/api/inventory/<id>` | ✅ | Get a single product |
| `PUT` | `/api/inventory/<id>` | ✅ | Update a product |
| `DELETE` | `/api/inventory/<id>` | ✅ | Delete a product |

### Suppliers

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/suppliers` | ✅ | List all suppliers with product count |
| `POST` | `/api/suppliers/add` | ✅ | Add a new supplier |
| `GET` | `/api/suppliers/<id>` | ✅ | Get a single supplier |
| `PUT` | `/api/suppliers/<id>` | ✅ | Update a supplier |
| `DELETE` | `/api/suppliers/<id>` | ✅ | Delete supplier (blocks if has products) |

### Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/orders` | ✅ | List all orders with product names |
| `PUT` | `/api/orders/<id>` | ✅ | Update order status |
| `DELETE` | `/api/orders/<id>` | ✅ | Delete an order |
| `GET` | `/api/orders/count` | ✅ | Get total order count |

### Metrics & Reports

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/metrics` | ✅ | Dashboard metrics (sales, stock, chart data) |
| `GET` | `/api/sales-report?period=7\|30\|365` | ✅ | Sales data over a period |
| `GET` | `/api/reports` | ✅ | Top products by revenue & units sold |
| `GET` | `/api/low-stock` | ❌ | Products below restock threshold |
| `GET` | `/api/daily-sales` | ❌ | Today's total sales |
| `GET` | `/api/total-products` | ❌ | Total product count |
| `POST` | `/api/restock` | ❌ | Trigger restock stored procedure |

---

## ⚙️ Installation & Setup

### Prerequisites

- Python 3.8+
- MySQL Server running locally
- A MySQL user with access to create databases

### 1. Clone the repository

```bash
git clone https://github.com/prathaaaaaaam/Grocery-Store-Management.git
cd Grocery-Store-Management
```

### 2. Install Python dependencies

```bash
pip install flask flask-cors mysql-connector-python bcrypt PyJWT
```

### 3. Set up the database

```bash
mysql -u root -p < grocery_inventory.sql
```

### 4. Configure database credentials

Open `app.py` and update the `DB_CONFIG` block with your MySQL credentials:

```python
DB_CONFIG = {
    "host": "localhost",
    "user": "your_mysql_user",
    "password": "your_mysql_password",
    "database": "grocery_inventory"
}
```

> ⚠️ **Never commit real passwords.** Consider using environment variables or a `.env` file for production.

### 5. Run the Flask server

```bash
python app.py
```

The API will be available at `http://localhost:5000`

### 6. Open the frontend

Simply open `Landing.html` in your browser, or serve the files with a local server:

```bash
# Using Python's built-in server
python -m http.server 8080
```

Then visit `http://localhost:8080/Landing.html`

---

## 🖥️ Pages & Screens

| Page | File | Description |
|---|---|---|
| Landing | `Landing.html` | Public home page with store intro |
| Login | `login.html` | Admin login with JWT token handling |
| Signup | `signup.html` | New admin registration |
| About | `about.html` | About the store/project |
| Dashboard | `admin_dashboard.html` | Metrics overview, daily sales, low stock count, chart |
| Inventory | `inventory.html` | Full product CRUD with stock & threshold |
| Orders | `orders.html` | View, update, and delete customer orders |
| Suppliers | `suppliers.html` | Supplier CRUD with associated product count |
| Reports | `reports.html` | Sales report with period filter, top products table |

---

## 🤝 Contributing

Pull requests are welcome! To contribute:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Commit (`git commit -m 'Add your feature'`)
5. Push (`git push origin feature/your-feature`)
6. Open a Pull Request

---

## 👨‍💻 Author

**Pratham Sorte**
- GitHub: [@prathaaaaaaam](https://github.com/prathaaaaaaam)

---

## 📄 License

This project is open source. Feel free to use, modify, and distribute it.

---

## 🙌 Acknowledgements

- [Flask](https://flask.palletsprojects.com/) — Python web framework
- [MySQL](https://www.mysql.com/) — Relational database
- [PyJWT](https://pyjwt.readthedocs.io/) — JWT implementation for Python
- [bcrypt](https://pypi.org/project/bcrypt/) — Password hashing
- [Flask-CORS](https://flask-cors.readthedocs.io/) — Cross-origin resource sharing
