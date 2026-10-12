# Annas Wunschliste (PWA)

Wünsche, Sparziele und Geschenkideen als installierbare App. Läuft komplett im Browser, ohne Server und ohne Konto.
Alle Daten liegen auf dem Gerät (IndexedDB). **Deine Wünsche stehen nie im Repo.**

## Dateien

| Datei | Zweck |
|---|---|
| `index.html`, `app.css`, `app.js` | die App (alle Pfade relativ, läuft unter `/repo-name/`) |
| `manifest.webmanifest`, `icons/` | Installierbarkeit |
| `sw.js` | Service Worker: App offline, Hinweis „Neue Version verfügbar“ |
| `fonts/` | Bricolage Grotesque, Nunito, Space Mono als woff2 (Stil Brause) (SIL OFL, siehe `fonts/LICENSES.txt`) |
| `.github/workflows/pages.yml` | Deployment nach GitHub Pages bei Push auf `main` |

## Auf GitHub Pages veröffentlichen

1. Auf GitHub ein neues Repo anlegen (hier `dynamic-wishlist`), leer, ohne README.
2. Lokal im Projektordner:
   ```sh
   git init -b main
   git add .
   git commit -m "Wunschliste als PWA"
   git remote add origin https://github.com/hfpvhrmbfw-alt/dynamic-wishlist.git
   git push -u origin main
   ```
3. Im Repo unter **Settings → Pages** bei „Source“ **GitHub Actions** wählen.
4. Der Workflow „Deploy to GitHub Pages“ läuft beim Push (Reiter **Actions**). Danach ist die App unter
   `https://hfpvhrmbfw-alt.github.io/dynamic-wishlist/` erreichbar. Dort ist auch die URL für Teilen-Links.

Jeder weitere Push auf `main` veröffentlicht eine neue Version. Die installierte App meldet dann
„Neue Version verfügbar“ mit Button „Neu laden“.

## Auf dem Handy installieren

- **iPhone:** Seite in **Safari** öffnen → Teilen-Symbol → **Zum Home-Bildschirm**.
- **Android:** Seite in **Chrome** öffnen → Menü → **App installieren** (oder „Zum Startbildschirm“).

## Daten und Sicherung

- Die Liste wird nach jeder Änderung automatisch auf dem Gerät gespeichert („Gespeichert“). Beim Start wird dauerhafter Speicher angefragt (`navigator.storage.persist()`).
- **iOS und Android können Website-Daten löschen**, z. B. wenn die App lange nicht geöffnet wurde. Speichere deshalb unter **Einstellungen → Sicherung speichern** ab und zu eine JSON-Datei. Die App zeigt „Letzte Sicherung“ an und erinnert nach 30 Tagen.
- Zurückspielen: **Einstellungen → Sicherung laden**. Die alte JSON-Sicherung aus der Claude-Version (`v:1`) lässt sich unverändert laden.
- Daten gelten pro Gerät und pro Browser. Zwischen Geräten wechseln geht nur über Sicherung speichern und laden.

## Teilen

„Teilen“ erzeugt einen Link `<Pages-URL>/#g=…`. Die Daten stecken komprimiert im Link (nach dem `#`, wird nie an einen Server gesendet). Enthalten sind nur Geschenkideen: Name, Variante, Preis, Shops mit Preisen und ein kleines Vorschaubild. Notizen, Wollen/Brauchen, Sparstände und Raten sind nie enthalten. Wer den Link öffnet, sieht nur die Nur-Lesen-Ansicht; die eigenen Daten bleiben unberührt. Bei Links über etwa 8000 Zeichen werden Bilder weggelassen (die App sagt es dir). Nach Änderungen brauchst du einen neuen Link.

## Datenschutz und Privates Repo

Das Repo kann privat sein. Die GitHub-Pages-Seite ist je nach GitHub-Plan trotzdem öffentlich erreichbar (private Pages gibt es nur bei GitHub Enterprise Cloud). Das ist unkritisch, weil im Repo nur der Code liegt und deine Daten nur auf deinem Gerät.

## Lokal ausprobieren

```sh
python3 -m http.server 8000   # oder: npx serve
# http://localhost:8000
```

Service Worker und Installation funktionieren nur über `localhost` oder HTTPS, nicht über `file://`.

## Hinweise

- Der Name der installierten App steht im `manifest.webmanifest` („Annas Wunschliste“). Ändert man den Besitzernamen in den Einstellungen, setzt die App den Namen zur Laufzeit; der Name auf dem Home-Bildschirm wird beim Hinzufügen festgelegt.
- Bei einem Deploy ersetzt der Workflow `__BUILD__` in `sw.js` durch den Commit-Hash. Wer ohne Workflow hostet, erhöht in `sw.js` die `VERSION` von Hand.
