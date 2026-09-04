-- ==========================================================
-- Realistic Seed Dataset for Data Analyst AI Agent
-- ==========================================================

USE retail_sales_db;

-- 1. Populate Regions
INSERT INTO regions (region_id, region_name, country, currency_code, regional_manager) VALUES
(1, 'Maharashtra', 'India', 'INR', 'Rajesh Sharma'),
(2, 'Karnataka', 'India', 'INR', 'Priya Iyer'),
(3, 'Delhi NCR', 'India', 'INR', 'Amit Verma'),
(4, 'Tamil Nadu', 'India', 'INR', 'Suresh Raman'),
(5, 'California', 'USA', 'USD', 'David Miller'),
(6, 'Texas', 'USA', 'USD', 'Sarah Jenkins'),
(7, 'New York', 'USA', 'USD', 'Michael Ross'),
(8, 'London UK', 'UK', 'GBP', 'Emma Watson')
ON DUPLICATE KEY UPDATE region_name=VALUES(region_name);

-- 2. Populate Products
INSERT INTO products (product_id, product_name, category, unit_price, unit_cost, stock_quantity) VALUES
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
ON DUPLICATE KEY UPDATE product_name=VALUES(product_name);

-- 3. Populate Customers
INSERT INTO customers (customer_id, customer_name, customer_type, email, city, region_id, signup_date) VALUES
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
ON DUPLICATE KEY UPDATE customer_name=VALUES(customer_name);

-- 4. Populate Sales Transactions
INSERT INTO sales (sale_id, sale_date, product_id, region_id, customer_id, quantity, unit_price, discount_percent, revenue, cost, profit, payment_method, status) VALUES
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
(1012, '2025-01-28', 2, 1, 109, 1, 185000.00, 0.00, 185000.00, 135000.00, 50000.00, 'UPI', 'Completed'),
(1013, '2025-02-10', 3, 2, 102, 15, 165000.00, 6.00, 2326500.00, 1800000.00, 526500.00, 'Bank Transfer', 'Completed'),
(1014, '2025-02-25', 4, 3, 103, 10, 119900.00, 5.00, 1139050.00, 850000.00, 289050.00, 'Credit Card', 'Completed'),
(1015, '2025-03-12', 5, 5, 104, 20, 105000.00, 7.00, 1953000.00, 1480000.00, 473000.00, 'Bank Transfer', 'Completed'),
(1016, '2025-03-24', 6, 4, 107, 20, 29900.00, 10.00, 538200.00, 380000.00, 158200.00, 'Bank Transfer', 'Completed'),
(1017, '2025-04-05', 7, 6, 105, 10, 54900.00, 5.00, 521550.00, 380000.00, 141550.00, 'Credit Card', 'Completed'),
(1018, '2025-04-18', 8, 1, 101, 50, 8990.00, 12.00, 395560.00, 260000.00, 135560.00, 'Bank Transfer', 'Completed'),
(1019, '2025-05-09', 1, 5, 104, 8, 249900.00, 4.00, 1919232.00, 1440000.00, 479232.00, 'Bank Transfer', 'Completed'),
(1020, '2025-05-27', 2, 2, 110, 2, 185000.00, 0.00, 370000.00, 270000.00, 100000.00, 'UPI', 'Completed'),
(1021, '2025-06-14', 3, 1, 101, 20, 165000.00, 8.00, 3036000.00, 2400000.00, 636000.00, 'Bank Transfer', 'Completed'),
(1022, '2025-06-30', 9, 3, 103, 15, 59900.00, 5.00, 853575.00, 630000.00, 223575.00, 'Credit Card', 'Completed'),
(1023, '2025-07-16', 10, 2, 102, 30, 15500.00, 10.00, 418500.00, 285000.00, 133500.00, 'Bank Transfer', 'Completed'),
(1024, '2025-07-28', 1, 7, 106, 14, 249900.00, 5.00, 3323670.00, 2520000.00, 803670.00, 'Bank Transfer', 'Completed'),
(1025, '2025-08-15', 4, 1, 101, 25, 119900.00, 6.00, 2817650.00, 2125000.00, 692650.00, 'Bank Transfer', 'Completed'),
(1026, '2025-09-02', 2, 8, 108, 10, 185000.00, 5.00, 1757500.00, 1350000.00, 407500.00, 'Bank Transfer', 'Completed'),
(1027, '2025-09-20', 6, 5, 104, 40, 29900.00, 8.00, 1100320.00, 760000.00, 340320.00, 'Credit Card', 'Completed'),
(1028, '2025-10-10', 1, 1, 109, 2, 249900.00, 0.00, 499800.00, 360000.00, 139800.00, 'Credit Card', 'Completed'),
(1029, '2025-10-25', 7, 2, 102, 15, 54900.00, 6.00, 774090.00, 570000.00, 204090.00, 'Bank Transfer', 'Completed'),
(1030, '2025-11-12', 5, 6, 105, 18, 105000.00, 5.00, 1795500.00, 1332000.00, 463500.00, 'Bank Transfer', 'Completed'),
(1031, '2025-11-29', 10, 1, 101, 40, 15500.00, 10.00, 558000.00, 380000.00, 178000.00, 'Bank Transfer', 'Completed'),
(1032, '2025-12-15', 1, 3, 103, 6, 249900.00, 4.00, 1439424.00, 1080000.00, 359424.00, 'Credit Card', 'Completed'),
(1033, '2025-12-28', 3, 4, 107, 8, 165000.00, 5.00, 1254000.00, 960000.00, 294000.00, 'Bank Transfer', 'Completed')
ON DUPLICATE KEY UPDATE revenue=VALUES(revenue);
