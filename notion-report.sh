#!/bin/bash
# Script para reportar fixes recientes en Notion
NOTION_TOKEN="ntn_Q33542142115rJgjJPtGLc7wKl7uDX5DYRO7Q3w64zR4Cx"
PAGE_ID="3390c7ed-3f43-803d-8875-f3cf0ebe58c2"
API="https://api.notion.com/v1/blocks/${PAGE_ID}/children"

append() {
  curl -s -X PATCH "$API" \
    -H "Authorization: Bearer $NOTION_TOKEN" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d "$1" > /dev/null
}

# Bloque: Fixes de la Sesión (9 Abril 2026)
append '{
  "children": [
    {"object":"block","type":"divider","divider":{}},
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"🛠️ Fixes y Mejoras — 9 Abril 2026"}}]}},
    {"object":"block","type":"callout","callout":{"rich_text":[{"text":{"content":"Sesión enfocada en resolver bugs de UI críticos y persistencia de configuración en el entorno multi-tenant."}}],"icon":{"emoji":"🔧"}}},
    
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"1. Bug del Calendario (DatePickerCustom)"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Problema: "},"annotations":{"bold":true}},{"text":{"content":"El dropdown del calendario se cortaba o era invisible debido al overflow:hidden y stacking context de los contenedores glass-card."}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Solución: "},"annotations":{"bold":true}},{"text":{"content":"Implementación de "},"annotations":{"bold":false}},{"text":{"content":"React Portals"},"annotations":{"code":true}},{"text":{"content":" para renderizar el calendario al nivel del body, garantizando visibilidad total y posicionamiento dinámico absoluto."}}]}},
    
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"2. Persistencia de Matrices de Scoring"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Problema: "},"annotations":{"bold":true}},{"text":{"content":"Las matrices de scoring no se guardaban en Supabase (error 42501) debido a la falta de políticas RLS adecuadas en la nueva base de datos multi-tenant."}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Solución: "},"annotations":{"bold":true}},{"text":{"content":"Configuración de políticas "},"annotations":{"bold":false}},{"text":{"content":"RLS (SELECT, INSERT, UPDATE)"},"annotations":{"code":true}},{"text":{"content":" filtradas por "},"annotations":{"bold":false}},{"text":{"content":"tenant_id"},"annotations":{"code":true}},{"text":{"content":", asegurando aislamiento total entre empresas y persistencia correcta de la configuración."}}]}},

    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"3. Sync de Fecha de Envío"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Ajuste en la respuesta del "},"annotations":{"bold":false}},{"text":{"content":"patchOferta"},"annotations":{"code":true}},{"text":{"content":" para escribir tanto en "},"annotations":{"bold":false}},{"text":{"content":"fecha_envio_oferta"},"annotations":{"code":true}},{"text":{"content":" como en "},"annotations":{"bold":false}},{"text":{"content":"fecha_de_envio_oferta"},"annotations":{"code":true}},{"text":{"content":" por compatibilidad con propiedades personalizadas de HubSpot."}}]}}
  ]
}'

echo "✅ Reporte de bugs sincronizado con Notion"
