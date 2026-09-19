# Spoiler Shield 🛡️

A smart browser extension that blocks spoilers for movies and TV shows
across the web --- powered by TMDB and a secure backend proxy.

---

## What is Spoiler Shield?

**Spoiler Shield** helps users browse the internet without accidentally
seeing spoilers.

Users simply enter the name of a movie or TV show, and the extension: -
Detects spoiler-related text - Blurs or hides spoiler content - Works
across websites like social media, blogs, and forums - Keeps API keys
secure using a backend proxy

---

## How It Works

1.  User enters a movie/TV show name\
2.  Extension fetches metadata from TMDB via a secure proxy\
3.  Spoiler-related content is detected\
4.  Text and images containing spoilers are blurred or hidden

---

## Project Structure

    ss/
    ├─ tmdb-proxy/
    ├─ assets/
    ├─ scripts/
    ├─ _locales/
    ├─ background.js
    ├─ content.js
    ├─ popup.html
    ├─ popup.js
    ├─ options.html
    ├─ options.js
    ├─ styles.css
    ├─ manifest.json

---

## 🔐 TMDB Proxy

The proxy keeps the TMDB API key server-side to prevent exposure in the
browser extension.

---

## 🧪 Local Setup

```bash
git clone https://github.com/Inovarara/ss.git
cd ss/tmdb-proxy
npm install
```

Create `.env`:

    DEFAULT_TMDB_KEY=your_api_key_here

Run:

```bash
npm start
```

---

## 🌐 Deployment

- Proxy deployed on Vercel
- Extension loaded via Chrome Developer Mode

---

## 📄 License

MIT License

---

## 👤 Author

**Inovarara**
