#!/bin/bash
# Cron: recordatorios WhatsApp de visitas de manana (20:00 diario)
curl -s -X POST https://inmo.eaistudio.es/api/whatsapp/reminders \
  -H "x-api-key: 54ebfd6a0d434e67211194267b2badb72c2b4f509eba3558" \
  -H "Content-Type: application/json" \
  >> /opt/inmoflow/logs/wa-reminders.log 2>&1
echo "" >> /opt/inmoflow/logs/wa-reminders.log

# Check tareas vencidas + notificar visitas de manana
curl -s -X POST https://inmo.eaistudio.es/api/notificaciones/check \
  -H "x-api-key: 54ebfd6a0d434e67211194267b2badb72c2b4f509eba3558" \
  -H "Content-Type: application/json" \
  >> /opt/inmoflow/logs/notificaciones.log 2>&1
echo "" >> /opt/inmoflow/logs/notificaciones.log
