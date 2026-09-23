Write ONE entry for the Bias Atlas at /home/user/bias-atlas.

BEFORE ANYTHING ELSE: run `ls /home/user/bias-atlas/src/data/biases/` and check whether a file for your bias already exists under any name or alias. If it does, your task changes: audit that entry line by line against sources you fetch, fix what is wrong, add what is missing, and KEEP its existing `no`. Entry numbers are stable once published; the number in your brief is wrong in that case and you should say so in your report.

READ FIRST, in order: `docs/RESEARCH-PROTOCOL.md` (the binding brief, short), `docs/ENTRY-SCHEMA.md` (follow exactly), `docs/VOICE.md`. Skim one existing entry in `src/data/biases/` whose situation resembles yours.

THE RULE, which overrides everything else in this file: never write a fact you have not read in a source you fetched during this task. No dates, names, effect sizes, intervals, sample sizes, journals, page numbers or DOIs from memory. If a figure cannot be verified, leave it out or say on the page that it could not be obtained. An incomplete entry is enormously preferable to a confident invented one.

THE BRIEF IS NOT EVIDENCE. Everything below the line in your task prompt was written by someone who has not read the papers. It has been wrong many times in this project, on facts, on numbers, on entry numbers and on which paper says what. Contradicting it is the job working correctly, and you should say plainly in your report where it was wrong.

TWO FAILURE MODES THIS PROJECT HAS BEEN BITTEN BY REPEATEDLY:
- A fetch can return a model's summary of a page rather than the page, carrying figures that are plausible and absent from the document. A figure that matters gets seen twice or it does not get published. Where a PDF or XML can be read directly, read it.
- A search result can invent an entire paper. A citation that does not resolve at Crossref or DataCite does not go on the page.

ALSO BANNED: assertions about the absence or exhaustiveness of evidence. Never write that a source prints no confidence interval, or that some study is the only well-powered one, unless you have checked the whole source. Where you searched and found nothing, name where you looked.

STATE: assign whichever `state` the evidence supports, from replicated, failed, mixed, none-located. `none-located` means a search was made and came up empty, and the page says where it looked. It is a verdict, not a gap.

STYLE: at most ONE em dash per entry, prefer zero. No "not just X, but Y". No intensifiers. Mean sentence near 20 words. British spellings, which affects filenames.

VALIDATE, all four, before reporting: `cd /home/user/bias-atlas && npm run build && npm run style && npm test && npm run sources -- --new`.

NEVER RUN GIT. Leave the working tree dirty and report. Read-only git commands are fine; add, commit, checkout, stash and push are not.

REPORT, three numbered lines maximum. (1) the verdict and the numbers behind it. (2) what you could NOT verify and how you handled it, which is the half that never appears in the file and is the most valuable thing you produce. (3) what a reader would most likely get wrong, and where my brief was wrong.
