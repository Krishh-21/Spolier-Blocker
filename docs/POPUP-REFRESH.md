# Popup and YouTube refresh (2.0.0)

The popup now separates media-category search from literal custom keywords. Movie and TV searches use the user's optional TMDB connection for catalog results and posters. Without it, bundled suggestions remain available. Games, anime, sports, books and other categories support bundled matches where available and exact-title protection. There is no complete online game or book catalog in this release.

Block spoilers enables the selected title or pack; Mark as watched removes its title protection. Independent custom keywords remain active. Title selections do not consume the administrator-configured literal keyword quota. Use Strict mode to hide every topic mention; Balanced still requires spoiler context.

The compact violet popup places the logo at the right of its heading. Theme selection remains in settings. The bundled `spoiler-shield-landing.html` opens once on fresh installation, guarded by a local flag. Updates do not open it automatically.

YouTube adapters now recognize class-based desktop lockups and mobile/Shorts cards, rescan after YouTube navigation events, and avoid concealing feed containers that contain individually evaluated cards. Live Chromium verification on a public Avengers trailer search concealed 20 of 20 video cards without concealing the surrounding results container. This is a point-in-time check, not a guarantee for every YouTube experiment or all spoilers. Video pixels, audio and native games remain outside the detector's scope.

Validation: 33 Node tests, 15 installed-extension/portal Chromium tests, manifest/syntax checks and deterministic release build. New regressions exercise category selection, title protection/removal, installation onboarding and recycled YouTube card text.
