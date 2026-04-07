# 📋 LeadsToDeals — Documentación Sesión 5 Abril 2026

## Índice
1. [Migración Multi-Tenant Supabase](#1-migración-multi-tenant-supabase)
2. [Integración SATs Saltoki](#2-integración-sats-saltoki)
3. [Migración de Fotos al Nuevo Storage](#3-migración-de-fotos-al-nuevo-storage)
4. [Panel de Administración (leadstodeals-admin)](#4-panel-de-administración)
5. [Control de Acceso por App (user_app_access)](#5-control-de-acceso-por-app)
6. [Integración Stripe (preparado)](#6-integración-stripe)
7. [Esquema de Base de Datos Final](#7-esquema-de-base-de-datos-final)
8. [Credenciales y Referencias](#8-credenciales-y-referencias)

---

## 1. Migración Multi-Tenant Supabase

### Contexto
Antes: cada aplicación (Ofertas Intranox, SATs Saltoki) tenía su propio proyecto Supabase independiente. Esto generaba costos innecesarios y dificultaba la gestión centralizada.

### Cambio realizado
Se creó un **único proyecto Supabase** centralizado: `leadstodeals-multitenant` que aloja TODAS las aplicaciones.

| Concepto | Antes | Después |
|---|---|---|
| Proyectos Supabase | 2+ independientes | 1 centralizado |
| Aislamiento de datos | Por proyecto separado | Por RLS + tenant_id |
| Gestión de usuarios | Manual en cada proyecto | Centralizada con roles |

### Datos del nuevo proyecto
- **Nombre:** `leadstodeals-multitenant`
- **URL:** `https://tpgbbriohvsamnfxhbgk.supabase.co`
- **Anon Key:** `[OCULTO_POR_SEGURIDAD]`

### Tablas creadas para multi-tenancy

```sql
-- Tabla de empresas/clientes
tenants (id, nombre, subdominio, stripe_customer_id, created_at)

-- Vinculación usuario ↔ empresa
tenant_users (id, auth_user_id, tenant_id, email, rol)

-- Apps disponibles por empresa
tenant_apps (id, tenant_id, app_slug, activa)

-- Módulos de cada app
app_modules (id, tenant_app_id, modulo, activo)

-- Suscripciones/facturación
subscriptions (id, tenant_id, estado, precio_mes, inicio, app_slug, stripe_subscription_id, stripe_price_id, current_period_end)
```

### Tenants registrados

| ID | Nombre | Subdominio | Rol |
|---|---|---|---|
| 1 | Intranox | `intranox` | Empresa principal |
| 5 | Saltoki | `saltoki` | Cliente |

---

## 2. Integración SATs Saltoki

### Repositorio
- **Carpeta local:** `/Users/juanangel/Documents/LeadsToDeals/PROYECTOS SAAS/sats-saltoki`
- **GitHub:** `japerez1978/sats-saltoki`
- **Último commit:** `9566cf1` — `chore: añadir script migración fotos + dependencias actualizadas`

### Archivos modificados/creados

#### `.env.local` (creado)
```env
VITE_SUPABASE_URL=https://tpgbbriohvsamnfxhbgk.supabase.co
VITE_SUPABASE_ANON_KEY=[OCULTO_POR_SEGURIDAD]
```

#### `src/AuthGate.jsx` (creado)
- Componente que envuelve la app con pantalla de login
- Requiere autenticación antes de mostrar la aplicación
- Formulario con email/contraseña + botón de logout

#### `src/main.jsx` (modificado)
- Se envolvió `<App />` con `<AuthGate>` para forzar el login

#### `src/App.jsx` (modificado)
- Se añadió botón de logout en la barra superior

### Usuario de la app SATs

| Campo | Valor |
|---|---|
| Email | `nuri.pereda@gmail.com` |
| Contraseña | `12345` |
| UUID | `8bc876c3-c04f-49ad-abea-1d029cb7dd7c` |
| Tenant | Saltoki (ID: 5) |
| Rol | admin |

### Despliegue Vercel
- Variables de entorno actualizadas en Vercel para apuntar al nuevo Supabase
- Necesita `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas

---

## 3. Migración de Fotos al Nuevo Storage

### Problema
Las fotos de los SATs estaban almacenadas en el Storage del proyecto Supabase **viejo** (`bcyplfymmtmrbylmilit`). Necesitaban moverse al proyecto nuevo.

### Solución
Se creó el script `migrate-photos.mjs` que:
1. Se autentica en el nuevo proyecto Supabase
2. Lee los SATs que tienen fotos (URLs del proyecto viejo)
3. Descarga cada foto del proyecto viejo
4. La sube al Storage del proyecto nuevo (bucket `sat-fotos`)
5. Actualiza la URL en la base de datos

### Resultado de la migración
```
✅ Migradas: 8 fotos
❌ Fallidas: 0 fotos
```

### SATs migrados
- SAT #1290 — 1 foto
- SAT #1291 — 1 foto
- SAT #1298 — 1 foto
- SAT #1312 — 3 fotos
- SAT #1315 — 2 fotos

### Bucket configurado
- **Nombre:** `sat-fotos`
- **Público:** Sí
- **RLS:** Usuarios autenticados pueden leer/escribir

---

## 4. Panel de Administración

### Información del proyecto

| Campo | Valor |
|---|---|
| Nombre | `leadstodeals-admin` |
| Carpeta | `/Users/juanangel/Documents/LeadsToDeals/PROYECTOS SAAS/leadstodeals-admin` |
| Stack | React + Vite + Supabase + React Router |
| Puerto local | `5175` |
| Acceso | Solo usuarios con rol `superadmin` |

### Estructura de archivos
```
leadstodeals-admin/
├── .env.local                    # Supabase + Stripe keys
├── src/
│   ├── main.jsx                  # Entry point con BrowserRouter
│   ├── App.jsx                   # Auth gate + Sidebar + Routes
│   ├── supabase.js               # Cliente Supabase
│   ├── index.css                 # Design system dark theme
│   └── pages/
│       ├── LoginPage.jsx         # Login premium dark
│       ├── DashboardPage.jsx     # Stats + tabla tenants
│       ├── TenantsPage.jsx       # CRUD empresas
│       ├── UsersPage.jsx         # CRUD usuarios + acceso apps
│       └── BillingPage.jsx       # Suscripciones + pricing
```

### Secciones del panel

#### 📊 Dashboard
- 4 tarjetas KPI: Empresas, Usuarios, Suscripciones, MRR
- Tabla resumen de empresas con estado de Stripe

#### 🏢 Empresas
- Lista de todos los tenants
- Crear/editar/eliminar empresa
- Ver apps contratadas por empresa
- Estado de vinculación con Stripe

#### 👤 Usuarios
- Lista de usuarios con empresa, rol y apps asignadas
- **Crear usuario:** crea en Supabase Auth + vincula a tenant
- **Gestionar acceso:** modal para activar/desactivar apps por usuario
- Roles: `user`, `admin`, `superadmin`

#### 💳 Facturación
- MRR total y desglose por empresa
- Contratar plan por empresa (modal con pricing cards)
- Cancelar suscripciones
- Planes disponibles:
  - 📊 Ofertas HubSpot — **99€/mes**
  - 🔧 Gestión SAT — **49€/mes**

### Diseño
- **Dark theme** premium con glassmorphism
- Tipografía: Inter (Google Fonts)
- Colores: Indigo (#6366f1) como accent, slates para fondos
- Componentes: modales, badges, toasts, tablas, stat cards
- Sidebar fija con navegación + branding L2D

---

## 5. Control de Acceso por App

### Tabla `user_app_access`
```sql
CREATE TABLE user_app_access (
  id SERIAL PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id INTEGER REFERENCES tenants(id),
  app_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(auth_user_id, app_slug)
);
```

### Cómo funciona
Cada usuario tiene una fila por app a la que tiene acceso:

| Usuario | Empresa | App | Resultado |
|---|---|---|---|
| juan.angel.perez@icloud.com | Intranox | `ofertas_hubspot` | ✅ Puede entrar a Ofertas |
| nuri.pereda@gmail.com | Saltoki | `sat_gestion` | ✅ Puede entrar a SATs |
| nuri.pereda@gmail.com | Saltoki | `ofertas_hubspot` | ❌ No tiene fila → no puede |

### Apps registradas

| Slug | Nombre | Precio |
|---|---|---|
| `ofertas_hubspot` | Ofertas HubSpot | 99€/mes |
| `sat_gestion` | Gestión SAT | 49€/mes |

---

## 6. Integración Stripe

### Estado: 🟡 Preparado (falta Checkout + Webhooks)

### Cuenta Stripe

| Campo | Valor |
|---|---|
| Publishable Key (test) | `pk_test_...` |
| Secret Key (test) | `sk_test_...` |

### Campos añadidos a la BD
```sql
-- En tabla tenants
stripe_customer_id TEXT  -- ID del cliente en Stripe

-- En tabla subscriptions
stripe_subscription_id TEXT  -- ID de suscripción en Stripe
stripe_price_id TEXT         -- ID del precio en Stripe
current_period_end TIMESTAMPTZ  -- Fin del periodo actual
app_slug TEXT                -- App asociada a la suscripción
```

### Pendiente para completar Stripe
1. **Crear productos en Stripe Dashboard:**
   - Ofertas HubSpot → 99€/mes (recurrente)
   - Gestión SAT → 49€/mes (recurrente)
2. **Crear Vercel Serverless Functions:**
   - `api/create-checkout.js` — Crear sesión de checkout
   - `api/stripe-webhook.js` — Recibir eventos (pago exitoso, cancelación, etc.)
   - `api/customer-portal.js` — Portal de gestión para el cliente
3. **Conectar el botón "Contratar" del admin panel** con Stripe Checkout

---

## 7. Esquema de Base de Datos Final

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE: leadstodeals-multitenant            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────────┐   │
│  │ tenants  │────→│ tenant_users │     │ user_app_access  │   │
│  │          │     │              │     │                  │   │
│  │ id       │     │ auth_user_id │────→│ auth_user_id     │   │
│  │ nombre   │     │ tenant_id    │     │ tenant_id        │   │
│  │ subdom.  │     │ email        │     │ app_slug         │   │
│  │ stripe_id│     │ rol          │     └──────────────────┘   │
│  └──────────┘     └──────────────┘                             │
│       │                                                         │
│       │           ┌──────────────┐     ┌──────────────────┐   │
│       └──────────→│ tenant_apps  │     │  subscriptions   │   │
│                   │              │     │                  │   │
│                   │ app_slug     │     │ tenant_id        │   │
│                   │ activa       │     │ app_slug         │   │
│                   └──────────────┘     │ estado           │   │
│                         │              │ precio_mes       │   │
│                   ┌─────┘              │ stripe_sub_id    │   │
│                   │                    └──────────────────┘   │
│              ┌────▼─────────┐                                  │
│              │ app_modules  │                                  │
│              │              │     ┌──────────────────┐        │
│              │ modulo       │     │      sats        │        │
│              │ activo       │     │ (tenant_id = 5)  │        │
│              └──────────────┘     └──────────────────┘        │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Storage: sat-fotos (bucket público, RLS autenticados) │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Políticas RLS activas

| Tabla | Policy | Lógica |
|---|---|---|
| `tenants` | Superadmin see all | `get_user_role() = 'superadmin'` |
| `tenant_users` | Superadmin manage | `auth_user_id = auth.uid() OR get_user_role() = 'superadmin'` |
| `subscriptions` | Superadmin manage | `get_user_role() = 'superadmin'` |
| `tenant_apps` | Superadmin see apps | `get_user_role() = 'superadmin'` |
| `user_app_access` | Superadmin full + User own | `auth_user_id = auth.uid() OR get_user_role() = 'superadmin'` |
| `sats` | Tenant isolation | `tenant_id = get_user_tenant_id()` |

### Función clave: `get_user_role()`
```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM tenant_users 
  WHERE auth_user_id = auth.uid() 
  LIMIT 1;
$$;
```
> ⚠️ Usa `SECURITY DEFINER` para evitar la referencia circular de RLS (una policy que consulta su propia tabla).

---

## 8. Credenciales y Referencias

### Usuarios en Supabase Auth

| Email | UUID | Tenant | Rol | Contraseña |
|---|---|---|---|---|
| `juan.angel.perez@icloud.com` | `8856d947-3b08-4062-bd6a-6e55508a96c8` | Intranox (1) | superadmin | `Admin2025` |
| `nuri.pereda@gmail.com` | `8bc876c3-c04f-49ad-abea-1d029cb7dd7c` | Saltoki (5) | admin | `12345` |

### Repositorios Git

| Repo | Carpeta local | GitHub |
|---|---|---|
| intranox-ofertas | `/PROYECTOS SAAS/intranox-ofertas` | `japerez1978/ofertas-grupo-ruiz` |
| sats-saltoki | `/PROYECTOS SAAS/sats-saltoki` | `japerez1978/sats-saltoki` |
| leadstodeals-admin | `/PROYECTOS SAAS/leadstodeals-admin` | *Pendiente de crear repo* |

### Vercel

| Proyecto | URL | Repo vinculado |
|---|---|---|
| ofertas-grupo-ruiz | `ofertas-grupo-ruiz.vercel.app` | `ofertas-grupo-ruiz` |
| sats-saltoki | *Pendiente verificar* | `sats-saltoki` |

### Variables de entorno necesarias por app

#### intranox-ofertas
```
VITE_SUPABASE_URL=https://tpgbbriohvsamnfxhbgk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_TENANT_SLUG=intranox
```

#### sats-saltoki
```
VITE_SUPABASE_URL=https://tpgbbriohvsamnfxhbgk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

#### leadstodeals-admin
```
VITE_SUPABASE_URL=https://tpgbbriohvsamnfxhbgk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PK=pk_test_51TIxxeQ23JAkKom...
```

---

## 📌 Próximos pasos

- [ ] Crear repo GitHub para `leadstodeals-admin` y desplegarlo en Vercel
- [ ] Crear productos en Stripe Dashboard (Ofertas 99€, SAT 49€)
- [ ] Implementar Stripe Checkout (serverless functions)
- [ ] Implementar webhooks de Stripe para sincronizar pagos
- [ ] Implementar verificación de `user_app_access` en cada app cliente
- [ ] Eliminar los 2 proyectos Supabase antiguos
- [ ] Cambiar contraseña de `nuri.pereda@gmail.com` (actualmente `12345`)
- [ ] Actualizar variables de entorno en Vercel para ofertas-grupo-ruiz
