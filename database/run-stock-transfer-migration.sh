#!/bin/bash
# Jalankan migrasi StockTransfers ke SQL Server POS.
# Default: container "sqlserver" di port 1433 (Password123!)
set -e

CONTAINER="${MSSQL_CONTAINER:-sqlserver}"
PASSWORD="${MSSQL_SA_PASSWORD:-Password123!}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Migrasi stock-transfer-tables.sql → container: ${CONTAINER}"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '${CONTAINER}' tidak berjalan."
  echo "Jalankan SQL Server dulu, atau set MSSQL_CONTAINER / MSSQL_SA_PASSWORD."
  exit 1
fi

docker exec -i "$CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$PASSWORD" -C \
  -i /dev/stdin < "${SCRIPT_DIR}/pos/stock-transfer-tables.sql"

echo ""
echo "Verifikasi tabel:"
docker exec "$CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$PASSWORD" -C -d LatihanASP_POS \
  -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME IN ('StockTransfers','StockTransferDetails')"

echo ""
echo "Selesai. Restart backend jika perlu: docker restart latihanasp-api"
