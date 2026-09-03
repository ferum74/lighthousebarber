# lighthousebarber

## Lighthouse — deploy package

Папка `website/` — это полностью готовый статический билд сайта (HTML/CSS/JS + все медиа в `assets/`).

### Деплой

- **Netlify/Vercel/Cloudflare Pages/GitHub Pages**: укажите publish/output directory как `website`.
- **Локально** (пример): `python3 -m http.server 8080` внутри `website`.
