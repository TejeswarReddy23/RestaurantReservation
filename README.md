# 🍽️ Tejeswar Restaurant - Reservation Management System

A full-stack, enterprise-grade restaurant reservation management application built with **HTML5**, **CSS3**, **JavaScript (ES6+) Fetch API**, **Node.js**, **Express.js**, and **MySQL**.

---

## 📋 Table of Contents
1. [Overview](#-overview)
2. [Technologies Used](#-technologies-used)
3. [Database Architecture](#-database-architecture)
4. [Project Structure](#-project-structure)
5. [Setup & Installation](#-setup--installation)
6. [Application Pages](#-application-pages)
7. [REST API Endpoints](#-rest-api-endpoints)
8. [Business Logic & Validations](#-business-logic--validations)
9. [CRUD Testing Guide](#-crud-testing-guide)

---

## 🌟 Overview
The **Restaurant Reservation Management System** provides fine-dining establishments with an end-to-end booking platform. It features real-time seat allocation, conflict prevention, dynamic capacity validation, foreign-key data integrity safeguards, and a restaurant aesthetic using a cream, gold, dark-brown, and charcoal palette.

---

## 💻 Technologies Used

### Frontend
- **HTML5**: Semantic markup across all 9 pages.
- **CSS3**: Responsive flexbox and grid layouts, luxury glassmorphism cards, custom status badges, and page-specific ambient restaurant backdrops.
- **Vanilla JavaScript (Fetch API)**: Modular, event-driven DOM updates without bulky third-party libraries.

### Backend
- **Node.js** (v18+)
- **Express.js** (v4.19+)
- **CORS** middleware

### Database
- **MySQL Server 8.0**
- **mysql2**: High-performance connection pool with parameterized prepared queries preventing SQL injection, and `dateStrings: true` to prevent timezone offsets.

---

## 🗄️ Database Architecture

The application connects directly to the existing MySQL database:
- **Host**: `localhost`
- **Port**: `3306`
- **Username**: `root`
- **Password**: `tejeswar`
- **Database**: `reservation`

### Actual MySQL Schema:

#### 1. `customers`
```sql
CREATE TABLE `customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `password` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`customer_id`)
);
```

#### 2. `tables`
```sql
CREATE TABLE `tables` (
  `table_id` int NOT NULL AUTO_INCREMENT,
  `table_number` varchar(100) DEFAULT NULL,
  `seating_capacity` int DEFAULT NULL,
  `location` varchar(50) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`table_id`)
);
```

#### 3. `reservations`
```sql
CREATE TABLE `reservations` (
  `reservations_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `table_id` int DEFAULT NULL,
  `reservation_date` date DEFAULT NULL,
  `reservation_time` time DEFAULT NULL,
  `guests` int DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`reservations_id`),
  CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`),
  CONSTRAINT `reservations_ibfk_2` FOREIGN KEY (`table_id`) REFERENCES `tables` (`table_id`)
);
```

---

## 📂 Project Structure

```
RestaurantReservation/
│
├── server.js               # Express application with MySQL connection pool & REST APIs
├── package.json            # Project metadata & dependencies (express, mysql2, cors)
├── README.md               # Complete project documentation
│
└── public/                 # Static frontend served by Express
    │
    ├── index.html          # Page 1: Dashboard with live metrics & recent reservations
    ├── insert.html         # Page 2: Multi-tab insert form for Customers, Tables, Reservations
    ├── list.html           # Page 3: Display all records with SQL JOINs and action buttons
    ├── listOne.html        # Page 4: Search single record by ID, Name, Phone, or Status
    ├── update.html         # Page 5: Load record by ID and edit in-place
    ├── delete.html         # Page 6: Safe delete with record inspection & FK safeguard
    ├── customers.html      # Customer management: List, Add, Edit, Delete, Search
    ├── tables.html         # Table management: List, Add, Edit, Delete, Status filter
    ├── reservations.html   # Reservation management: Add, Edit, Cancel, Date/Status filters
    │
    ├── css/
    │   └── style.css       # Unified luxury restaurant CSS stylesheet
    │
    ├── js/
    │   └── app.js          # Unified vanilla JavaScript handling all API operations
    │
    └── images/             # Restaurant imagery (hero, interior, dining, tables, food)
        ├── hero-bg.jpg
        ├── interior-bg.jpg
        ├── dining-bg.jpg
        ├── food-bg.jpg
        ├── tables-bg.jpg
        ├── reservations-bg.jpg
        └── customers-bg.jpg
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **MySQL Server** running locally on port 3306 with database `restaurant_reservation`

### 2. Install Dependencies
In the project directory, run:
```bash
npm install
```

### 3. Start the Server
```bash
node server.js
```

### 4. Access the Application
Open your web browser and navigate to:
```
http://localhost:3000
```

---

## 📑 Application Pages

| Page | URL | Functionality |
| :--- | :--- | :--- |
| **Dashboard** | `/index.html` | Displays real-time database counts (Total Customers, Tables, Reservations, Pending, Confirmed, Cancelled, Available Tables today) and the 5 most recent bookings. |
| **Add Records** | `/insert.html` | Tabbed interface to insert Customers (with schema constraint validations), Tables, and Reservations (with dynamic capacity checks). |
| **View Records** | `/list.html` | Lists all database records. Reservations display customer names and table numbers via relational SQL `JOIN`s. Search input included. |
| **Search Single Record** | `/listOne.html` | Queries MySQL for a specific record across Customers, Tables, or Reservations by ID, Name, Phone, or Status. |
| **Update Records** | `/update.html` | Fetches any record by ID, populates form fields with current values, and performs `PUT` updates. |
| **Delete Records** | `/delete.html` | Previews the record before deletion and enforces foreign key safety checks to prevent orphan records. |
| **Customers** | `/customers.html` | Dedicated customer directory with real-time search, inline registration, edit, and delete. |
| **Tables** | `/tables.html` | Dining floor directory with seating capacity display, availability filtering, and table registration. |
| **Reservations** | `/reservations.html` | Master schedule view with date picker filtering, status filters, one-click quick cancellation, edit, and deletion. |

---

## 🔌 REST API Endpoints

### 📊 Dashboard
- `GET /dashboard`: Returns live aggregate counts and recent reservations with customer & table data.

### 👥 Customers
- `GET /customers`: Returns all customers (supports `?search=`).
- `GET /customers/:id`: Returns single customer record.
- `POST /customers`: Creates new customer. Body: `{ name, email, phone, password }`.
- `PUT /customers/:id`: Updates customer. Body: `{ name, email, phone, password }`.
- `DELETE /customers/:id`: Deletes customer (blocks deletion if linked reservations exist).

### 🪑 Tables
- `GET /tables`: Returns all tables (supports `?search=` and `?status=`).
- `GET /tables/:id`: Returns single table record.
- `POST /tables`: Creates new table. Body: `{ table_number, seating_capacity, location, status }`.
- `PUT /tables/:id`: Updates table. Body: `{ table_number, seating_capacity, location, status }`.
- `DELETE /tables/:id`: Deletes table (blocks deletion if reservations are booked on it).

### 📅 Reservations
- `GET /reservations`: Returns reservations joined with `customers` and `tables` (supports `?search=`, `?date=`, `?status=`).
- `GET /reservations/:id`: Returns single reservation with joined relational details.
- `POST /reservations`: Creates new reservation with capacity and overlap conflict checks.
- `PUT /reservations/:id`: Updates reservation with validation checks.
- `DELETE /reservations/:id`: Removes reservation record.

---

## 🧠 Business Logic & Validations

1. **Capacity Validation**: A reservation cannot be created if `guests > table.seating_capacity`. The API returns HTTP 400 with a descriptive error.
2. **Conflict Prevention**: Prevents double-booking by verifying if the selected table has another non-cancelled reservation within a 90-minute window on the same date.
3. **Foreign Key Integrity**:
   - Customer and Table selections in forms query live MySQL records.
   - Deleting a Customer or Table with active or past reservations is intercepted, preventing MySQL foreign key crashes and warning the user to resolve dependencies first.
4. **Schema Compliance**: Name inputs are validated to respect the MySQL `VARCHAR(15)` column constraint.

---

## 🧪 CRUD Testing Guide

Follow these steps to test all CRUD operations:

1. **Start the application**:
   ```bash
   node server.js
   ```
2. **Open Dashboard**: Go to `http://localhost:3000`. Observe live counters.
3. **Add a Customer**:
   - Go to `insert.html` &rarr; click **New Customer**.
   - Enter Name (e.g., `Alexander`), Email (`alex@example.com`), Phone (`555-0101`).
   - Click **Save Customer**.
4. **Add a Table**:
   - In `insert.html` &rarr; click **New Restaurant Table**.
   - Enter Table Number (`T-1`), Capacity (`4`), Location (`Window Side`), Status (`Available`).
   - Click **Save Table**.
5. **Add a Reservation**:
   - In `insert.html` &rarr; click **New Reservation**.
   - Select `Alexander` from the Customer dropdown.
   - Select `Table T-1` from the Table dropdown.
   - Pick tomorrow's date, set time to `19:00`, enter `2` guests, status `Confirmed`.
   - Click **Confirm & Save Reservation**.
6. **Verify Relational Display**:
   - Go to `list.html`. Observe that the reservation displays Alexander's name, phone number, and Table T-1 details via SQL JOINs.
7. **Test Search**:
   - Go to `listOne.html`. Choose `Customer` and search for `Alexander` or ID `1`.
8. **Test Update**:
   - Go to `update.html`. Select `Customer`, enter ID `1`, click **Load Record**. Change phone number and click **Save Changes**.
9. **Test Conflict Prevention**:
   - Attempt to book Table `T-1` on the same date at `19:30` (within the 90-minute window). Notice the conflict error message.
10. **Test Capacity Enforcement**:
    - Attempt to book Table `T-1` (capacity 4) for `6` guests. Notice the seating capacity rejection.
11. **Test Foreign Key Protection on Delete**:
    - Go to `delete.html`. Try to delete Customer `1`. Notice the application safely blocks deletion because linked reservations exist.
12. **Test Delete**:
    - Delete the Reservation first, then delete the Customer.
