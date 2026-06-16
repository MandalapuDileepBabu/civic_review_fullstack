# Civic Review Portal

A civic engagement platform for reporting issues, tracking cleanliness, joining communities with similar interests, and sharing feedback.

## Run locally

### Backend (port 4000)
```bash
cd backend
npm install
cp .env.example .env
# Add serviceAccountKey.json (Firebase Admin)
npm start
```

### Frontend (port 5173)
```bash
cd frontend
npm install
npm run dev
```

## Features

- **Landing page** — cleanliness mission, how it works, about section, news preview
- **Issue reporting** — photos stored via Google Drive (or local fallback)
- **Feedback** — rate public services by sector
- **Profile** — name, phone, bio, interests, member search
- **Communities** — cleaning groups, gated societies, similar-interests groups

## Google Drive setup

1. Enable Google Drive API in Google Cloud Console
2. Create a service account and download JSON key
3. Create a Drive folder and share it with the service account email (Editor)
4. Set `GOOGLE_SERVICE_ACCOUNT_PATH` and `GOOGLE_DRIVE_FOLDER_ID` in `.env`

Without Drive config, images are stored in `backend/uploads/` and served at `/files/:id`.

## Custom AI images

Full prompts are in [`frontend/public/images/IMAGE_PROMPTS.md`](frontend/public/images/IMAGE_PROMPTS.md).

Generate images with DALL·E, Midjourney, or similar, then save to `frontend/public/images/`:

| Filename | Used on |
|----------|---------|
| `hero-clean-community.png` | Landing hero |
| `about-clean-city.png` | About section |
| `news-water.png` | Water topic |
| `news-roads.png` | Roads topic |
| `news-waste.png` | Waste topic |
| `news-air.png` | Air topic |
| `news-community.png` | Community topic |
| `auth-side-panel.png` | Login/register (optional) |

Until local files exist, Unsplash fallbacks load automatically.
