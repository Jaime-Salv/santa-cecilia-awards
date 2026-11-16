# Santa Cecilia Awards 2026

Web de los premios de Santa Cecilia de la banda.

## Desarrollo

Requisitos: Node.js 22.

```bash
npm install
npm run dev
```

Para compilar: `npm run build` (salida en `dist/`).

## Despliegue Netlify

Sitio reservado: https://santaceciliaawards.netlify.app

Vincular el repositorio `Jaime-Salv/santa-cecilia-awards` a **ese sitio existente**, sin crear otro. Ajustes: rama `main`, comando `npm run build`, carpeta `dist`.

## Estado actual

- Portada y presentación de los premios (contenido de demostración, trofeos representados provisionalmente).
- Nominados pendientes de incorporar desde la documentación oficial.
- Votaciones cerradas y sin backend conectado. **No se reciben votos reales.**
- Supabase: pendiente de crear un proyecto separado, configurar políticas RLS y conectar la web.

## Seguridad de votaciones

El DNI introducido por sí solo no prueba identidad. Para garantizar un voto por músico y categoría se necesitará un padrón autorizado, un mecanismo de autenticación adicional, una restricción única en base de datos y políticas de acceso para impedir consultas de resultados antes de la gala. Evitar guardar o exponer DNIs en claro.

## Variables de entorno previstas

`VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Las claves secretas de Supabase nunca deben exponerse mediante variables `VITE_` ni subirse al repositorio.
