-- Initial seed for Thika and Nairobi zones
INSERT INTO delivery_zones (name, delivery_window, delivery_fee, allows_cake, allows_pizza, scheduled_only)
VALUES 
('Thika Town (Pickup)', 'Ready in 30-60 mins', 0.00, true, true, false),
('Thika Town Delivery', '1-2 hours', 150.00, true, true, false),
('Nairobi CBD Delivery', 'Scheduled Only', 500.00, true, true, true),
('Nairobi Suburbs Delivery', 'Scheduled Only', 700.00, true, true, true)
ON CONFLICT (name) DO NOTHING;
