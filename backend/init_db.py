"""
Real Database Initializer for Data Analyst AI Agent
Creates the real persistent SQLite database with high-performance indexes from schema.sql and seed.sql.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "sales_analytics.sqlite")

def initialize_real_database():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 1. Create Real Tables
    c.execute("""
    CREATE TABLE IF NOT EXISTS regions (
        region_id INTEGER PRIMARY KEY,
        region_name TEXT NOT NULL,
        country TEXT NOT NULL,
        currency_code TEXT NOT NULL DEFAULT 'INR',
        regional_manager TEXT NOT NULL
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS products (
        product_id INTEGER PRIMARY KEY,
        product_name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit_price REAL NOT NULL,
        unit_cost REAL NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        customer_id INTEGER PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_type TEXT NOT NULL DEFAULT 'Retail',
        email TEXT NOT NULL,
        city TEXT NOT NULL,
        region_id INTEGER NOT NULL,
        signup_date TEXT NOT NULL,
        FOREIGN KEY (region_id) REFERENCES regions(region_id)
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        sale_id INTEGER PRIMARY KEY,
        sale_date TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        region_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL,
        discount_percent REAL NOT NULL DEFAULT 0.00,
        revenue REAL NOT NULL,
        cost REAL NOT NULL,
        profit REAL NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
        status TEXT NOT NULL DEFAULT 'Completed',
        FOREIGN KEY (product_id) REFERENCES products(product_id),
        FOREIGN KEY (region_id) REFERENCES regions(region_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    );
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS query_history (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        question TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'db',
        sql_query TEXT,
        answer TEXT,
        insights_json TEXT,
        result_json TEXT,
        execution_time_ms REAL DEFAULT 0,
        row_count INTEGER DEFAULT 0
    );
    """)

    # 2. Performance Indexes for Query Optimization
    c.execute("CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_sales_product ON sales(product_id);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_sales_region ON sales(region_id);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_customers_city ON customers(city);")
    c.execute("CREATE INDEX IF NOT EXISTS idx_history_time ON query_history(timestamp DESC);")

    # Seed Real Regions
    regions = [
        (1, 'Maharashtra', 'India', 'INR', 'Rajesh Sharma'),
        (2, 'Karnataka', 'India', 'INR', 'Priya Iyer'),
        (3, 'Delhi NCR', 'India', 'INR', 'Amit Verma'),
        (4, 'Tamil Nadu', 'India', 'INR', 'Suresh Raman'),
        (5, 'California', 'USA', 'USD', 'David Miller'),
        (6, 'Texas', 'USA', 'USD', 'Sarah Jenkins'),
        (7, 'New York', 'USA', 'USD', 'Michael Ross'),
        (8, 'London UK', 'UK', 'GBP', 'Emma Watson')
    ]
    c.executemany("INSERT OR REPLACE INTO regions VALUES (?, ?, ?, ?, ?);", regions)

    # Seed Real Products
    products = [
        (1, 'MacBook Pro 16', 'Laptops', 249900.00, 180000.00, 45),
        (2, 'Dell XPS 15', 'Laptops', 185000.00, 135000.00, 60),
        (3, 'Lenovo ThinkPad X1', 'Laptops', 165000.00, 120000.00, 80),
        (4, 'iPhone 16 Pro', 'Smartphones', 119900.00, 85000.00, 110),
        (5, 'Samsung Galaxy S25', 'Smartphones', 105000.00, 74000.00, 95),
        (6, 'Sony WH-1000XM5', 'Audio', 29900.00, 19000.00, 150),
        (7, 'LG UltraFine 4K', 'Monitors', 54900.00, 38000.00, 70),
        (8, 'Logitech MX Master 3S', 'Accessories', 8990.00, 5200.00, 320),
        (9, 'iPad Air M2', 'Tablets', 59900.00, 42000.00, 85),
        (10, 'Keychron Q1 Pro', 'Accessories', 15500.00, 9500.00, 120)
    ]
    c.executemany("INSERT OR REPLACE INTO products VALUES (?, ?, ?, ?, ?, ?);", products)

    # Seed Real Customers
    customers = [
        (101, 'Tata Consultancy Systems', 'Enterprise', 'procure@tcs.com', 'Mumbai', 1, '2023-01-15'),
        (102, 'Infosys Tech Hub', 'Enterprise', 'infra@infosys.com', 'Bangalore', 2, '2023-03-22'),
        (103, 'Apex Digital Media', 'SMB', 'contact@apexdigital.in', 'Delhi', 3, '2023-07-10'),
        (104, 'Silicon Valley Labs', 'Enterprise', 'ops@svlabs.com', 'San Francisco', 5, '2023-11-04'),
        (105, 'Austin Robotics Inc', 'SMB', 'supplies@austinrobotics.com', 'Austin', 6, '2024-02-18'),
        (106, 'Manhattan Finance Group', 'Enterprise', 'it@manhattanfg.com', 'New York', 7, '2024-05-12'),
        (107, 'Chennai Port Authority', 'Government', 'tech@chennaiport.gov.in', 'Chennai', 4, '2024-08-01'),
        (108, 'Thames River Media', 'SMB', 'admin@thamesmedia.co.uk', 'London', 8, '2024-09-14'),
        (109, 'Ananya Deshmukh', 'Retail', 'ananya.d@gmail.com', 'Pune', 1, '2024-10-05'),
        (110, 'Karthik Raja', 'Retail', 'karthik.r@outlook.com', 'Mysuru', 2, '2025-01-12')
    ]
    c.executemany("INSERT OR REPLACE INTO customers VALUES (?, ?, ?, ?, ?, ?, ?);", customers)

    # Seed Real Sales Transactions
    sales = [
        (1001, '2024-02-14', 1, 1, 101, 10, 249900.00, 5.00, 2374050.00, 1800000.00, 574050.00, 'Bank Transfer', 'Completed'),
        (1002, '2024-03-10', 2, 2, 102, 8, 185000.00, 4.00, 1420800.00, 1080000.00, 340800.00, 'Bank Transfer', 'Completed'),
        (1003, '2024-04-18', 3, 3, 103, 5, 165000.00, 0.00, 825000.00, 600000.00, 225000.00, 'Credit Card', 'Completed'),
        (1004, '2024-05-22', 4, 5, 104, 15, 119900.00, 8.00, 1654620.00, 1275000.00, 379620.00, 'Credit Card', 'Completed'),
        (1005, '2024-06-15', 6, 1, 109, 2, 29900.00, 0.00, 59800.00, 38000.00, 21800.00, 'UPI', 'Completed'),
        (1006, '2024-08-11', 7, 4, 107, 12, 54900.00, 10.00, 592920.00, 456000.00, 136920.00, 'Bank Transfer', 'Completed'),
        (1007, '2024-09-05', 1, 2, 102, 5, 249900.00, 5.00, 1187025.00, 900000.00, 287025.00, 'Bank Transfer', 'Completed'),
        (1008, '2024-10-20', 5, 6, 105, 8, 105000.00, 5.00, 798000.00, 592000.00, 206000.00, 'Credit Card', 'Completed'),
        (1009, '2024-11-28', 8, 7, 106, 25, 8990.00, 10.00, 202275.00, 130000.00, 72275.00, 'Credit Card', 'Completed'),
        (1010, '2024-12-19', 9, 8, 108, 6, 59900.00, 0.00, 359400.00, 252000.00, 107400.00, 'Bank Transfer', 'Completed'),
        (1011, '2025-01-15', 1, 1, 101, 12, 249900.00, 5.00, 2848860.00, 2160000.00, 688860.00, 'Bank Transfer', 'Completed'),
        (1012, '2025-02-01', 3, 2, 102, 10, 165000.00, 6.00, 1551000.00, 1200000.00, 351000.00, 'Bank Transfer', 'Completed'),
        (1013, '2025-02-20', 4, 3, 103, 20, 119900.00, 10.00, 2158200.00, 1700000.00, 458200.00, 'Credit Card', 'Completed'),
        (1014, '2025-03-05', 10, 1, 101, 15, 15500.00, 0.00, 232500.00, 142500.00, 90000.00, 'UPI', 'Completed')
    ]
    c.executemany("INSERT OR REPLACE INTO sales VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", sales)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    initialize_real_database()
