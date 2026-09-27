# RubriLab

[English](README.md) · **Español** · [Català](README.ca.md)

**Evidencias de aula práctica en local**

<p align="center">
  <img src="public/rubrilab-icon-transparent.png" alt="Logotipo de RubriLab" width="220">
</p>

RubriLab es una aplicación local de escritorio para organizar sesiones prácticas
de laboratorio, grupos de alumnado, asistencia y evidencias de evaluación en
educación secundaria.

El profesorado importa las listas de clase, crea una sesión cuando la necesita y
registra evidencias de equipo e individuales mientras el alumnado trabaja. La
aplicación no necesita cuenta, base de datos remota ni servicio externo: los
registros de aula se mantienen en el dispositivo.

## Funciones

- Importación CSV y JSON de clases, alumnado, identificadores escolares y grupos de laboratorio.
- Actualización de listas sin duplicados mediante identificador escolar o coincidencia por nombre dentro de la clase.
- Creación de sesiones a partir de grupos importados, con la composición guardada como instantánea de la sesión.
- Presets de evaluación de equipo e individual configurables para futuras sesiones.
- Estado de equipo, nivel de ayuda docente, resultado práctico, notas y evidencias por criterio en tiempo real.
- Registros de asistencia, observaciones individuales y comportamiento positivo o incidencias.
- Historial de sesiones con edición, borrado y reconstrucción de evidencias.
- Vista general de evaluación, revisión de cobertura, vistas por estudiante y equipo, y exportaciones CSV.
- Exportación de copia de seguridad JSON completa y espacio inicial ficticio restablecible.
- Renderizador web con capacidad sin conexión y aplicación Electron para macOS, Windows y Linux.

## Áreas de la aplicación

| Área | Finalidad |
| --- | --- |
| `Today` | Gestionar una sesión práctica abierta y registrar asistencia y evidencias durante la clase. |
| `Classes` | Importar y revisar clases, alumnado, identificadores escolares y grupos de laboratorio. |
| `History` | Crear, consultar, editar, reabrir o borrar los registros de sesiones prácticas. |
| `Assessment` | Revisar cobertura y evidencias por clase, estudiante, equipo y periodo de evaluación; exportar archivos CSV. |
| `Settings` | Gestionar presets de evaluación, exportar una copia completa o restablecer el espacio local. |

## Tecnologías

- React y TypeScript con Vinext y Vite.
- Estructura compatible con Next.js App Router y estilos globales de Tailwind CSS.
- Dexie e IndexedDB para persistencia local en el navegador.
- Validación con Zod e interfaces de repositorio que separan el dominio de la persistencia.
- Electron con puente de precarga aislado por contexto, renderizador en sandbox y sin integración de Node.js.
- Ejecutor de pruebas de Node.js y ESLint para verificación.

## Requisitos

- Node.js `22.13.0` o posterior.
- npm, usando el `package-lock.json` incluido.
- Un directorio local de datos del navegador o de Electron con permiso de escritura.

No se necesitan variables de entorno, servidor de base de datos, cuenta ni
conexión de red para el uso local habitual.

## Instalación

Clona el repositorio, entra en su directorio e instala las dependencias fijadas:

```bash
git clone https://github.com/abujalancej/rubrilab.git
cd rubrilab
npm ci
```

Si trabajas en una copia existente y necesitas actualizar intencionadamente el
archivo de bloqueo, usa `npm install` en su lugar.

## Desarrollo

Inicia la aplicación web local:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El primer inicio crea una
clase ficticia y presets de evaluación, pero no sesiones ni evidencias.

Para abrir el mismo renderizador en Electron durante el desarrollo:

```bash
npm run electron:dev
```

El asistente de Electron inicia el servidor local cuando es necesario, espera a
que esté disponible y abre RubriLab en una ventana de escritorio.

## Compilación de producción

Crea el renderizador de producción:

```bash
npm run build
```

Ejecuta el renderizador compilado localmente:

```bash
npm start
```

## Aplicación de escritorio

RubriLab se empaqueta como aplicación Electron para macOS, Windows y Linux. La
aplicación instalada inicia su renderizador local en la interfaz de bucle local;
no se necesita un servidor externo. Su renderizador utiliza aislamiento de
contexto, sandbox de procesos y la integración de Node.js está desactivada. Los
enlaces HTTPS y de correo externos se abren en el navegador del sistema, no en
la ventana de la aplicación.

Crea un paquete sin instalador para la plataforma y arquitectura actuales:

```bash
npm run electron:build
```

Crea el distribuible para la plataforma y arquitectura actuales:

```bash
npm run electron:dist
```
Los artefactos de escritorio se agrupan en `out/`: `out/mac/` en macOS,
`out/win/` en Windows y `out/linux/` en Linux. Los archivos DMG, EXE y AppImage
usan `RubriLab-<version>-<os>-<arch>.<ext>`. El empaquetado para otro sistema
operativo se realiza normalmente en ese sistema. La firma de código y la
notarización aún no están configuradas.

## Uso

1. Abre **Classes** e importa el paquete del centro en CSV o JSON. Cada fila
   debe incluir nombre, apellidos, clase y grupo de laboratorio; el
   identificador escolar es opcional. El alumnado existente se identifica
   primero por ese identificador y después por nombre dentro de la clase.
2. Abre **Settings** y revisa o crea los presets de evaluación de equipo e
   individuales que deberán estar disponibles en las futuras sesiones.
3. Abre **History**, crea una sesión práctica, selecciona la clase y los grupos
   importados, y elige los presets de evaluación para esa sesión. La
   composición del grupo se copia a la sesión y permanece como evidencia
   histórica.
4. En **Today**, registra asistencia, estado del grupo, ayuda docente,
   resultado práctico, puntuaciones por criterio, notas y observaciones
   individuales mientras impartes la clase.
5. Finaliza una sesión cuando termina el trabajo práctico. Usa **History** para
   corregir o reabrir una sesión cuando sea necesario.
6. Abre **Assessment** para revisar cobertura, asistencia, evidencias por
   estudiante y equipos de un periodo de evaluación. Exporta asistencia,
   evidencias individuales o evidencias de equipo en CSV cuando sea necesario.
7. Descarga una copia de seguridad JSON completa desde **Settings** antes de
   cambiar de dispositivo o realizar una limpieza importante de datos locales.

## Almacenamiento de datos

RubriLab **no** utiliza una base de datos remota. El renderizador web guarda los
datos en la base IndexedDB del navegador llamada `rubrilab`. La aplicación
Electron utiliza el perfil Chromium equivalente dentro del directorio de datos
por usuario de Electron.

La instantánea almacenada contiene clases, alumnado, sesiones, equipos de
sesión, asistencia, presets, criterios, observaciones, registros de ayuda,
resultados prácticos, periodos de evaluación y configuraciones de pesos. La
copia JSON exportada desde **Settings** es la copia portátil de esos datos
locales.

### Consideraciones importantes sobre los datos

- Haz una copia JSON antes de restablecer el espacio de trabajo, borrar datos
  del navegador, reinstalar la aplicación de escritorio o cambiar de dispositivo.
- Las listas importadas y las observaciones pueden contener información
  personal del alumnado; no incluyas datos reales del centro en Git ni los
  compartas públicamente.
- Los equipos de sesión son instantáneas. Los cambios posteriores de listas o
  grupos no reescriben la composición ni las evidencias de sesiones anteriores.
- La aplicación está diseñada para una instalación local, privada y de una sola
  persona. No dispone de autenticación ni sincronización multiusuario.
- Los datos privados del navegador o de Electron pueden eliminarse durante una
  limpieza del sistema. Conserva una copia exportada fuera del directorio de la
  aplicación.

## Modelo de datos

La instantánea local tiene estas colecciones de nivel superior:

```json
{
  "classrooms": [],
  "students": [],
  "sessions": [],
  "teams": [],
  "attendance": [],
  "presets": [],
  "criteria": [],
  "teamObservations": [],
  "individualObservations": [],
  "behaviourObservations": [],
  "teacherAssistance": [],
  "practicalResults": [],
  "assessmentPeriods": [],
  "weightConfigurations": []
}
```

Un estudiante pertenece a una clase y puede incluir un identificador escolar y
un grupo de laboratorio opcionales. Una sesión registra la clase, asignatura,
estado, presets de equipo e individuales seleccionados y su propia composición
de equipos congelada. La ausencia de una puntuación significa **no observado**;
el cero no es una puntuación válida.

## Estructura del proyecto

```text
rubrilab/
├── app/                       # Punto de entrada, metadatos, manifiesto y estilos globales
├── electron/                  # Proceso principal seguro de Electron y puente de precarga
├── public/                    # Service worker y recursos de marca de RubriLab
├── scripts/                   # Ayudantes de desarrollo, empaquetado e iconos de Electron
├── src/
│   ├── data/                  # Persistencia Dexie, repositorios, datos iniciales e importación de listas
│   ├── domain/                # Modelo TypeScript y contratos de validación Zod
│   └── ui/                    # Espacios React, diálogos y hook de datos locales
├── tests/                     # Comprobaciones del renderizador y de la arquitectura
├── worker/                    # Punto de entrada del worker para la compilación web
├── package.json               # Scripts de la aplicación y configuración de Electron Builder
└── README.es.md               # Documentación del proyecto en castellano
```

La interfaz accede a los datos locales mediante las interfaces de repositorio
de `src/data/`; el modelo de dominio y los contratos de validación permanecen
separados en `src/domain/`.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor local de desarrollo Vinext en el puerto `3000`. |
| `npm run build` | Crea el renderizador web de producción en `dist/`. |
| `npm start` | Inicia el renderizador local compilado. |
| `npm run electron:dev` | Inicia el renderizador si es necesario y lo abre en Electron. |
| `npm run electron:build` | Compila el renderizador y crea un paquete Electron sin instalador para la plataforma actual. |
| `npm run electron:dist` | Compila el renderizador y crea el distribuible de la plataforma actual. |
| `npm run lint` | Ejecuta ESLint, excluyendo la salida de compilación generada. |
| `npm test` | Compila el renderizador y ejecuta la suite de pruebas de Node.js. |

## Validación

Antes de confirmar cambios de código, ejecuta:

```bash
npm run lint
npm test
```

Para una distribución de escritorio, crea además el artefacto de destino y
prueba la aplicación generada en ese sistema operativo:

```bash
npm run electron:dist
```
