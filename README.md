# TimerJS

PWA Timer - Progressive Web App per la gestione del tempo

## Descrizione

Applicazione PWA (Progressive Web App) per timer con funzionalità avanzate:
- Timer personalizzabili da 10 secondi a 2 ore
- Modalità Pomodoro
- Supporto offline
- Notifiche audio e vibrazione
- Modalità scura automatica
- Wake Lock per mantenere lo schermo attivo
- Scorciatoie da tastiera

## Sviluppo

### Prerequisiti
- Node.js 18 o superiore
- npm

### Installazione
```bash
npm install
```

### Avvio in modalità sviluppo
```bash
npm run dev
```

### Build per produzione
```bash
npm run build
```

### Anteprima build
```bash
npm run preview
```

## Deployment

L'applicazione viene automaticamente costruita e pubblicata su GitHub Pages ad ogni push sul branch `main` tramite GitHub Actions.

### Workflow automatico

Il workflow `.github/workflows/build-and-deploy.yml` esegue:
1. Checkout del codice
2. Setup di Node.js
3. Installazione delle dipendenze
4. Build dell'applicazione
5. Deploy su GitHub Pages

### Accesso all'applicazione

Una volta pubblicata, l'applicazione sarà disponibile all'indirizzo:
```
https://mad4j.github.io/timerjs/
```

## Tecnologie utilizzate

- React 18
- Vite (build tool)
- Tailwind CSS (via CDN)
- Lucide React (icone)
- GitHub Actions (CI/CD)
