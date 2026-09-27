# RubriLab

[English](README.md) · [Español](README.es.md) · **Català**

**Evidència d'aula pràctica en local**

<p align="center">
  <img src="public/rubrilab-icon-transparent.png" alt="Logotip de RubriLab" width="220">
</p>

RubriLab és una aplicació local d'escriptori per organitzar sessions pràctiques
de laboratori, grups d'alumnat, assistència i evidències d'avaluació a
l'educació secundària.

El professorat importa les llistes de classe, crea una sessió quan la necessita
i registra evidències d'equip i individuals mentre l'alumnat treballa.
L'aplicació no necessita cap compte, base de dades remota ni servei extern: els
registres d'aula es mantenen al dispositiu.

## Funcionalitats

- Importació CSV i JSON de classes, alumnat, identificadors escolars i grups de laboratori.
- Actualització de llistes sense duplicats mitjançant l'identificador escolar o la coincidència per nom dins de la classe.
- Creació de sessions a partir de grups importats, amb la composició desada com a instantània de la sessió.
- Presets d'avaluació d'equip i individual configurables per a sessions futures.
- Estat d'equip, nivell d'ajuda docent, resultat pràctic, notes i evidències per criteri en temps real.
- Registres d'assistència, observacions individuals i comportament positiu o incidències.
- Historial de sessions amb edició, eliminació i reconstrucció d'evidències.
- Vista general d'avaluació, revisió de cobertura, vistes per alumne i equip, i exportacions CSV.
- Exportació de còpia de seguretat JSON completa i espai inicial fictici restablible.
- Renderitzador web amb capacitat sense connexió i aplicació Electron per a macOS, Windows i Linux.

## Àrees de l'aplicació

| Àrea | Finalitat |
| --- | --- |
| `Today` | Gestionar una sessió pràctica oberta i registrar assistència i evidències durant la classe. |
| `Classes` | Importar i revisar classes, alumnat, identificadors escolars i grups de laboratori. |
| `History` | Crear, consultar, editar, reobrir o eliminar els registres de sessions pràctiques. |
| `Assessment` | Revisar cobertura i evidències per classe, alumne, equip i període d'avaluació; exportar fitxers CSV. |
| `Settings` | Gestionar presets d'avaluació, exportar una còpia completa o restablir l'espai local. |

## Tecnologies

- React i TypeScript amb Vinext i Vite.
- Estructura compatible amb Next.js App Router i estils globals de Tailwind CSS.
- Dexie i IndexedDB per a persistència local al navegador.
- Validació amb Zod i interfícies de repositori que separen el domini de la persistència.
- Electron amb pont de precàrrega aïllat per context, renderitzador en sandbox i sense integració de Node.js.
- Executor de proves de Node.js i ESLint per a la verificació.

## Requisits

- Node.js `22.13.0` o posterior.
- npm, fent servir el `package-lock.json` inclòs.
- Un directori local de dades del navegador o d'Electron amb permís d'escriptura.

No calen variables d'entorn, servidor de base de dades, compte ni connexió de
xarxa per a l'ús local habitual.

## Instal·lació

Clona el repositori, entra al seu directori i instal·la les dependències fixades:

```bash
git clone https://github.com/abujalancej/rubrilab.git
cd rubrilab
npm ci
```

Si treballes en una còpia existent i has d'actualitzar intencionadament el
fitxer de bloqueig, fes servir `npm install` en lloc d'això.

## Desenvolupament

Inicia l'aplicació web local:

```bash
npm run dev
```

Obre [http://localhost:3000](http://localhost:3000). La primera obertura crea
una classe fictícia i presets d'avaluació, però no sessions ni evidències.

Per obrir el mateix renderitzador amb Electron durant el desenvolupament:

```bash
npm run electron:dev
```

L'ajudant d'Electron inicia el servidor local quan cal, espera que estigui
disponible i obre RubriLab en una finestra d'escriptori.

## Compilació de producció

Crea el renderitzador de producció:

```bash
npm run build
```

Executa localment el renderitzador compilat:

```bash
npm start
```

## Aplicació d'escriptori

RubriLab s'empaqueta com a aplicació Electron per a macOS, Windows i Linux.
L'aplicació instal·lada inicia el seu renderitzador local a la interfície de
bucle local; no cal cap servidor extern. El renderitzador utilitza aïllament de
context, sandbox de processos i té desactivada la integració de Node.js. Els
enllaços HTTPS i de correu externs s'obren al navegador del sistema, no a la
finestra de l'aplicació.

Crea un paquet sense instal·lador per a la plataforma i l'arquitectura actuals:

```bash
npm run electron:build
```

Crea el distribuïble per a la plataforma i l'arquitectura actuals:

```bash
npm run electron:dist
```
Els artefactes d'escriptori s'agrupen a `out/`: `out/mac/` a macOS, `out/win/`
a Windows i `out/linux/` a Linux. Els fitxers DMG, EXE i AppImage utilitzen
`RubriLab-<version>-<os>-<arch>.<ext>`. L'empaquetament per a un altre sistema
operatiu es fa normalment en aquell sistema. La signatura de codi i la
notarització encara no estan configurades.

## Ús

1. Obre **Classes** i importa el paquet del centre en CSV o JSON. Cada fila ha
   d'incloure nom, cognoms, classe i grup de laboratori; l'identificador escolar
   és opcional. L'alumnat existent s'identifica primer per aquest identificador
   i després per nom dins de la classe.
2. Obre **Settings** i revisa o crea els presets d'avaluació d'equip i
   individuals que hauran d'estar disponibles en les sessions futures.
3. Obre **History**, crea una sessió pràctica, selecciona la classe i els grups
   importats, i tria els presets d'avaluació per a aquella sessió. La
   composició del grup es copia a la sessió i es manté com a evidència
   històrica.
4. A **Today**, registra l'assistència, l'estat del grup, l'ajuda docent, el
   resultat pràctic, les puntuacions per criteri, les notes i les observacions
   individuals mentre imparteixes la classe.
5. Finalitza una sessió quan acaba el treball pràctic. Fes servir **History**
   per corregir o reobrir una sessió quan calgui.
6. Obre **Assessment** per revisar cobertura, assistència, evidències per
   alumne i equips d'un període d'avaluació. Exporta assistència, evidències
   individuals o evidències d'equip en CSV quan calgui.
7. Descarrega una còpia de seguretat JSON completa des de **Settings** abans de
   canviar de dispositiu o de fer una neteja important de dades locals.

## Emmagatzematge de dades

RubriLab **no** utilitza una base de dades remota. El renderitzador web desa les
dades a la base IndexedDB del navegador anomenada `rubrilab`. L'aplicació
Electron utilitza el perfil Chromium equivalent dins del directori de dades per
usuari d'Electron.

La instantània desada conté classes, alumnat, sessions, equips de sessió,
assistència, presets, criteris, observacions, registres d'ajuda, resultats
pràctics, períodes d'avaluació i configuracions de pesos. La còpia JSON
exportada des de **Settings** és la còpia portable d'aquestes dades locals.

### Consideracions importants sobre les dades

- Fes una còpia JSON abans de restablir l'espai de treball, esborrar dades del
  navegador, reinstal·lar l'aplicació d'escriptori o canviar de dispositiu.
- Les llistes importades i les observacions poden contenir informació personal
  de l'alumnat; no incloguis dades reals del centre a Git ni les comparteixis
  públicament.
- Els equips de sessió són instantànies. Els canvis posteriors de llistes o
  grups no reescriuen la composició ni les evidències de sessions anteriors.
- L'aplicació està dissenyada per a una instal·lació local, privada i d'una sola
  persona. No disposa d'autenticació ni sincronització multiusuari.
- Les dades privades del navegador o d'Electron es poden eliminar durant una
  neteja del sistema. Conserva una còpia exportada fora del directori de
  l'aplicació.

## Model de dades

La instantània local té aquestes col·leccions de nivell superior:

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

Un alumne pertany a una classe i pot incloure un identificador escolar i un grup
de laboratori opcionals. Una sessió registra la classe, l'assignatura, l'estat,
els presets d'equip i individuals seleccionats i la seva pròpia composició
d'equips congelada. L'absència d'una puntuació significa **no observat**; el
zero no és una puntuació vàlida.

## Estructura del projecte

```text
rubrilab/
├── app/                       # Punt d'entrada, metadades, manifest i estils globals
├── electron/                  # Procés principal segur d'Electron i pont de precàrrega
├── public/                    # Service worker i recursos de marca de RubriLab
├── scripts/                   # Ajudants de desenvolupament, empaquetament i icones d'Electron
├── src/
│   ├── data/                  # Persistència Dexie, repositoris, dades inicials i importació de llistes
│   ├── domain/                # Model TypeScript i contractes de validació Zod
│   └── ui/                    # Espais React, diàlegs i hook de dades locals
├── tests/                     # Comprovacions del renderitzador i de l'arquitectura
├── worker/                    # Punt d'entrada del worker per a la compilació web
├── package.json               # Scripts de l'aplicació i configuració d'Electron Builder
└── README.ca.md               # Documentació del projecte en català
```

La interfície accedeix a les dades locals mitjançant les interfícies de
repositori de `src/data/`; el model de domini i els contractes de validació es
mantenen separats a `src/domain/`.

## Scripts disponibles

| Ordre | Descripció |
| --- | --- |
| `npm run dev` | Inicia el servidor local de desenvolupament Vinext al port `3000`. |
| `npm run build` | Crea el renderitzador web de producció a `dist/`. |
| `npm start` | Inicia el renderitzador local compilat. |
| `npm run electron:dev` | Inicia el renderitzador si cal i l'obre amb Electron. |
| `npm run electron:build` | Compila el renderitzador i crea un paquet Electron sense instal·lador per a la plataforma actual. |
| `npm run electron:dist` | Compila el renderitzador i crea el distribuïble de la plataforma actual. |
| `npm run lint` | Executa ESLint, excloent la sortida de compilació generada. |
| `npm test` | Compila el renderitzador i executa la suite de proves de Node.js. |

## Validació

Abans de confirmar canvis de codi, executa:

```bash
npm run lint
npm test
```

Per a una distribució d'escriptori, crea també l'artefacte de destinació i
prova l'aplicació generada en aquell sistema operatiu:

```bash
npm run electron:dist
```
