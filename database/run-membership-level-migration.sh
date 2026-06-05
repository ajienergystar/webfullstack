#!/bin/bash
# Jalankan migrasi MembershipLevels ke SQL Server POS.
# Default: host SQL Server via container latihanasp-sqlserver (port 1433, Password123!)
set -e

CONTAINER="${MSSQL_CONTAINER:-latihanasp-sqlserver}"
SERVER="${MSSQL_HOST:-host.docker.internal,1433}"
PASSWORD="${MSSQL_SA_PASSWORD:-Password123!}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Migrasi membership-level-tables.sql → ${SERVER} (via ${CONTAINER})"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Container '${CONTAINER}' tidak berjalan."
  echo "Jalankan SQL Server dulu, atau set MSSQL_CONTAINER / MSSQL_HOST / MSSQL_SA_PASSWORD."
  exit 1
fi

docker cp "${SCRIPT_DIR}/pos/membership-level-tables.sql" "${CONTAINER}:/tmp/membership-level-tables.sql"

docker exec "$CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
  -S "$SERVER" -U sa -P "$PASSWORD" -C \
  -i /tmp/membership-level-tables.sql

echo ""
echo "Verifikasi tabel:"
docker exec "$CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
  -S "$SERVER" -U sa -P "$PASSWORD" -C -d LatihanASP_POS \
  -Q "SELECT LevelName, MinLoyaltyPoint, DiscountPercent, IsActive FROM MembershipLevels ORDER BY SortOrder"

echo ""
echo "Selesai. Refresh halaman Membership Level di browser."
