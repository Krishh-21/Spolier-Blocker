# Keyword coverage and maintenance

The complete shipped pack data is in [extension/packs.js](../extension/packs.js). The generic signal list is in [extension/core.js](../extension/core.js). All 11 packs are opt-in; no list can cover every title, nickname, language or future spoiler.

| Pack | Coverage |
|---|---|
| Stranger Things | Series title, season-five alias, principal characters and setting aliases |
| One Piece | English/Japanese title and principal Straw Hat character aliases |
| The Mandalorian | Series/film title, Din Djarin, Grogu and principal character aliases |
| Avengers: Endgame | Title variants and principal character aliases |
| Breaking Bad | Series and principal character aliases |
| Attack on Titan | English/romanized/Japanese titles and principal character names |
| Game of Thrones | Series/book-world and principal character aliases |
| The Last of Us | Series/game titles, acronym and principal character names |
| Dune | Film/book title variants, character and setting aliases |
| Formula 1 | Series/race terms and a selected set of driver names; not the entire grid |
| Oscars | Awards and selected category/result phrases; not a nominee database |

September 2026 source review added/checked current title aliases using [Netflix's Stranger Things character guide](https://www.netflix.com/tudum/articles/stranger-things-season-5-cast-character-guide), [Netflix's One Piece cast guide](https://www.netflix.com/tudum/articles/one-piece-cast-live-action-netflix), [Star Wars' Grogu databank](https://www.starwars.com/databank/grogu), and [The Mandalorian and Grogu information](https://www.starwars.com/news/the-mandalorian-and-grogu-everything-we-know). Other packs start from the repository's existing franchise coverage and familiar factual names; they are not claimed to be comprehensive current-season databases. No plot prose from those sources was copied into the new packs.

Balanced mode combines topic terms with nearby spoiler signals such as endings, deaths, reveals, leaks, winners and results, plus inherited local contextual rules. Signals include selected English, Spanish, German, French, Japanese, Chinese and Korean terms. This is not comprehensive support for those languages. Strict mode hides every matched selected-topic mention. Always-block keywords work in both modes without another signal. Common aliases such as “Eleven,” “Nami,” or “Endgame” can produce false positives.

## Adding coverage

Add a manual topic with full character names and distinctive alternative titles. Optional TMDB lookup can retrieve alternative titles and cast character names directly; it does not fetch complete plot summaries into settings. TMDB's [search](https://developer.themoviedb.org/docs/finding-data) and [alternative-title endpoint](https://developer.themoviedb.org/reference/movie-alternative-titles) explain the available metadata. Games, sports and niche topics can be added manually.

For maintained packs, add factual aliases with primary source links, normalize/deduplicate them, test intended matches and common-word false positives, and ship them through a reviewed extension update. Do not add a giant universal list of character first names or automatically enable every franchise. Limits: 200 custom titles, 120 aliases per title, 2,000 custom keywords, 160 characters per term and a 1 MB configuration/backup ceiling.

The bundled legacy knowledge engine contains existing plot-oriented rules internally; “no plot summaries” refers to new pack data and lookup UI, not a claim that the source code itself is spoiler-free.
