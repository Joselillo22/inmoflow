#!/bin/bash
# Cron job para parsear emails de portales cada 5 minutos
curl -s -X POST https://inmo.eaistudio.es/api/portales/email-parse \
  -H "x-api-key: 54ebfd6a0d434e67211194267b2badb72c2b4f509eba3558" \
  -H "Content-Type: application/json" \
  >> /opt/inmoflow/logs/email-parse.log 2>&1
echo "" >> /opt/inmoflow/logs/email-parse.log

# Check leads sin contactar
curl -s -X POST https://inmo.eaistudio.es/api/automatizaciones/check \
  -H "x-api-key: 54ebfd6a0d434e67211194267b2badb72c2b4f509eba3558" \
  -H "Content-Type: application/json" \
  >> /opt/inmoflow/logs/automatizaciones.log 2>&1
echo "" >> /opt/inmoflow/logs/automatizaciones.log
