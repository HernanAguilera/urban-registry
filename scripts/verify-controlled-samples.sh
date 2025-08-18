#!/bin/bash

# Script para verificar muestras controladas ANTES y DESPUÉS del UPSERT
# Este script te permite verificar que el UPSERT está funcionando correctamente

echo "🔍 VERIFICACIÓN DE MUESTRAS CONTROLADAS - Red Atlas"
echo "=================================================="

# Verificar que tenemos el TOKEN
if [ -z "$TOKEN" ]; then
    echo "❌ Error: TOKEN no está definido. Ejecuta primero:"
    echo "export TOKEN=\"tu_access_token_aqui\""
    exit 1
fi

echo ""
echo "📋 MUESTRAS CONTROLADAS ESPERADAS:"
echo "=================================="
echo "EXT-TEST-001: Casa en Palermo ORIGINAL     | ANTES: \$450,000 → DESPUÉS: \$517,500 (+15%)"
echo "EXT-TEST-002: Depto en Recoleta ORIGINAL   | ANTES: \$380,000 → DESPUÉS: \$437,000 (+15%)"
echo "EXT-TEST-003: Casa en Villa Crespo ORIGINAL| ANTES: \$320,000 → DESPUÉS: \$368,000 (+15%)"
echo ""

echo "🔍 ESTADO ACTUAL de las muestras controladas:"
echo "============================================"

# Buscar las 3 propiedades específicas por external_id usando API
echo "📡 Consultando via API..."
for ext_id in "EXT-TEST-001" "EXT-TEST-002" "EXT-TEST-003"; do
    echo ""
    echo "🏠 Buscando $ext_id..."
    
    # Hacer curl y extraer los datos relevantes
    result=$(curl -s "http://localhost:3030/v1/properties?limit=100" \
        -H "Authorization: Bearer $TOKEN" | \
        jq -r --arg ext_id "$ext_id" '
        .data[] | 
        select(.external_id == $ext_id) | 
        "   📍 ID: \(.id)
   🏷️  External ID: \(.external_id)
   🏠 Título: \(.title)
   💰 Precio: $\(.price | tonumber | . as $n | ($n | tostring) | if length > 3 then .[:length-3] + "," + .[length-3:] else . end)
   📅 Actualizado: \(.updatedAt)
   📊 Metadata: \(.metadata.csvBatch // "N/A")"
    ')
    
    if [ -n "$result" ]; then
        echo "$result"
    else
        echo "   ❌ No encontrada"
    fi
done

echo ""
echo "🗄️  ESTADO EN BASE DE DATOS:"
echo "============================"

# También verificar directamente en la base de datos
docker compose exec postgres psql -U postgres -d redatlas -c "
SELECT 
    external_id,
    SUBSTRING(title, 1, 30) || '...' as title_preview,
    price,
    TO_CHAR(updated_at, 'YYYY-MM-DD HH24:MI:SS') as last_updated,
    metadata->>'csvBatch' as csv_batch,
    metadata->>'importHistory' as import_count
FROM properties 
WHERE external_id IN ('EXT-TEST-001', 'EXT-TEST-002', 'EXT-TEST-003')
AND tenant_id = 'tenant-test'
ORDER BY external_id;
"

echo ""
echo "🔗 VERIFICACIÓN DE RELACIONES FK:"
echo "================================"

# Verificar que estas propiedades tienen listings y transacciones
docker compose exec postgres psql -U postgres -d redatlas -c "
SELECT 
    p.external_id,
    COUNT(DISTINCT l.id) as listings_count,
    COUNT(DISTINCT t.id) as transactions_count,
    CASE 
        WHEN COUNT(DISTINCT l.id) > 0 AND COUNT(DISTINCT t.id) > 0 THEN '✅ Tiene relaciones'
        WHEN COUNT(DISTINCT l.id) > 0 THEN '⚠️  Solo listings'
        WHEN COUNT(DISTINCT t.id) > 0 THEN '⚠️  Solo transactions'
        ELSE '❌ Sin relaciones'
    END as status
FROM properties p
LEFT JOIN listings l ON p.id = l.property_id
LEFT JOIN transactions t ON p.id = t.property_id
WHERE p.external_id IN ('EXT-TEST-001', 'EXT-TEST-002', 'EXT-TEST-003')
AND p.tenant_id = 'tenant-test'
GROUP BY p.external_id, p.id
ORDER BY p.external_id;
"

echo ""
echo "📋 COMANDOS PARA TESTING:"
echo "========================"
echo "1. Generar CSV de actualización:"
echo "   docker compose exec api npm run generate-csv -- --count 10 --update --use-existing-ids"
echo ""
echo "2. Subir CSV para UPSERT:"
echo "   curl -X POST \"http://localhost:3030/v1/imports\" \\"
echo "     -H \"Authorization: Bearer \$TOKEN\" \\"
echo "     -F \"file=@/app/uploads/update_properties_10_rows.csv\""
echo ""
echo "3. Volver a ejecutar este script para ver los cambios:"
echo "   ./scripts/verify-controlled-samples.sh"
echo ""

# Mostrar fecha/hora para referencia
echo "🕐 Verificación realizada: $(date)"