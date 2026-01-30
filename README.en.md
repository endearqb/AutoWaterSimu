# AutoWaterSimu

AutoWaterSimu is a full‑stack platform for water/wastewater **process flow modeling**, **simulation**, and **analysis**.

## Highlights

- Flow modeling UI built with `@xyflow/react` (React Flow)
- Activated sludge model workflows (ASM series) and result inspection
- Material / mass balance analysis tooling
- DeepResearch knowledge content integrated into the product experience
- Built‑in i18n (Chinese / English)

## Screenshots & Diagrams

### Landing Page
![](frontend/public/assets/images/home.png)

### Flow Theme & Simulation Panel
![](frontend/public/assets/images/newflowtheme.png)

### DeepResearch Knowledge
![](frontend/public/assets/images/knowledge.png)

### Backend Core Logic (AI‑generated handwritten derivation)
This diagram illustrates the core logic used for multi‑tank simulation computations.

![](frontend/public/assets/images/handwriting.jpeg)

## Changelog / Updates

- In‑app Updates page: `/updates`
- MDX sources:
  - English: `frontend/src/data/updates/en/`
  - Chinese: `frontend/src/data/updates/zh/`

## Local Development

### Frontend

```powershell
cd frontend; npm install; npm run dev
```

Type check (required after frontend changes):

```powershell
cd frontend; npx tsc --noEmit
```

### Backend (example)

```powershell
cd backend; .venv\Scripts\activate; fastapi run app/main.py
```

## Deployment Notes (SPA routing)

If you deploy the frontend behind Nginx, make sure history routes (e.g. `/docs`, `/updates`) fall back to `index.html`:

```nginx
location / {
  try_files $uri /index.html;
}
```

## License

See `LICENSE`.

