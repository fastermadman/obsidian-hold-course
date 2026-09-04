## Sprog

Chat-kommunikation på dansk. Extension-kildekode (variabelnavne, inline-kommentarer) på
engelsk er fint.

## Hvor konteksten ligger

Research og arkitekturbeslutninger for dette plugin ligger i ValdiVault, ikke i repoet:
`~/ValdiVault/10_Projects/VIAstudyWiz/06-start-her.md` — pointer-note til issues,
milestones og arkitekturnoter. Flere issues er cross-repo med `viastudywiz-extension`
(sync, vault-layout) — planlæg begge halvdele der før kode skrives i nogen af repos.

## Flyt/omdøb ALDRIG vault-filer med rå filsystem-værktøjer

Brug Obsidians egen move (`mcp__enquire__obsidian_rename_note`, eller Local REST API's
`MOVE`-verb med `Destination`-header). Ikke `mv`/`cp`, ikke `mcp__filesystem__move_file`.
Grunden: Obsidians move opdaterer `[[wikilinks]]` andre steder i vaulten; en rå
filsystem-flytning efterlader døde links.

## graphify-rs

This project has a graphify-rs knowledge graph at /Users/valdefar/.graphify-rs/obsidian-hold-course-12697127efc43d3a/.

Rules:
- Before answering architecture or codebase questions, read /Users/valdefar/.graphify-rs/obsidian-hold-course-12697127efc43d3a/GRAPH_REPORT.md for god nodes and community structure
- If /Users/valdefar/.graphify-rs/obsidian-hold-course-12697127efc43d3a/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify-rs build --path . --output /Users/valdefar/.graphify-rs/obsidian-hold-course-12697127efc43d3a --no-llm --update` to keep the graph current (fast, AST-only, ~2-5s)
