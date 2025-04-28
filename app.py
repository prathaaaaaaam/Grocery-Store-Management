from flask import Flask, request, jsonify
import mysql.connector
import bcrypt
from flask_cors import CORS
import datetime
from datetime import timedelta, timezone
import jwt
import re

app = Flask(__name__)
SECRET_KEY = 'a_very_secure_random_key_12345'

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "root@2004",
    "database": "grocery_inventory"
}

CORS(app, supports_credentials=True)

def get_db_connection():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        return None

def close_connection(db):
    if db and db.is_connected():
        db.close()

def auth_required(f):
    def wrapper(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        try:
            token = token.split(" ")[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            email = payload['sub']
            db = get_db_connection()
            cursor = db.cursor(dictionary=True)
            cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
            user = cursor.fetchone()
            if user:
                return f(*args, **kwargs)
            else:
                return jsonify({"error": "Invalid token"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        finally:
            if 'cursor' in locals():
                cursor.close()
            close_connection(db)
    wrapper.__name__ = f.__name__
    return wrapper

@app.route('/api/check-auth')
def check_auth():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "Authorization header missing"}), 401
    token = auth_header.split(" ")[1]
    try:
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return jsonify({"message": "Authenticated"}), 200
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        return jsonify({"error": "Authentication failed"}), 401

@app.route('/api/register', methods=['POST'])
def signup():
    data = request.json
    required_fields = ['fname', 'lname', 'email', 'phone', 'password']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    if not re.match(r"[^@]+@[^@]+\.[^@]+", data['email']):
        return jsonify({"error": "Invalid email format"}), 400
    try:
        db = get_db_connection()
        cursor = db.cursor()
        hashed = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt())
        cursor.execute("""
            INSERT INTO users (fname, lname, email, phone, password_hash)
            VALUES (%s, %s, %s, %s, %s)
        """, (data['fname'], data['lname'], data['email'], data['phone'], hashed))
        db.commit()
        return jsonify({"message": "User created"}), 201
    except mysql.connector.Error as e:
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if 'email' not in data or 'password' not in data:
        return jsonify({"error": "Email and password required"}), 400
    try:
        db = get_db_connection()
        if not db:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s", (data['email'],))
        user = cursor.fetchone()
        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user['password_hash'].encode('utf-8')):
            payload = {
                'exp': datetime.datetime.now(timezone.utc) + timedelta(hours=1),
                'iat': datetime.datetime.now(timezone.utc),
                'sub': user['email']
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
            return jsonify({"token": token}), 200
        else:
            return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        print(f"Error during login: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()

@app.route('/api/logout', methods=['POST'])
@auth_required
def logout():
    return jsonify({"message": "Logged out successfully"}), 200

# Inventory CRUD
@app.route('/api/inventory/add', methods=['POST'])
@auth_required
def add_product():
    data = request.json
    required_fields = ['name', 'category', 'quantity', 'price', 'restock_threshold', 'supplier_id']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        db = get_db_connection()
        if not db:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = db.cursor()
        
        # Insert into product table
        cursor.execute("""
            INSERT INTO product (Name, Category, Price, Supplier_ID, Quantity_In_Stock)
            VALUES (%s, %s, %s, %s, %s)
        """, (data['name'], data['category'], data['price'], data['supplier_id'], data['quantity']))
        
        # Get the last inserted Product_ID
        product_id = cursor.lastrowid
        
        # Insert into inventory table
        cursor.execute("""
            INSERT INTO inventory (Product_ID, Stock_Level, Restock_Threshold)
            VALUES (%s, %s, %s)
        """, (product_id, data['quantity'], data['restock_threshold']))
        
        db.commit()
        return jsonify({"message": "Product added", "product_id": product_id}), 201
    except mysql.connector.Error as e:
        db.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()

@app.route('/api/inventory/<int:product_id>', methods=['GET'])
@auth_required
def get_product(product_id):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT p.*, i.Stock_Level, i.Restock_Threshold
            FROM product p JOIN inventory i ON p.Product_ID = i.Product_ID
            WHERE p.Product_ID = %s
        """, (product_id,))
        product = cursor.fetchone()
        if not product:
            return jsonify({"error": "Product not found"}), 404
        return jsonify(product)
    except mysql.connector.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        close_connection(db)

@app.route('/api/inventory/<int:product_id>', methods=['PUT'])
@auth_required
def update_product(product_id):
    data = request.json
    required_fields = ['name', 'category', 'quantity', 'price', 'restock_threshold', 'supplier_id']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    try:
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("""
            UPDATE product
            SET Name = %s, Category = %s, Price = %s, Quantity_In_Stock = %s, Supplier_ID = %s
            WHERE Product_ID = %s
        """, (data['name'], data['category'], data['price'], data['quantity'], data['supplier_id'], product_id))
        cursor.execute("""
            UPDATE inventory
            SET Stock_Level = %s, Restock_Threshold = %s
            WHERE Product_ID = %s
        """, (data['quantity'], data['restock_threshold'], product_id))
        db.commit()
        return jsonify({"message": "Product updated"}), 200
    except mysql.connector.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        close_connection(db)

@app.route('/api/inventory/<int:product_id>', methods=['DELETE'])
@auth_required
def delete_product(product_id):
    db = get_db_connection()
    try:
        cursor = db.cursor()
        cursor.execute("DELETE FROM inventory WHERE Product_ID = %s", (product_id,))
        cursor.execute("DELETE FROM product WHERE Product_ID = %s", (product_id,))
        db.commit()
        return jsonify({"message": "Product deleted"}), 200
    except mysql.connector.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        close_connection(db)

# Supplier CRUD
@app.route('/api/suppliers/add', methods=['POST'])
@auth_required
def add_supplier():
    data = request.json
    required_fields = ['name', 'contact_number', 'address']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    db = get_db_connection()
    try:
        cursor = db.cursor()
        cursor.execute("""
            INSERT INTO supplier (Name, Contact_Number, Address)
            VALUES (%s, %s, %s)
        """, (data['name'], data['contact_number'], data['address']))
        db.commit()
        return jsonify({"message": "Supplier added", "supplier_id": cursor.lastrowid}), 201
    except mysql.connector.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        close_connection(db)

@app.route('/api/suppliers/<int:supplier_id>', methods=['GET'])
@auth_required
def get_supplier(supplier_id):
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM supplier WHERE Supplier_ID = %s", (supplier_id,))
        supplier = cursor.fetchone()
        if not supplier:
            return jsonify({"error": "Supplier not found"}), 404
        return jsonify(supplier)
    except mysql.connector.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        close_connection(db)

@app.route('/api/suppliers/<int:supplier_id>', methods=['PUT'])
@auth_required
def update_supplier(supplier_id):
    data = request.json
    db = get_db_connection()
    try:
        cursor = db.cursor()
        cursor.execute("""
            UPDATE supplier
            SET Name = %s, Contact_Number = %s, Address = %s
            WHERE Supplier_ID = %s
        """, (data['name'], data['contact_number'], data['address'], supplier_id))
        db.commit()
        return jsonify({"message": "Supplier updated"}), 200
    except mysql.connector.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        close_connection(db)

@app.route('/api/suppliers/<int:supplier_id>', methods=['DELETE'])
@auth_required
def delete_supplier(supplier_id):
    db = get_db_connection()
    try:
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) FROM product WHERE Supplier_ID = %s", (supplier_id,))
        if cursor.fetchone()[0] > 0:
            return jsonify({"error": "Supplier has associated products"}), 400
        cursor.execute("DELETE FROM supplier WHERE Supplier_ID = %s", (supplier_id,))
        db.commit()
        return jsonify({"message": "Supplier deleted"}), 200
    except mysql.connector.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        close_connection(db)

@app.route('/api/suppliers', methods=['GET'])
@auth_required
def get_suppliers():
    db = get_db_connection()
    if not db:
        return jsonify({"error": "Database connection failed"}), 500
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT s.*, COUNT(p.Product_ID) AS Products_Supplied
            FROM supplier s LEFT JOIN product p ON s.Supplier_ID = p.Supplier_ID
            GROUP BY s.Supplier_ID
        """)
        suppliers = cursor.fetchall()
        return jsonify(suppliers)
    except mysql.connector.Error as err:
        return jsonify({"error": "Database query failed", "details": str(err)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        close_connection(db)

@app.route('/api/inventory', methods=['GET'])
@auth_required
def get_inventory():
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT p.Product_ID, p.Name, p.Category, CAST(p.Price AS DECIMAL(10,2)) AS Price,
                   i.Stock_Level, i.Restock_Threshold
            FROM product p JOIN inventory i ON p.Product_ID = i.Product_ID
        """)
        inventory = cursor.fetchall()
        return jsonify(inventory)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        db.close()

@app.route('/api/orders', methods=['GET'])
@auth_required
def get_orders():
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT o.Order_ID, DATE_FORMAT(o.Order_Date, '%Y-%m-%d') AS Order_Date,
                   c.Name AS Customer_Name, CAST(o.Total_Amount AS DECIMAL(10,2)) AS Total_Amount,
                   GROUP_CONCAT(p.Name SEPARATOR ', ') AS Products, o.Status
            FROM orders o
            JOIN customer c ON o.Customer_ID = c.Customer_ID
            JOIN order_details od ON o.Order_ID = od.Order_ID
            JOIN product p ON od.Product_ID = p.Product_ID
            GROUP BY o.Order_ID, o.Order_Date, c.Name, o.Total_Amount, o.Status
            ORDER BY o.Order_Date DESC
        """)
        orders = cursor.fetchall()
        print("Orders fetched:", orders)  # Debugging
        return jsonify(orders)
    except Exception as e:
        print(f"Error fetching orders: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if db:
            db.close()

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
@auth_required
def update_order(order_id):
    data = request.json
    if 'status' not in data:
        return jsonify({"error": "Status is required"}), 400
    print(f"Updating order {order_id} with status: {data['status']}")  # Debugging
    try:
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("""
            UPDATE orders SET Status = %s WHERE Order_ID = %s
        """, (data['status'], order_id))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Order not found"}), 404
        return jsonify({"message": "Order updated"}), 200
    except mysql.connector.Error as e:
        print(f"Database error updating order: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        close_connection(db)

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
@auth_required
def delete_order(order_id):
    print(f"Deleting order {order_id}")  # Debugging
    db = get_db_connection()
    try:
        cursor = db.cursor()
        cursor.execute("DELETE FROM order_details WHERE Order_ID = %s", (order_id,))
        cursor.execute("DELETE FROM orders WHERE Order_ID = %s", (order_id,))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Order not found"}), 404
        return jsonify({"message": "Order deleted"}), 200
    except mysql.connector.Error as e:
        print(f"Database error deleting order: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        close_connection(db)

@app.route('/api/orders/count', methods=['GET'])
@auth_required
def get_order_count():
    try:
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) FROM orders")
        count = cursor.fetchone()[0]
        return jsonify({"count": count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        close_connection(db)

@app.route('/api/total-products', methods=['GET'])
def get_total_products():
    db = get_db_connection()
    try:
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) FROM product")
        count = cursor.fetchone()[0]
        return jsonify({"total_products": count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        close_connection(db)

@app.route('/api/daily-sales', methods=['GET'])
def get_daily_sales():
    db = get_db_connection()
    try:
        cursor = db.cursor()
        cursor.execute("""
            SELECT COALESCE(SUM(Total_Amount), 0) 
            FROM orders WHERE DATE(Order_Date) = CURDATE()
        """)
        sales = cursor.fetchone()[0] or 0
        return jsonify({"daily_sales": float(sales)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        close_connection(db)

def get_low_stock_count(cursor):
    cursor.execute("""
        SELECT COUNT(*) FROM inventory WHERE Stock_Level < Restock_Threshold
    """)
    return cursor.fetchone()[0]

@app.route('/api/metrics', methods=['GET'])
@auth_required
def get_metrics():
    try:
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) FROM product")
        total_products = cursor.fetchone()[0]
        cursor.execute("""
            SELECT CAST(COALESCE(SUM(Total_Amount), 0) AS DECIMAL(10,2)) 
            FROM orders WHERE DATE(CONVERT_TZ(Order_Date, '+00:00', @@session.time_zone)) = CURDATE()
        """)
        daily_sales = float(cursor.fetchone()[0])
        cursor.execute("""
            SELECT DATE_FORMAT(Order_Date, '%Y-%m-%d') AS period, COALESCE(SUM(Total_Amount), 0) AS amount
            FROM orders WHERE Order_Date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE_FORMAT(Order_Date, '%Y-%m-%d')
        """)
        sales_data = [{"period": row[0], "amount": float(row[1])} for row in cursor.fetchall()]
        return jsonify({
            "total_products": total_products,
            "daily_sales": daily_sales,
            "low_stock_count": get_low_stock_count(cursor),
            "sales_data": sales_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if db:
            db.close()

@app.route('/api/low-stock', methods=['GET'])
def get_low_stock():
    db = get_db_connection()
    try:
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT p.*, i.Stock_Level, i.Restock_Threshold 
            FROM inventory i JOIN product p ON i.Product_ID = p.Product_ID
            WHERE i.Stock_Level < i.Restock_Threshold
        """)
        low_stock_products = cursor.fetchall()
        return jsonify(low_stock_products)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        close_connection(db)

@app.route('/api/sales-report', methods=['GET'])
@auth_required
def get_sales_report():
    period = request.args.get('period', '30')
    valid_periods = {'7': 7, '30': 30, '365': 365}
    if period not in valid_periods:
        return jsonify({"error": "Invalid period"}), 400
    days = valid_periods[period]
    db = None
    cursor = None
    try:
        db = get_db_connection()
        if not db:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = db.cursor(dictionary=True)
        date_format = "%Y-%m-%d" if days <= 30 else "%Y-%m"
        cursor.execute("""
            SELECT DATE_FORMAT(Order_Date, %s) AS period_label, COALESCE(SUM(Total_Amount), 0) AS total_sales
            FROM orders WHERE Order_Date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
            GROUP BY DATE_FORMAT(Order_Date, %s)
            ORDER BY MIN(Order_Date)
        """, (date_format, days, date_format))
        data = cursor.fetchall()
        full_data = []
        current_date = datetime.datetime.now() - timedelta(days=days)
        end_date = datetime.datetime.now()
        while current_date <= end_date:
            label = current_date.strftime(date_format)
            found = next((item for item in data if item['period_label'] == label), None)
            full_data.append({
                'period_label': label,
                'total_sales': float(found['total_sales']) if found else 0.0
            })
            current_date += timedelta(days=1)
        return jsonify({"data": full_data})
    except mysql.connector.Error as db_err:
        print(f"Database error: {str(db_err)}")
        return jsonify({"error": "Database query failed", "details": str(db_err)}), 500
    except Exception as e:
        print(f"Server error: {str(e)}")
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()

@app.route('/api/restock', methods=['POST'])
def restock_products():
    db = get_db_connection()
    try:
        cursor = db.cursor()
        cursor.callproc('RestockProducts')
        db.commit()
        return jsonify({"message": "Restocked successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        close_connection(db)

@app.route('/api/user', methods=['GET'])
@auth_required
def get_user():
    try:
        token = request.headers.get('Authorization').split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        email = payload['sub']
        db = get_db_connection()
        if not db:
            return jsonify({"error": "Database connection failed"}), 500
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT fname, lname FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"fname": user['fname'], "lname": user['lname']}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        close_connection(db)

@app.route('/api/reports', methods=['GET'])
@auth_required
def get_reports():
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("""
            SELECT p.Name, p.Category, SUM(od.Quantity) AS Units_Sold,
                   CAST(SUM(od.Subtotal) AS DECIMAL(10,2)) AS Revenue
            FROM order_details od JOIN product p ON od.Product_ID = p.Product_ID
            GROUP BY p.Product_ID, p.Name, p.Category
            ORDER BY Revenue DESC
        """)
        top_products = cursor.fetchall()
        return jsonify(top_products)
    except Exception as e:
        print(f"Report error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        close_connection(db)

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)