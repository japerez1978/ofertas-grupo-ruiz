#!/bin/bash
# Script para escribir documentación en Notion
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

# Bloque 1: Cabecera + Migración Multi-Tenant
append '{
  "children": [
    {"object":"block","type":"heading_1","heading_1":{"rich_text":[{"text":{"content":"📋 LeadsToDeals — Documentación 5 Abril 2026"}}]}},
    {"object":"block","type":"divider","divider":{}},
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"1. Migración Multi-Tenant Supabase"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Se creó un único proyecto Supabase centralizado (leadstodeals-multitenant) que aloja TODAS las aplicaciones. Antes cada app tenía su propio proyecto independiente."}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Datos del nuevo proyecto"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Nombre: leadstodeals-multitenant"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"URL: https://tpgbbriohvsamnfxhbgk.supabase.co"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Tablas creadas para multi-tenancy"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"tenants — Empresas/clientes (id, nombre, subdominio, stripe_customer_id)"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"tenant_users — Vinculación usuario ↔ empresa (auth_user_id, tenant_id, email, rol)"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"tenant_apps — Apps disponibles por empresa (tenant_id, app_slug, activa)"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"subscriptions — Suscripciones/facturación (tenant_id, estado, precio_mes, stripe_subscription_id)"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"user_app_access — Control granular de acceso a apps por usuario"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Tenants registrados"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"ID 1 — Intranox (subdominio: intranox) — Empresa principal"},"annotations":{"bold":true}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"ID 5 — Saltoki (subdominio: saltoki) — Cliente"},"annotations":{"bold":true}}]}}
  ]
}'

# Bloque 2: SATs Saltoki
append '{
  "children": [
    {"object":"block","type":"divider","divider":{}},
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"2. Integración SATs Saltoki"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"App de gestión de SATs integrada en el proyecto multi-tenant. Requiere autenticación para acceder."}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Repositorio"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"GitHub: japerez1978/sats-saltoki"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Último commit: 9566cf1"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Archivos modificados"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":".env.local — Credenciales nuevo Supabase"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"src/AuthGate.jsx — Login obligatorio con Supabase Auth"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"src/main.jsx — App envuelta con AuthGate"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"src/App.jsx — Botón logout añadido"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Usuario SATs"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Email: nuri.pereda@gmail.com"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"UUID: 8bc876c3-c04f-49ad-abea-1d029cb7dd7c"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Tenant: Saltoki (ID: 5) | Rol: admin"}}]}}
  ]
}'

# Bloque 3: Migración fotos
append '{
  "children": [
    {"object":"block","type":"divider","divider":{}},
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"3. Migración de Fotos al Nuevo Storage"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Script migrate-photos.mjs descarga fotos del proyecto viejo y las sube al nuevo Storage. Actualiza automáticamente las URLs en la BD."}}]}},
    {"object":"block","type":"callout","callout":{"rich_text":[{"text":{"content":"✅ Migradas: 8 fotos | ❌ Fallidas: 0 fotos"}}],"icon":{"emoji":"📸"}}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"SAT #1290 — 1 foto"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"SAT #1291 — 1 foto"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"SAT #1298 — 1 foto"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"SAT #1312 — 3 fotos"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"SAT #1315 — 2 fotos"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Bucket: sat-fotos (público, RLS para usuarios autenticados)"}}]}}
  ]
}'

# Bloque 4: Panel Admin
append '{
  "children": [
    {"object":"block","type":"divider","divider":{}},
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"4. Panel de Administración (leadstodeals-admin)"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"App separada creada con React + Vite. Solo accesible por usuarios con rol superadmin. Dark theme premium."}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Info del proyecto"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Stack: React + Vite + Supabase + React Router + Lucide Icons"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Puerto local: 5175"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"Acceso: Solo rol superadmin"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Secciones del panel"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"📊 Dashboard — KPIs: Empresas, Usuarios, Suscripciones, MRR"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"🏢 Empresas — CRUD de tenants (nombre, subdominio, apps, Stripe)"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"👤 Usuarios — CRUD usuarios + asignar apps + gestionar roles"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"💳 Facturación — MRR, suscripciones por empresa, contratar/cancelar planes"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Planes de pricing"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"📊 Ofertas HubSpot — 99€/mes"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"🔧 Gestión SAT — 49€/mes"}}]}}
  ]
}'

# Bloque 5: Control de acceso + Stripe + Seguridad
append '{
  "children": [
    {"object":"block","type":"divider","divider":{}},
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"5. Control de Acceso por App"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Tabla user_app_access controla qué usuario accede a qué app. Si no tiene fila para una app, no puede entrar."}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"juan.angel.perez@icloud.com → Intranox → ofertas_hubspot ✅"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"nuri.pereda@gmail.com → Saltoki → sat_gestion ✅"}}]}},
    {"object":"block","type":"divider","divider":{}},
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"6. Integración Stripe (preparado)"}}]}},
    {"object":"block","type":"callout","callout":{"rich_text":[{"text":{"content":"Estado: 🟡 Preparado. Cuenta creada, keys obtenidas. Falta crear productos y serverless functions."}}],"icon":{"emoji":"💳"}}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"PK Test: pk_test_51TIxxeQ23JAkKom850s..."}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"SK Test: sk_test_51TIxxeQ23JAkKom8xSry..."}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Pendiente Stripe"}}]}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Crear productos en Stripe Dashboard (Ofertas 99€, SAT 49€)"}}],"checked":false}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Implementar Stripe Checkout (serverless functions)"}}],"checked":false}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Implementar webhooks para sincronizar pagos"}}],"checked":false}},
    {"object":"block","type":"to_do","to_do":{"to_do":{"rich_text":[{"text":{"content":"Implementar Customer Portal"}}],"checked":false}},"to_do":{"rich_text":[{"text":{"content":"Implementar Customer Portal"}}],"checked":false}}
  ]
}'

# Bloque 6: Seguridad RLS
append '{
  "children": [
    {"object":"block","type":"divider","divider":{}},
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"7. Seguridad — Políticas RLS"}}]}},
    {"object":"block","type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Todas las tablas usan Row Level Security. Función clave: get_user_role() con SECURITY DEFINER para evitar referencia circular."}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"tenants → Superadmin ve todo"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"tenant_users → Usuario ve su fila + Superadmin ve todo"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"subscriptions → Superadmin ve todo"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"user_app_access → Usuario ve su acceso + Superadmin gestiona"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"sats → Aislamiento por tenant_id"}}]}},
    {"object":"block","type":"divider","divider":{}},
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"8. Credenciales y Referencias"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Usuarios Supabase Auth"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"juan.angel.perez@icloud.com — Intranox — superadmin — Admin2025"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"nuri.pereda@gmail.com — Saltoki — admin — 12345"}}]}},
    {"object":"block","type":"heading_3","heading_3":{"rich_text":[{"text":{"content":"Repositorios"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"intranox-ofertas → japerez1978/ofertas-grupo-ruiz"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"sats-saltoki → japerez1978/sats-saltoki"}}]}},
    {"object":"block","type":"bulleted_list_item","bulleted_list_item":{"rich_text":[{"text":{"content":"leadstodeals-admin → Pendiente crear repo"}}]}}
  ]
}'

# Bloque 7: Próximos pasos
append '{
  "children": [
    {"object":"block","type":"divider","divider":{}},
    {"object":"block","type":"heading_2","heading_2":{"rich_text":[{"text":{"content":"📌 Próximos Pasos"}}]}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Crear repo GitHub para leadstodeals-admin y desplegarlo en Vercel"}}],"checked":false}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Crear productos en Stripe Dashboard (Ofertas 99€, SAT 49€)"}}],"checked":false}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Implementar Stripe Checkout con serverless functions"}}],"checked":false}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Implementar webhooks de Stripe para sincronizar pagos"}}],"checked":false}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Verificar user_app_access en cada app cliente"}}],"checked":false}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Eliminar los 2 proyectos Supabase antiguos"}}],"checked":false}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Cambiar contraseña de nuri.pereda@gmail.com (actualmente 12345)"}}],"checked":false}},
    {"object":"block","type":"to_do","to_do":{"rich_text":[{"text":{"content":"Actualizar variables de entorno en Vercel para ofertas-grupo-ruiz"}}],"checked":false}}
  ]
}'

echo "✅ Documentación sincronizada con Notion"
