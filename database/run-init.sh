#!/bin/bash
set -e

SERVER="${MSSQL_HOST:-sqlserver}"
PASSWORD="${MSSQL_SA_PASSWORD:-LatihanASP@2026!}"

echo "Waiting for SQL Server at ${SERVER}..."
for i in $(seq 1 60); do
  if /opt/mssql-tools18/bin/sqlcmd -S "$SERVER" -U sa -P "$PASSWORD" -C -Q "SELECT 1" &>/dev/null; then
    echo "SQL Server is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "SQL Server did not become ready in time."
    exit 1
  fi
  sleep 2
done

echo "Running init.sql..."
/opt/mssql-tools18/bin/sqlcmd -S "$SERVER" -U sa -P "$PASSWORD" -C -i /scripts/init.sql

echo "Running pos/init.sql..."
/opt/mssql-tools18/bin/sqlcmd -S "$SERVER" -U sa -P "$PASSWORD" -C -i /scripts/pos/init.sql

echo "Running pos/hold-tables.sql (migration)..."
/opt/mssql-tools18/bin/sqlcmd -S "$SERVER" -U sa -P "$PASSWORD" -C -i /scripts/pos/hold-tables.sql 2>/dev/null || true

echo "Running pos/refund-tables.sql (migration)..."
/opt/mssql-tools18/bin/sqlcmd -S "$SERVER" -U sa -P "$PASSWORD" -C -i /scripts/pos/refund-tables.sql 2>/dev/null || true

echo "Running pos/brand-tables.sql (migration)..."
/opt/mssql-tools18/bin/sqlcmd -S "$SERVER" -U sa -P "$PASSWORD" -C -i /scripts/pos/brand-tables.sql 2>/dev/null || true
echo "Running pos/membership-tables.sql (migration)..."
/opt/mssql-tools18/bin/sqlcmd -S "$SERVER" -U sa -P "$PASSWORD" -C -i /scripts/pos/membership-tables.sql 2>/dev/null || true

echo "Running pos/hutang-piutang-tables.sql (migration)..."
/opt/mssql-tools18/bin/sqlcmd -S "$SERVER" -U sa -P "$PASSWORD" -C -i /scripts/pos/hutang-piutang-tables.sql 2>/dev/null || true

echo "Databases LatihanASP_DB and LatihanASP_POS initialized."
