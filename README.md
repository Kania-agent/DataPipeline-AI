# DataPipeline-AI

A fully functional ETL (Extract → Transform → Load) data pipeline tool with a visual pipeline editor, built entirely in the browser using vanilla HTML, CSS, and JavaScript.

## Features

- **Upload CSV or JSON files** — drag-and-drop or click to browse
- **Visual Pipeline Editor** — add, remove, reorder transform stages with a clean drag interface
- **Transform Operations:**
  - **Filter** — keep rows matching conditions (equals, not-equals, contains, greater/less than)
  - **Map Columns** — rename, select, or drop columns
  - **Sort** — order rows by any column ascending or descending
  - **Aggregate** — group by a column and compute sum, count, average, min, or max
  - **Deduplicate** — remove duplicate rows by key column(s)
- **Data Preview** — view your data as a table at every pipeline stage (raw input, post-transform, final output)
- **Export** — download processed data as CSV or JSON
- **Real Data Processing** — all transformations run in JavaScript in the browser; no server required

## Usage

1. Open `index.html` in any modern browser.
2. Upload a CSV or JSON file via the upload zone.
3. Add transform stages using the "Add Stage" dropdown.
4. Configure each stage (column, operation, value, etc.).
5. Reorder stages with Up/Down arrows or delete with the × button.
6. Click **Run Pipeline** to process your data through all stages.
7. View intermediate previews by clicking **Preview** on any stage.
8. Export the final result as CSV or JSON.

## File Structure

| File | Purpose |
|------|---------|
| `index.html` | Main HTML page with layout and structure |
| `style.css` | All styling — dark theme, responsive layout, animations |
| `app.js` | Core application logic — data processing, UI interactions, pipeline engine |
| `README.md` | This file |

## Example Data

Try uploading a CSV like:

```csv
name,age,department,salary
Alice,30,Engineering,95000
Bob,25,Marketing,72000
Carol,35,Engineering,110000
David,28,Sales,68000
Eve,32,Marketing,80000
```

Then add a Filter stage to keep only `department equals Engineering`, a Sort stage on `salary descending`, and run the pipeline!

## Requirements

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server, no dependencies, no build step required
