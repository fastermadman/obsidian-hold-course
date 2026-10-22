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

## Lukke issues via PR

PR-beskrivelsen skal have `Closes #N` (engelsk nøgleord; "Lukker" virker ikke), ét nøgleord pr. issue, og PR skal merges til main. Delvis løsning: `Refs #N`. Se `.github/pull_request_template.md`.
