#!/bin/bash
# Cron: generar informes mensuales de propietarios (dia 1 de cada mes a las 06:00)
curl -s -X POST https://inmo.eaistudio.es/api/informes/generate \
  -H "x-api-key: 54ebfd6a0d434e67211194267b2badb72c2b4f509eba3558" \
  -H "Content-Type: application/json" \
  >> /opt/inmoflow/logs/informes-mensuales.log 2>&1
echo "" >> /opt/inmoflow/logs/informes-mensuales.log
