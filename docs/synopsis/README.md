# Synopsis generator

`build_synopsis.js` writes `Capstone/Synopsis_Draft_Rohan_Mani_John.docx` (APA 7 student format, QM 640 template
headings). It reads the sample-size and RQ1 pilot numbers from `reports/tables/`, so re-run it after
`python -m analysis.stats_tests` to refresh the numbers.

```bash
cd docs/synopsis
npm install docx          # once
node build_synopsis.js
```

`arch.png` / `flow.png` are the architecture and workflow diagrams (rendered from `Capstone_Project_Overview.html`).
