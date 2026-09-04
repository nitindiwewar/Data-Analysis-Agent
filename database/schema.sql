-- ==========================================================
-- Database Schema for Data Analyst AI Agent with PS-SQL
-- Dialect: MySQL 8.0+
-- Database: retail_sales_db
-- ==========================================================

CREATE DATABASE IF NOT EXISTS retail_sales_db;
USE retail_sales_db;

-- 1. Regions Dimension Table
CREATE TABLE IF NOT EXISTS regions (
    region_id INT PRIMARY KEY AUTO_INCREMENT,
    region_name VARCHAR(100) NOT NULL,
    country VARCHAR(80) NOT NULL,
    currency_code VARCHAR(10) NOT NULL DEFAULT 'INR',
    regional_manager VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Products Dimension Table
CREATE TABLE IF NOT EXISTS products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Customers Dimension Table
CREATE TABLE IF NOT EXISTS customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(150) NOT NULL,
    customer_type VARCHAR(50) NOT NULL DEFAULT 'Retail',
    email VARCHAR(120) NOT NULL,
    city VARCHAR(80) NOT NULL,
    region_id INT NOT NULL,
    signup_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customer_region FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Sales Fact Table
CREATE TABLE IF NOT EXISTS sales (
    sale_id INT PRIMARY KEY AUTO_INCREMENT,
    sale_date DATE NOT NULL,
    product_id INT NOT NULL,
    region_id INT NOT NULL,
    customer_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    revenue DECIMAL(14,2) NOT NULL,
    cost DECIMAL(14,2) NOT NULL,
    profit DECIMAL(14,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
    status VARCHAR(40) NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sale_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_region FOREIGN KEY (region_id) REFERENCES regions(region_id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for performance & analytical querying
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_product ON sales(product_id);
CREATE INDEX idx_sales_region ON sales(region_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_products_category ON products(category);
