-- NutriLens Database Schema for MySQL

CREATE DATABASE IF NOT EXISTS nutrilens;
USE nutrilens;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Foods table
CREATE TABLE IF NOT EXISTS foods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    description TEXT,
    calories DECIMAL(10,2) NOT NULL,
    protein DECIMAL(10,2) DEFAULT 0,
    carbs DECIMAL(10,2) DEFAULT 0,
    fat DECIMAL(10,2) DEFAULT 0,
    fiber DECIMAL(10,2) DEFAULT 0,
    sugar DECIMAL(10,2) DEFAULT 0,
    sodium DECIMAL(10,2) DEFAULT 0,
    serving_size VARCHAR(100),
    serving_weight_grams DECIMAL(10,2) DEFAULT 100,
    image_url VARCHAR(500),
    barcode VARCHAR(100),
    allergens TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_name (name)
);

-- User food logs table
CREATE TABLE IF NOT EXISTS user_food_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    food_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, logged_at),
    INDEX idx_meal_type (meal_type)
);

-- Insert some sample foods
INSERT INTO foods (name, category, calories, protein, carbs, fat, fiber, sugar, sodium, serving_size, serving_weight_grams, tags) VALUES
('Grilled Chicken Breast', 'protein', 165, 31, 0, 3.6, 0, 0, 74, '100 g', 100, 'high-protein, lean'),
('Brown Rice (cooked)', 'grain', 111, 2.6, 23, 0.9, 1.8, 0.4, 5, '100 g', 100, 'healthy, complex-carb'),
('Salmon Fillet', 'protein', 208, 20, 0, 12, 0, 0, 59, '100 g', 100, 'omega-3, healthy-fat'),
('Broccoli', 'vegetable', 34, 2.8, 7, 0.4, 2.6, 1.5, 33, '100 g', 100, 'fiber, vitamins'),
('Greek Yogurt', 'dairy', 59, 10, 3.6, 0.4, 0, 3.6, 36, '100 g', 100, 'protein, probiotic'),
('Quinoa (cooked)', 'grain', 120, 4.4, 22, 1.9, 2.8, 0.9, 7, '100 g', 100, 'complete-protein, gluten-free'),
('Chicken Eggs', 'protein', 155, 13, 1.1, 11, 0, 1.1, 124, '1 large', 50, 'protein, vitamins'),
('Avocado', 'fruit', 160, 2, 9, 15, 7, 0.7, 7, '100 g', 100, 'healthy-fat, fiber'),
('Sweet Potato', 'vegetable', 86, 1.6, 20, 0.1, 3, 4.2, 54, '100 g', 100, 'complex-carb, vitamin-A'),
('Almonds', 'nuts', 579, 21, 22, 50, 12, 4.4, 1, '100 g', 100, 'healthy-fat, protein');

