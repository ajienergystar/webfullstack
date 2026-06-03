# Database LatihanASP_DB (SQL Server)

Skema ini dikonversi dari sintaks MySQL ke **Microsoft SQL Server**.

## Perbedaan utama (MySQL → SQL Server)

| MySQL | SQL Server |
|-------|------------|
| `AUTO_INCREMENT` | `IDENTITY(1,1)` |
| `BOOLEAN` | `BIT` (0 = false, 1 = true) |
| `TIMESTAMP` | `DATETIME2` |
| `TEXT` | `NVARCHAR(MAX)` |
| `ON UPDATE CURRENT_TIMESTAMP` | Trigger `trg_users_updated_at` |

## Tabel

- `users`
- `password_resets`
- `user_sessions`
- `email_verifications`

## Menjalankan dengan Docker

```bash
cd LatihanASP
docker compose up -d sqlserver
docker compose run --rm db-init
```

## Koneksi manual

| Setting | Nilai |
|---------|-------|
| Server | `localhost,1433` |
| Database | `LatihanASP_DB` |
| User | `sa` |
| Password | `LatihanASP@2026!` (container `latihanasp-sqlserver`) atau `Password123!` (container `sqlserver` yang sudah ada) |

## Database POS (`LatihanASP_POS`)

Skema lengkap Point of Sale ada di `database/pos/init.sql` (Roles, Users, Products, Sales, Purchases, Stock, dll. + data contoh).

```bash
# Container sqlserver (port 1433, password Password123!)
docker cp database/pos/init.sql sqlserver:/tmp/pos-init.sql
docker exec sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Password123!' -C -i /tmp/pos-init.sql

# Atau lewat db-init (auth + POS sekaligus)
docker compose run --rm db-init
```

Connection string backend: `ConnectionStrings:PosConnection` → database `LatihanASP_POS`.

API dashboard: `GET /api/dashboard` — dipakai halaman Dashboard frontend.

## Menjalankan skrip tanpa Docker

Jika `sqlcmd` terpasang:

```bash
sqlcmd -S localhost -U sa -P "LatihanASP@2026!" -C -i database/init.sql
sqlcmd -S localhost -U sa -P "LatihanASP@2026!" -C -i database/pos/init.sql
```
