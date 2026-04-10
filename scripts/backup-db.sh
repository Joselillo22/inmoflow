#!/bin/bash
# InmoFlow — Backup diario de PostgreSQL
# Ejecuta pg_dump DENTRO del contenedor Docker
# Retención: 7 diarios, 4 semanales (lunes), 3 mensuales (día 1)

set -euo pipefail

BACKUP_DIR="/opt/inmoflow/backups"
LOG_FILE="/opt/inmoflow/logs/backup.log"
CONTAINER="inmoflow-db"
DB_USER="inmoflow"
DB_NAME="inmoflow"
DATE=$(date +%Y-%m-%d_%H-%M)
DAY_OF_WEEK=$(date +%u)  # 1=lunes
DAY_OF_MONTH=$(date +%d)
DUMP_FILE="inmoflow_${DATE}.dump"

mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

START=$(date +%s)
log "INICIO backup: $DUMP_FILE"

# Ejecutar pg_dump dentro del contenedor y copiar al host
if docker exec "$CONTAINER" pg_dump -U "$DB_USER" -Fc "$DB_NAME" > "${BACKUP_DIR}/${DUMP_FILE}" 2>> "$LOG_FILE"; then
    END=$(date +%s)
    DURATION=$((END - START))
    SIZE=$(du -h "${BACKUP_DIR}/${DUMP_FILE}" | cut -f1)
    log "OK: ${DUMP_FILE} (${SIZE}, ${DURATION}s)"
else
    log "ERROR: pg_dump falló"
    rm -f "${BACKUP_DIR}/${DUMP_FILE}"
    exit 1
fi

# --- RETENCIÓN ---

# Copias semanales (lunes): mover a subdirectorio
if [ "$DAY_OF_WEEK" = "1" ]; then
    mkdir -p "${BACKUP_DIR}/weekly"
    cp "${BACKUP_DIR}/${DUMP_FILE}" "${BACKUP_DIR}/weekly/"
    log "Copia semanal guardada"
fi

# Copias mensuales (día 1): mover a subdirectorio
if [ "$DAY_OF_MONTH" = "01" ]; then
    mkdir -p "${BACKUP_DIR}/monthly"
    cp "${BACKUP_DIR}/${DUMP_FILE}" "${BACKUP_DIR}/monthly/"
    log "Copia mensual guardada"
fi

# Limpiar diarios: mantener últimos 7
cd "$BACKUP_DIR"
ls -t inmoflow_*.dump 2>/dev/null | tail -n +8 | xargs -r rm -f
DAILY_COUNT=$(ls inmoflow_*.dump 2>/dev/null | wc -l)
log "Retención diaria: ${DAILY_COUNT} backups"

# Limpiar semanales: mantener últimos 4
if [ -d "${BACKUP_DIR}/weekly" ]; then
    cd "${BACKUP_DIR}/weekly"
    ls -t inmoflow_*.dump 2>/dev/null | tail -n +5 | xargs -r rm -f
fi

# Limpiar mensuales: mantener últimos 3
if [ -d "${BACKUP_DIR}/monthly" ]; then
    cd "${BACKUP_DIR}/monthly"
    ls -t inmoflow_*.dump 2>/dev/null | tail -n +4 | xargs -r rm -f
fi

log "Backup completado"
