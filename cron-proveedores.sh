#!/bin/bash
# Cron: diario 09:00 — recordatorios a proveedores sin responder
curl -s -X POST https://inmo.eaistudio.es/api/proveedores/recordatorios   -H "x-api-key: $(grep PORTALES_API_KEY /opt/inmoflow/.env | cut -d= -f2)"   -H "Content-Type: application/json"   >> /opt/inmoflow/logs/proveedores-reminders.log 2>&1
echo '' >> /opt/inmoflow/logs/proveedores-reminders.log
