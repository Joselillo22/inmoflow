#!/bin/bash
# InmoFlow — Verificación semanal de backup
# Restaura el último dump en una DB temporal y compara counts

set -euo pipefail

BACKUP_DIR="/opt/inmoflow/backups"
LOG_FILE="/opt/inmoflow/logs/backup-verify.log"
CONTAINER="inmoflow-db"
DB_USER="inmoflow"
DB_NAME="inmoflow"
VERIFY_DB="inmoflow_verify"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Encontrar el último backup
LATEST=$(ls -t "${BACKUP_DIR}"/inmoflow_*.dump 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
    log "ERROR: No hay backups disponibles"
    exit 1
fi

FILENAME=$(basename "$LATEST")
log "INICIO verificación: $FILENAME"

# Copiar dump al contenedor
docker cp "$LATEST" "${CONTAINER}:/tmp/${FILENAME}"

# Eliminar DB temporal si existe de una ejecución anterior
docker exec "$CONTAINER" dropdb -U "$DB_USER" --if-exists "$VERIFY_DB" 2>/dev/null || true

# Crear DB temporal
if ! docker exec "$CONTAINER" createdb -U "$DB_USER" "$VERIFY_DB" 2>> "$LOG_FILE"; then
    log "ERROR: No se pudo crear DB temporal"
    docker exec "$CONTAINER" rm -f "/tmp/${FILENAME}"
    exit 1
fi

# Restaurar
if ! docker exec "$CONTAINER" pg_restore -U "$DB_USER" -d "$VERIFY_DB" "/tmp/${FILENAME}" 2>> "$LOG_FILE"; then
    log "WARN: pg_restore terminó con warnings (puede ser normal)"
fi

# Comparar counts de tablas principales
TABLES="usuarios leads inmuebles operaciones comerciales propietarios visitas tareas"
ALL_OK=true

for TABLE in $TABLES; do
    PROD_COUNT=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM ${TABLE};" 2>/dev/null | tr -d ' ')
    VERIFY_COUNT=$(docker exec "$CONTAINER" psql -U "$DB_USER" -d "$VERIFY_DB" -t -c "SELECT count(*) FROM ${TABLE};" 2>/dev/null | tr -d ' ')

    if [ "$PROD_COUNT" = "$VERIFY_COUNT" ]; then
        log "  OK: ${TABLE} (prod=${PROD_COUNT}, backup=${VERIFY_COUNT})"
    else
        log "  FAIL: ${TABLE} (prod=${PROD_COUNT}, backup=${VERIFY_COUNT})"
        ALL_OK=false
    fi
done

# Limpiar
docker exec "$CONTAINER" dropdb -U "$DB_USER" --if-exists "$VERIFY_DB" 2>/dev/null || true
docker exec "$CONTAINER" rm -f "/tmp/${FILENAME}"

if $ALL_OK; then
    log "RESULTADO: OK — Backup verificado correctamente"
else
    log "RESULTADO: FAIL — Discrepancias encontradas"
fi
