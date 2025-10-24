# Workflow Automatico - Documentazione

## Sommario delle Modifiche

Ho analizzato il codice dell'applicazione Timer PWA e ho creato un workflow automatico completo per la build e la pubblicazione su GitHub Pages.

## Struttura del Progetto

### File Aggiunti

1. **Build Configuration**
   - `package.json` - Configurazione del progetto Node.js con dipendenze React, Vite e Lucide-react
   - `vite.config.js` - Configurazione di Vite con base path per GitHub Pages
   - `.gitignore` - Esclusione di node_modules, dist e altri file temporanei

2. **HTML Template & PWA Assets**
   - `index.html` - Template HTML principale con meta tags PWA e Tailwind CSS
   - `public/manifest.json` - Manifest PWA con configurazioni dell'app
   - `public/timer-icon.svg` - Icona SVG dell'applicazione

3. **Source Code Organization**
   - `src/main.jsx` - Entry point dell'applicazione React
   - `src/TimerPWA.jsx` - Componente principale (spostato da index.jsx)

4. **GitHub Actions Workflow**
   - `.github/workflows/build-and-deploy.yml` - Workflow CI/CD automatico

### File Modificati

- `README.md` - Documentazione completa del progetto con istruzioni di sviluppo e deployment

### File Rimossi

- `index.jsx` - Spostato in `src/TimerPWA.jsx` per una migliore organizzazione

## Workflow GitHub Actions

Il workflow automatico esegue le seguenti operazioni:

### Trigger
- Push sul branch `main`
- Pull request verso `main`
- Manuale (workflow_dispatch)

### Job: Build
1. Checkout del codice sorgente
2. Setup di Node.js 18 con cache npm
3. Installazione delle dipendenze (`npm ci`)
4. Build dell'applicazione (`npm run build`)
5. Configurazione GitHub Pages
6. Upload dell'artifact (directory `dist`)

### Job: Deploy (solo su main)
1. Deploy dell'artifact su GitHub Pages
2. Pubblicazione automatica dell'applicazione

## Tecnologie Utilizzate

- **React 18.2.0** - Framework UI
- **Vite 5.4.11** - Build tool moderno e veloce
- **Tailwind CSS** - Framework CSS (via CDN)
- **Lucide React 0.263.1** - Libreria di icone
- **GitHub Actions** - CI/CD pipeline
- **GitHub Pages** - Hosting statico

## Sicurezza

- **CodeQL Analysis**: Eseguita con 0 vulnerabilità rilevate
- **Dependency Audit**: Verificato (solo vulnerabilità minori in dev dependencies)
- **Build Isolato**: Il build avviene in ambiente isolato GitHub Actions

## Come Utilizzare

### Sviluppo Locale

```bash
# Installare le dipendenze
npm install

# Avviare il server di sviluppo
npm run dev

# Build per produzione
npm run build

# Preview della build
npm run preview
```

### Deployment Automatico

Il deployment è completamente automatico:

1. Fare commit delle modifiche
2. Push sul branch `main`
3. GitHub Actions esegue automaticamente build e deploy
4. L'applicazione sarà disponibile su: `https://mad4j.github.io/timerjs/`

## Configurazione Necessaria

Per abilitare GitHub Pages nel repository:

1. Andare su Settings > Pages
2. Selezionare "GitHub Actions" come Source
3. Il workflow si occuperà automaticamente del resto

## Note

- Il base path `/timerjs/` è configurato per GitHub Pages
- L'applicazione è una PWA completamente funzionale offline
- Supporta installazione su dispositivi mobili e desktop
- Include funzionalità avanzate come Wake Lock e modalità Pomodoro
