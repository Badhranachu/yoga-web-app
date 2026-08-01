# EKAM Yoga Project Overview

The system is a modular monolith: one React/Vite application serves the
public homepage, member account area, and admin dashboard; one Django/DRF
application owns authentication, timetable, leave, booking, payment,
notification, dashboard, and reporting domains.

The backend is the source of truth for permissions, booking state, attendance,
subscription balances, payment history, receipts, and audit records. The
frontend uses feature modules and shared layout/design tokens. Dashboard and
reports endpoints are read-only aggregates and do not duplicate domain write
logic.

## Production review status

- Transactions and row locks protect booking, transfer/reschedule, attendance,
  and subscription mutations.
- Admin-only aggregates and reports use `IsAuthenticated` plus `IsAdminRole`.
- Database indexes cover booking slots, active users, change-request dates,
  payment status/date queries, and existing user/status access patterns.
- The production settings enforce HTTPS redirects, secure cookies, HSTS,
  content-type sniffing protection, referrer policy, and clickjacking defense.
- The responsive dashboard sidebar collapses labels on narrow screens while
  preserving the existing navigation and visual system.

## Architecture diagram

```mermaid
flowchart LR
    subgraph client ["Client Apps"]
        web["React Web App"]
    end
    subgraph gateway ["API Layer"]
        api["Django URL Router and DRF"]
    end
    subgraph service ["Domain Services"]
        auth["Accounts and JWT"]
        studio["Timetable and Leave"]
        booking["Booking and Attendance"]
        billing["Subscriptions and Payments"]
        notice["Notifications"]
        reporting["Dashboard and Reports"]
    end
    subgraph datastore ["Data Store"]
        mysql["MySQL Database"]
    end
    web -->|"HTTPS JSON"| api
    api -->|"Auth routes"| auth
    api -->|"Studio routes"| studio
    api -->|"Booking routes"| booking
    api -->|"Payment routes"| billing
    api -->|"Notification routes"| notice
    api -->|"Aggregate routes"| reporting
    auth -->|"Read and write"| mysql
    studio -->|"Read and write"| mysql
    booking -->|"Transactional writes"| mysql
    billing -->|"Transactional writes"| mysql
    notice -->|"Read and write"| mysql
    reporting -->|"Read-only queries"| mysql
```

## Entity relationship diagram

```mermaid
erDiagram
    USER ||--o{ PASSWORD_RESET_TOKEN : owns
    USER ||--o{ SLOT : creates
    USER ||--o{ BOOKING : places
    USER ||--o{ SUBSCRIPTION : purchases
    USER ||--o{ SLOT_PURCHASE : makes
    USER ||--o{ PAYMENT_TRANSACTION : makes
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ CHANGE_REQUEST : requests
    SLOT ||--o| BOOKING : reserves
    LEAVE ||--o{ SLOT : blocks
    SUBSCRIPTION_PLAN ||--o{ SUBSCRIPTION : configures
    SUBSCRIPTION ||--o{ PAYMENT_TRANSACTION : records
    SLOT_PURCHASE ||--o{ PAYMENT_TRANSACTION : records
    PAYMENT_TRANSACTION ||--|| RECEIPT : generates
    BOOKING ||--o{ CHANGE_REQUEST : changes

    USER {
        int id PK
        string email UK
        string role
        bool is_active
        datetime created_at
    }
    SLOT {
        int id PK
        date date
        time start_time
        bool is_booked
        int leave_id FK
    }
    BOOKING {
        int id PK
        int slot_id FK, UK
        int user_id FK
        string status
    }
    SUBSCRIPTION {
        int id PK
        int user_id FK
        int plan_id FK
        string status
        int sessions_remaining
    }
    PAYMENT_TRANSACTION {
        int id PK
        int user_id FK
        string transaction_id UK
        decimal amount
        string status
    }
    RECEIPT {
        int id PK
        int transaction_id FK, UK
        string receipt_number UK
        datetime payment_date
    }
```
