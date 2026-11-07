/**
 * Restaurant Reservation Management System
 * Backend Server - Express & MySQL
 * Database: reservation
 */

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection Pool Configuration
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'tejeswar',
  database: 'reservation',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true // Return date and time as clean strings (YYYY-MM-DD, HH:MM:SS)
});

// Promise wrapper for pool
const promisePool = pool.promise();

// Test MySQL Connection on Startup
promisePool.getConnection()
  .then((conn) => {
    console.log('✅ Connected successfully to MySQL database: reservation');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
  });

// ========================================================
// 1. DASHBOARD API
// ========================================================
app.get('/dashboard', async (req, res) => {
  try {
    // Total Customers (excluding empty/null rows if any)
    const [[{ total_customers }]] = await promisePool.query(
      'SELECT COUNT(*) AS total_customers FROM customers WHERE name IS NOT NULL AND TRIM(name) != ""'
    );

    // Total Tables
    const [[{ total_tables }]] = await promisePool.query(
      'SELECT COUNT(*) AS total_tables FROM tables'
    );

    // Reservation Counts by Status
    const [[{ total_reservations }]] = await promisePool.query(
      'SELECT COUNT(*) AS total_reservations FROM reservations'
    );

    const [[{ pending_reservations }]] = await promisePool.query(
      "SELECT COUNT(*) AS pending_reservations FROM reservations WHERE LOWER(status) = 'pending'"
    );

    const [[{ confirmed_reservations }]] = await promisePool.query(
      "SELECT COUNT(*) AS confirmed_reservations FROM reservations WHERE LOWER(status) = 'confirmed'"
    );

    const [[{ cancelled_reservations }]] = await promisePool.query(
      "SELECT COUNT(*) AS cancelled_reservations FROM reservations WHERE LOWER(status) = 'cancelled'"
    );

    // Available Tables calculation (tables not currently booked today with active reservation)
    const todayStr = new Date().toISOString().split('T')[0];
    const [[{ booked_tables_today }]] = await promisePool.query(
      `SELECT COUNT(DISTINCT table_id) AS booked_tables_today 
       FROM reservations 
       WHERE reservation_date = ? AND LOWER(status) != 'cancelled'`,
      [todayStr]
    );

    const available_tables = Math.max(0, total_tables - (booked_tables_today || 0));

    // Recent 5 Reservations with Customer and Table info
    const [recent_reservations] = await promisePool.query(
      `SELECT 
        r.reservation_id,
        r.reservation_id AS reservations_id,
        r.customer_id,
        COALESCE(c.name, CONCAT('Customer #', r.customer_id)) AS customer_name,
        COALESCE(c.phone, '') AS customer_phone,
        r.table_id,
        t.table_number,
        t.seating_capacity,
        DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservation_date,
        TIME_FORMAT(r.reservation_time, '%H:%i') AS reservation_time,
        r.guests,
        r.status
      FROM reservations r
      LEFT JOIN customers c ON r.customer_id = c.customer_id
      LEFT JOIN tables t ON r.table_id = t.table_id
      ORDER BY r.reservation_id DESC
      LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        total_customers,
        total_tables,
        total_reservations,
        pending_reservations,
        confirmed_reservations,
        cancelled_reservations,
        available_tables,
        recent_reservations
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard statistics', error: error.message });
  }
});

// ========================================================
// 2. CUSTOMERS API
// ========================================================

// GET /customers (all or search query)
app.get('/customers', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT customer_id, name, email, phone, password FROM customers WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      query += ' AND (customer_id = ? OR name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const parsedId = isNaN(search.trim()) ? -1 : parseInt(search.trim(), 10);
      params.push(parsedId, term, term, term);
    }

    query += ' ORDER BY customer_id ASC';
    const [rows] = await promisePool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Database error fetching customers', error: error.message });
  }
});

// GET /customers/:id
app.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await promisePool.query(
      'SELECT customer_id, name, email, phone, password FROM customers WHERE customer_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Customer with ID ${id} not found` });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(`Error fetching customer ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Database error fetching customer', error: error.message });
  }
});

// POST /customers
app.post('/customers', async (req, res) => {
  try {
    let { name, email, phone, password } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }
    name = name.trim();
    if (name.length > 45) {
      return res.status(400).json({
        success: false,
        message: `Customer name cannot exceed 45 characters. Provided length: ${name.length}`
      });
    }

    if (!email || email.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer email is required' });
    }
    if (!phone || phone.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer phone number is required' });
    }

    email = email.trim();
    phone = phone.trim();
    password = password ? password.trim() : '1234';

    const [result] = await promisePool.query(
      'INSERT INTO customers (name, email, phone, password) VALUES (?, ?, ?, ?)',
      [name, email, phone, password]
    );

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: {
        customer_id: result.insertId,
        name,
        email,
        phone
      }
    });
  } catch (error) {
    console.error('Error inserting customer:', error);
    res.status(500).json({ success: false, message: 'Failed to insert customer record', error: error.message });
  }
});

// PUT /customers/:id
app.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { name, email, phone, password } = req.body;

    const [existing] = await promisePool.query(
      'SELECT customer_id, password FROM customers WHERE customer_id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: `Customer with ID ${id} not found` });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }
    name = name.trim();
    if (name.length > 45) {
      return res.status(400).json({
        success: false,
        message: 'Customer name cannot exceed 45 characters.'
      });
    }
    if (!email || email.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer email is required' });
    }
    if (!phone || phone.trim() === '') {
      return res.status(400).json({ success: false, message: 'Customer phone number is required' });
    }

    email = email.trim();
    phone = phone.trim();
    const finalPassword = password !== undefined && password !== null && password !== '' ? password.trim() : existing[0].password;

    await promisePool.query(
      'UPDATE customers SET name = ?, email = ?, phone = ?, password = ? WHERE customer_id = ?',
      [name, email, phone, finalPassword, id]
    );

    res.json({
      success: true,
      message: `Customer ID ${id} updated successfully`,
      data: { customer_id: Number(id), name, email, phone }
    });
  } catch (error) {
    console.error(`Error updating customer ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to update customer', error: error.message });
  }
});

// DELETE /customers/:id
app.delete('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [customer] = await promisePool.query(
      'SELECT customer_id, name FROM customers WHERE customer_id = ?',
      [id]
    );
    if (customer.length === 0) {
      return res.status(404).json({ success: false, message: `Customer with ID ${id} not found` });
    }

    // Check if customer has associated reservations
    const [reservations] = await promisePool.query(
      'SELECT COUNT(*) as res_count FROM reservations WHERE customer_id = ?',
      [id]
    );

    if (reservations[0].res_count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer "${customer[0].name}" (ID: ${id}) because they have ${reservations[0].res_count} associated reservation(s). Cancel or delete those reservations first to maintain database integrity.`
      });
    }

    await promisePool.query('DELETE FROM customers WHERE customer_id = ?', [id]);

    res.json({
      success: true,
      message: `Customer "${customer[0].name}" (ID: ${id}) deleted successfully.`
    });
  } catch (error) {
    console.error(`Error deleting customer ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to delete customer', error: error.message });
  }
});

// ========================================================
// 3. TABLES API
// ========================================================

// GET /tables (all or search query)
app.get('/tables', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT table_id, table_number, seating_capacity, location, status FROM tables WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      const parsedId = isNaN(search.trim()) ? -1 : parseInt(search.trim(), 10);
      query += ' AND (table_id = ? OR table_number LIKE ? OR location LIKE ?)';
      params.push(parsedId, term, term);
    }

    if (status && status.trim() !== '' && status !== 'all') {
      query += ' AND LOWER(status) = LOWER(?)';
      params.push(status.trim());
    }

    query += ' ORDER BY table_id ASC';
    const [rows] = await promisePool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ success: false, message: 'Database error fetching tables', error: error.message });
  }
});

// GET /tables/:id
app.get('/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await promisePool.query(
      'SELECT table_id, table_number, seating_capacity, location, status FROM tables WHERE table_id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Table with ID ${id} not found` });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(`Error fetching table ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Database error fetching table', error: error.message });
  }
});

// POST /tables
app.post('/tables', async (req, res) => {
  try {
    let { table_number, seating_capacity, location, status } = req.body;

    if (!table_number || table_number.trim() === '') {
      return res.status(400).json({ success: false, message: 'Table number is required' });
    }
    if (!seating_capacity || isNaN(seating_capacity) || parseInt(seating_capacity, 10) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid seating capacity (greater than 0) is required' });
    }

    table_number = table_number.trim();
    seating_capacity = parseInt(seating_capacity, 10).toString();
    location = location && location.trim() !== '' ? location.trim() : 'indoor';
    status = status && status.trim() !== '' ? status.trim() : 'Available';

    const [result] = await promisePool.query(
      'INSERT INTO tables (table_number, seating_capacity, location, status) VALUES (?, ?, ?, ?)',
      [table_number, seating_capacity, location, status]
    );

    res.status(201).json({
      success: true,
      message: `Table ${table_number} added successfully`,
      data: {
        table_id: result.insertId,
        table_number,
        seating_capacity,
        location,
        status
      }
    });
  } catch (error) {
    console.error('Error inserting table:', error);
    res.status(500).json({ success: false, message: 'Failed to insert table record', error: error.message });
  }
});

// PUT /tables/:id
app.put('/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { table_number, seating_capacity, location, status } = req.body;

    const [existing] = await promisePool.query('SELECT * FROM tables WHERE table_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: `Table with ID ${id} not found` });
    }

    if (!table_number || table_number.trim() === '') {
      return res.status(400).json({ success: false, message: 'Table number is required' });
    }
    if (!seating_capacity || isNaN(seating_capacity) || parseInt(seating_capacity, 10) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid seating capacity (> 0) is required' });
    }

    table_number = table_number.trim();
    seating_capacity = parseInt(seating_capacity, 10).toString();
    location = location && location.trim() !== '' ? location.trim() : existing[0].location;
    status = status && status.trim() !== '' ? status.trim() : existing[0].status;

    await promisePool.query(
      'UPDATE tables SET table_number = ?, seating_capacity = ?, location = ?, status = ? WHERE table_id = ?',
      [table_number, seating_capacity, location, status, id]
    );

    res.json({
      success: true,
      message: `Table ID ${id} updated successfully`,
      data: { table_id: Number(id), table_number, seating_capacity, location, status }
    });
  } catch (error) {
    console.error(`Error updating table ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to update table', error: error.message });
  }
});

// DELETE /tables/:id
app.delete('/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [table] = await promisePool.query('SELECT table_id, table_number FROM tables WHERE table_id = ?', [id]);
    if (table.length === 0) {
      return res.status(404).json({ success: false, message: `Table with ID ${id} not found` });
    }

    // Foreign-key check: see if reservations exist for this table
    const [reservations] = await promisePool.query(
      'SELECT COUNT(*) as res_count FROM reservations WHERE table_id = ?',
      [id]
    );

    if (reservations[0].res_count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Table "${table[0].table_number}" (ID: ${id}) because ${reservations[0].res_count} reservation(s) are booked on it. Cancel or remove those reservations first.`
      });
    }

    await promisePool.query('DELETE FROM tables WHERE table_id = ?', [id]);

    res.json({
      success: true,
      message: `Table "${table[0].table_number}" (ID: ${id}) deleted successfully.`
    });
  } catch (error) {
    console.error(`Error deleting table ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to delete table', error: error.message });
  }
});

// ========================================================
// 4. RESERVATIONS API
// ========================================================

// Helper query with JOINs
const RESERVATION_JOIN_SQL = `
  SELECT 
    r.reservation_id,
    r.reservation_id AS reservations_id,
    r.customer_id,
    COALESCE(c.name, CONCAT('Customer #', r.customer_id)) AS customer_name,
    COALESCE(c.phone, '') AS customer_phone,
    COALESCE(c.email, '') AS customer_email,
    r.table_id,
    COALESCE(t.table_number, CONCAT('Table #', r.table_id)) AS table_number,
    CAST(COALESCE(t.seating_capacity, 0) AS UNSIGNED) AS seating_capacity,
    COALESCE(t.location, 'Dining Floor') AS table_location,
    DATE_FORMAT(r.reservation_date, '%Y-%m-%d') AS reservation_date,
    TIME_FORMAT(r.reservation_time, '%H:%i') AS reservation_time,
    r.guests,
    r.status
  FROM reservations r
  LEFT JOIN customers c ON r.customer_id = c.customer_id
  LEFT JOIN tables t ON r.table_id = t.table_id
`;

// GET /reservations (with filtering and search)
app.get('/reservations', async (req, res) => {
  try {
    const { search, date, status } = req.query;
    let query = RESERVATION_JOIN_SQL + ' WHERE 1=1';
    const params = [];

    if (search && search.trim() !== '') {
      const term = `%${search.trim()}%`;
      const parsedId = isNaN(search.trim()) ? -1 : parseInt(search.trim(), 10);
      query += ` AND (
        r.reservation_id = ? OR 
        c.name LIKE ? OR 
        c.phone LIKE ? OR 
        t.table_number LIKE ? OR 
        r.status LIKE ?
      )`;
      params.push(parsedId, term, term, term, term);
    }

    if (date && date.trim() !== '') {
      query += ' AND r.reservation_date = ?';
      params.push(date.trim());
    }

    if (status && status.trim() !== '' && status !== 'all') {
      query += ' AND LOWER(r.status) = LOWER(?)';
      params.push(status.trim());
    }

    query += ' ORDER BY r.reservation_date DESC, r.reservation_time DESC, r.reservation_id DESC';
    const [rows] = await promisePool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ success: false, message: 'Database error fetching reservations', error: error.message });
  }
});

// GET /reservations/:id
app.get('/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = RESERVATION_JOIN_SQL + ' WHERE r.reservation_id = ?';
    const [rows] = await promisePool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Reservation with ID ${id} not found` });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(`Error fetching reservation ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Database error fetching reservation', error: error.message });
  }
});

// POST /reservations
app.post('/reservations', async (req, res) => {
  try {
    let { customer_id, table_id, reservation_date, reservation_time, guests, status } = req.body;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: 'Customer selection is required' });
    }
    if (!table_id) {
      return res.status(400).json({ success: false, message: 'Table selection is required' });
    }
    if (!reservation_date) {
      return res.status(400).json({ success: false, message: 'Reservation date is required' });
    }
    if (!reservation_time) {
      return res.status(400).json({ success: false, message: 'Reservation time is required' });
    }
    if (!guests || isNaN(guests) || parseInt(guests, 10) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid number of guests (> 0) is required' });
    }

    guests = parseInt(guests, 10);
    customer_id = parseInt(customer_id, 10);
    table_id = parseInt(table_id, 10);
    status = status && status.trim() !== '' ? status.trim() : 'confirmed';

    // Check Customer existence
    const [customerRows] = await promisePool.query('SELECT customer_id, name FROM customers WHERE customer_id = ?', [customer_id]);
    if (customerRows.length === 0) {
      return res.status(400).json({ success: false, message: `Selected Customer ID ${customer_id} does not exist.` });
    }

    // Check Table existence and Capacity
    const [tableRows] = await promisePool.query('SELECT table_id, table_number, CAST(seating_capacity AS UNSIGNED) AS seating_capacity FROM tables WHERE table_id = ?', [table_id]);
    if (tableRows.length === 0) {
      return res.status(400).json({ success: false, message: `Selected Table ID ${table_id} does not exist.` });
    }
    const table = tableRows[0];
    if (guests > table.seating_capacity) {
      return res.status(400).json({
        success: false,
        message: `Number of guests (${guests}) exceeds Table ${table.table_number}'s maximum seating capacity (${table.seating_capacity} persons). Please choose a larger table.`
      });
    }

    // Check for Overlapping / Conflicting reservations (90 minutes window)
    const [conflictRows] = await promisePool.query(
      `SELECT reservation_id, reservation_time, status 
       FROM reservations 
       WHERE table_id = ? 
         AND reservation_date = ? 
         AND LOWER(status) != 'cancelled'
         AND ABS(TIME_TO_SEC(TIMEDIFF(reservation_time, ?))) < 5400`,
      [table_id, reservation_date, reservation_time]
    );

    if (conflictRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Conflicting reservation: Table ${table.table_number} is already reserved around ${conflictRows[0].reservation_time} on ${reservation_date}. Please select another time or available table.`
      });
    }

    // Insert Reservation
    const [insertResult] = await promisePool.query(
      `INSERT INTO reservations (customer_id, table_id, reservation_date, reservation_time, guests, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customer_id, table_id, reservation_date, reservation_time, guests, status]
    );

    res.status(201).json({
      success: true,
      message: 'Reservation created successfully!',
      data: {
        reservation_id: insertResult.insertId,
        reservations_id: insertResult.insertId,
        customer_id,
        customer_name: customerRows[0].name,
        table_id,
        table_number: table.table_number,
        reservation_date,
        reservation_time,
        guests,
        status
      }
    });
  } catch (error) {
    console.error('Error inserting reservation:', error);
    res.status(500).json({ success: false, message: 'Failed to create reservation', error: error.message });
  }
});

// PUT /reservations/:id
app.put('/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { customer_id, table_id, reservation_date, reservation_time, guests, status } = req.body;

    const [existing] = await promisePool.query('SELECT * FROM reservations WHERE reservation_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: `Reservation with ID ${id} not found` });
    }

    customer_id = customer_id ? parseInt(customer_id, 10) : existing[0].customer_id;
    table_id = table_id ? parseInt(table_id, 10) : existing[0].table_id;
    reservation_date = reservation_date || existing[0].reservation_date;
    reservation_time = reservation_time || existing[0].reservation_time;
    guests = guests ? parseInt(guests, 10) : existing[0].guests;
    status = status && status.trim() !== '' ? status.trim() : existing[0].status;

    // Check customer
    const [customerRows] = await promisePool.query('SELECT customer_id, name FROM customers WHERE customer_id = ?', [customer_id]);
    if (customerRows.length === 0) {
      return res.status(400).json({ success: false, message: `Selected Customer ID ${customer_id} does not exist.` });
    }

    // Check table capacity
    const [tableRows] = await promisePool.query('SELECT table_id, table_number, CAST(seating_capacity AS UNSIGNED) AS seating_capacity FROM tables WHERE table_id = ?', [table_id]);
    if (tableRows.length === 0) {
      return res.status(400).json({ success: false, message: `Selected Table ID ${table_id} does not exist.` });
    }
    const table = tableRows[0];
    if (guests > table.seating_capacity) {
      return res.status(400).json({
        success: false,
        message: `Number of guests (${guests}) exceeds Table ${table.table_number}'s maximum capacity (${table.seating_capacity}).`
      });
    }

    // Conflict check (exclude current reservation)
    if (status.toLowerCase() !== 'cancelled') {
      const [conflicts] = await promisePool.query(
        `SELECT reservation_id, reservation_time 
         FROM reservations 
         WHERE table_id = ? 
           AND reservation_date = ? 
           AND reservation_id != ?
           AND LOWER(status) != 'cancelled'
           AND ABS(TIME_TO_SEC(TIMEDIFF(reservation_time, ?))) < 5400`,
        [table_id, reservation_date, id, reservation_time]
      );

      if (conflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Conflicting reservation: Table ${table.table_number} already has a reservation near ${conflicts[0].reservation_time} on ${reservation_date}.`
        });
      }
    }

    await promisePool.query(
      `UPDATE reservations 
       SET customer_id = ?, table_id = ?, reservation_date = ?, reservation_time = ?, guests = ?, status = ? 
       WHERE reservation_id = ?`,
      [customer_id, table_id, reservation_date, reservation_time, guests, status, id]
    );

    res.json({
      success: true,
      message: `Reservation ID ${id} updated successfully!`,
      data: {
        reservation_id: Number(id),
        reservations_id: Number(id),
        customer_id,
        customer_name: customerRows[0].name,
        table_id,
        table_number: table.table_number,
        reservation_date,
        reservation_time,
        guests,
        status
      }
    });
  } catch (error) {
    console.error(`Error updating reservation ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to update reservation', error: error.message });
  }
});

// DELETE /reservations/:id
app.delete('/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await promisePool.query('SELECT reservation_id FROM reservations WHERE reservation_id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: `Reservation with ID ${id} not found` });
    }

    await promisePool.query('DELETE FROM reservations WHERE reservation_id = ?', [id]);

    res.json({
      success: true,
      message: `Reservation ID ${id} deleted successfully.`
    });
  } catch (error) {
    console.error(`Error deleting reservation ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to delete reservation', error: error.message });
  }
});

// ========================================================
// START SERVER
// ========================================================
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🍽️  Tejeswar Restaurant - Reservation Management System Server`);
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`📁 Serving frontend from: ${path.join(__dirname, 'public')}`);
  console.log(`💾 Connected to MySQL Database: reservation`);
  console.log(`====================================================`);
});
