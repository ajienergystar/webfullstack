#!/bin/bash
# Jalankan migrasi OnlineOrders ke SQL Server POS.
# Default: container "sqlserver" di port 1433 (Password123!)
set -e

CONTAINER="${MSSQL_CONTAINER:-sqlserver}"
PASSWORD="${MSSQL_SA_PASSWORD:-Password123!}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Migrasi online-order-tables.sql → container: ${CONTAINER}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '${CONTAINER}' tidak berjalan."
  echo "Jalankan SQL Server dulu, atau set MSSQL_CONTAINER / MSSQL_SA_PASSWORD."
  exit 1
fi

docker exec -i "$CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$PASSWORD" -C \
  -i /dev/stdin < "${SCRIPT_DIR}/pos/online-order-tables.sql"

echo ""
echo "Verifikasi tabel:"
docker exec "$CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$PASSWORD" -C -d LatihanASP_POS \
  -Q "SELECT Id, OrderNumber, OrderStatus, PaymentStatus, GrandTotal FROM OnlineOrders"

echo ""
echo "Selesai. Refresh halaman Online Order di browser."
