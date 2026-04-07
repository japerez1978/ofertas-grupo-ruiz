#!/bin/bash
NOTION_TOKEN="ntn_Q33542142115rJgjJPtGLc7wKl7uDX5DYRO7Q3w64zR4Cx"
PAGE_ID="3390c7ed-3f43-8185-9649-e43af09e90dc"
API="https://api.notion.com/v1/blocks/${PAGE_ID}/children"

append() {
  curl -s -X PATCH "$API" \
    -H "Authorization: Bearer $NOTION_TOKEN" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d "$1" > /dev/null
}

# Intro
append '{
  "children": [
    {"object":"block","type":"callout","callout":{"rich_text":[{"text":{"content":"Este manual explica cómo usar el Panel de Administración de LeadsToDeals para gestionar empresas, usuarios, acceso a apps y facturación."}}],"icon":{"emoji":"💡"}}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"URL: "},{"annotations":{"bold":false}},{"text":{"content":"http://localhost:5175"},"annotations":{"code":true}},{"text":{"content":" (desarrollo) — Pendiente desplegar en Vercel"}}]}},
    {"object":"block","type":"divider","divider":{}}
  ]
}'

# Acceso
append '{
  "children": [
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"🔐 Acceso al Panel"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Solo los usuarios con rol superadmin pueden acceder. Si un usuario sin este rol intenta entrar, verá una pantalla de \"Acceso denegado\"."}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Pasos para acceder"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Abre la URL del panel de administración"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Introduce tu email (el mismo de la app de Ofertas)"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Introduce tu contraseña"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Si tienes rol superadmin, accederás al Dashboard"}}]}},
    {"object":"block","type":"callout","callout":{"rich_text":[{"text":{"content":"⚠️ Si ves \"Acceso denegado\", contacta al administrador del sistema para que te asigne el rol superadmin en la base de datos."}}],"icon":{"emoji":"⚠️"}}},
    {"object":"block","type":"divider","divider":{}}
  ]
}'

# Dashboard
append '{
  "children": [
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"📊 Dashboard"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Vista general de la plataforma con métricas clave. Se actualiza en tiempo real cada vez que entras."}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Tarjetas KPI"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"🏢 Empresas — Número total de tenants registrados"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"👤 Usuarios — Número total de usuarios activos en la plataforma"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"📦 Suscripciones — Planes actualmente activos"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"💰 MRR — Monthly Recurring Revenue: ingresos mensuales recurrentes totales"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Tabla de empresas"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Debajo de las tarjetas verás una tabla con todas las empresas, su subdominio y si están vinculadas con Stripe."}}]}},
    {"object":"block","type":"divider","divider":{}}
  ]
}'

# Empresas
append '{
  "children": [
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"🏢 Empresas (Tenants)"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Gestión completa de las empresas/clientes que usan la plataforma."}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Crear una nueva empresa"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en el botón azul \"+ Nueva empresa\" (esquina superior derecha)"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Rellena el Nombre (ej: \"Saltoki\")"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Rellena el Subdominio/slug (ej: \"saltoki\") — identificador único sin espacios"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en \"Guardar\""}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Editar una empresa"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en el icono de lápiz (✏️) en la fila de la empresa"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Modifica los campos deseados"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en \"Guardar\""}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Eliminar una empresa"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en el icono de papelera (🗑️) en la fila"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Confirma la eliminación en el diálogo"}}]}},
    {"object":"block","type":"callout","callout":{"rich_text":[{"text":{"content":"⚠️ Eliminar una empresa borra TODOS sus datos asociados (usuarios, suscripciones, etc.)"}}],"icon":{"emoji":"🚨"}}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Columnas de la tabla"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"ID — Identificador único de la empresa"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Nombre — Nombre comercial"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Subdominio — Slug único (se usa internamente para identificar)"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Apps contratadas — Badges con las apps activas de la empresa"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Stripe — ✓ si está vinculada con Stripe, — si no"}}]}},
    {"object":"block","type":"divider","divider":{}}
  ]
}'

# Usuarios
append '{
  "children": [
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"👤 Usuarios"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Gestión de usuarios: crear, eliminar, asignar empresa y controlar a qué apps tiene acceso cada uno."}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Crear un nuevo usuario"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en \"+ Nuevo usuario\""}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Email — Dirección de correo del usuario"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Contraseña — Mínimo 6 caracteres"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Empresa — Selecciona a qué tenant pertenece"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Rol — user (básico), admin (gestión), superadmin (acceso total)"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en \"Crear usuario\""}}]}},
    {"object":"block","type":"callout","callout":{"rich_text":[{"text":{"content":"💡 Después de crear el usuario, recuerda asignarle acceso a las apps usando el botón de gestión de acceso."}}],"icon":{"emoji":"💡"}}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Gestionar acceso a apps"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Controla qué aplicaciones puede usar cada usuario:"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en el icono de app (📱) en la fila del usuario"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Se abre un modal con las 2 apps disponibles"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en \"Dar acceso\" (verde) para activar, o \"Quitar acceso\" (rojo) para revocar"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Los cambios se aplican inmediatamente"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Roles explicados"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"user — Acceso básico a las apps asignadas"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"admin — Puede gestionar datos dentro de su empresa"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"superadmin — Acceso al Panel de Administración + gestión total"}}]}},
    {"object":"block","type":"divider","divider":{}}
  ]
}'

# Facturación
append '{
  "children": [
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"💳 Facturación"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Gestión de suscripciones y cobros. Vista del MRR (Monthly Recurring Revenue) y estado de cada empresa."}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Métricas principales"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"💰 MRR Total — Suma de todos los planes activos"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"📊 Suscripciones activas — Número de planes en estado \"activo\""}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"🏢 Clientes facturando — Empresas con al menos un plan activo"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Contratar un plan para una empresa"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Busca la empresa en la lista"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en \"💳 Añadir plan\""}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Se abre un modal con las 2 tarjetas de pricing:"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"📊 Ofertas HubSpot — 99€/mes (gestión ofertas, scoring, PDF, backlog)"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"🔧 Gestión SAT — 49€/mes (SATs, historial, fotos, Excel)"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Clic en \"Contratar\" en el plan deseado"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"La suscripción se activa inmediatamente"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Cancelar una suscripción"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"En la tabla de suscripciones de la empresa, clic en \"Cancelar\""}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"Confirma en el diálogo"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"El estado cambia a \"cancelado\" y deja de contar para el MRR"}}]}},
    {"object":"block","type":"divider","divider":{}}
  ]
}'

# Flujo nuevo cliente
append '{
  "children": [
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"🚀 Flujo Completo: Dar de Alta a un Nuevo Cliente"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Pasos para incorporar una nueva empresa a la plataforma desde cero:"}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"🏢 Ir a Empresas → \"+ Nueva empresa\" → rellenar nombre y slug"},"annotations":{"bold":true}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"👤 Ir a Usuarios → \"+ Nuevo usuario\" → email + contraseña + seleccionar la empresa + rol"},"annotations":{"bold":true}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"📱 En la fila del usuario → icono app → \"Dar acceso\" a las apps contratadas"},"annotations":{"bold":true}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"💳 Ir a Facturación → empresa → \"Añadir plan\" → seleccionar plan"},"annotations":{"bold":true}}]}},
    {"object":"block","type":"numbered_list_item","numbered_list_item":{"rich_text":[{"text":{"content":"✉️ Enviar al cliente su email y contraseña + URL de la app"},"annotations":{"bold":true}}]}},
    {"object":"block","type":"callout","callout":{"rich_text":[{"text":{"content":"✅ ¡Listo! El cliente ya puede entrar a su app con sus credenciales y solo verá los datos de su empresa."}}],"icon":{"emoji":"🎉"}}}
  ]
}'

echo "✅ Manual de uso escrito en Notion"
