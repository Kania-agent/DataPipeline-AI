/* ============================================================
   DataPipeline-AI — Full ETL Pipeline Engine
   ============================================================ */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let rawData = [];          // rows parsed from uploaded file
  let columns = [];          // column names from rawData
  let stages = [];           // array of { id, type, config }
  let pipelineResult = [];   // output after running pipeline
  let stagePreviews = {};    // { stageId: [rows] }
  let activePreviewTab = 'raw';
  let stageIdCounter = 0;

  // ── DOM References ─────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const uploadZone = $('#uploadZone');
  const fileInput = $('#fileInput');
  const fileName = $('#fileName');
  const stageList = $('#stageList');
  const emptyStages = $('#emptyStages');
  const addStageType = $('#addStageType');
  const btnRun = $('#btnRunPipeline');
  const btnClear = $('#btnClearAll');
  const btnExportCSV = $('#btnExportCSV');
  const btnExportJSON = $('#btnExportJSON');
  const modalOverlay = $('#modalOverlay');
  const modalTitle = $('#modalTitle');
  const modalForm = $('#modalForm');
  const modalCancel = $('#modalCancel');
  const modalSave = $('#modalSave');
  const previewTabs = $('#previewTabs');
  const previewContent = $('#previewContent');

  // ── Toast Notifications ────────────────────────────────────
  function showToast(msg, type = 'info') {
    const container = $('#toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ── Status Bar ─────────────────────────────────────────────
  function updateStats() {
    $('#statRows').textContent = rawData.length;
    $('#statCols').textContent = columns.length;
    $('#statStages').textContent = stages.length;
    $('#statSource').textContent = rawData.length > 0 ? 'Loaded' : 'None';
    btnRun.disabled = rawData.length === 0;
    btnClear.disabled = rawData.length === 0 && stages.length === 0;
  }

  // ── File Upload ────────────────────────────────────────────
  uploadZone.addEventListener('click', () => fileInput.click());

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) loadFile(e.target.files[0]);
  });

  function loadFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      showToast('Please upload a CSV or JSON file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        if (ext === 'csv') {
          rawData = parseCSV(text);
        } else {
          rawData = parseJSON(text);
        }
        columns = rawData.length > 0 ? Object.keys(rawData[0]) : [];
        fileName.textContent = file.name;
        showToast(`Loaded ${rawData.length} rows from ${file.name}`, 'success');
        updateStats();
        renderExtractPreview();
        btnExportCSV.disabled = true;
        btnExportJSON.disabled = true;
        pipelineResult = [];
        stagePreviews = {};
        renderPreviewTabs();
      } catch (err) {
        showToast('Error parsing file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  // ── CSV Parser ─────────────────────────────────────────────
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      // Single header row, no data
      if (lines.length === 1) {
        const headers = parseCSVLine(lines[0]);
        return [];
      }
      return [];
    }
    const headers = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      const values = parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        const val = values[idx] || '';
        row[h] = tryNumber(val);
      });
      rows.push(row);
    }
    return rows;
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }

  function tryNumber(val) {
    if (val === '') return '';
    const n = Number(val);
    return isNaN(n) ? val : n;
  }

  // ── JSON Parser ────────────────────────────────────────────
  function parseJSON(text) {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null) {
      // If it's a single object, wrap in array
      return [data];
    }
    throw new Error('JSON must be an array of objects or a single object');
  }

  // ── Extract Preview ────────────────────────────────────────
  function renderExtractPreview() {
    if (rawData.length === 0) {
      $('#extractPreview').innerHTML = '';
      return;
    }
    const preview = rawData.slice(0, 50);
    $('#extractPreview').innerHTML = buildTableHTML(preview, columns);
  }

  function buildTableHTML(rows, cols) {
    if (rows.length === 0) {
      return '<div class="empty-state"><p>No rows to display.</p></div>';
    }
    const allCols = cols || Object.keys(rows[0]);
    let html = '<div class="preview-table-wrap"><table class="preview-table"><thead><tr>';
    allCols.forEach(c => {
      html += `<th>${escapeHTML(String(c))}</th>`;
    });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
      html += '<tr>';
      allCols.forEach(c => {
        const val = row[c] !== undefined && row[c] !== null ? String(row[c]) : '';
        html += `<td title="${escapeHTML(val)}">${escapeHTML(val)}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    if (rows.length < (rawData.length || rows.length)) {
      html += `<div style="text-align:center;padding:8px;font-size:0.75rem;color:var(--text-muted);">Showing ${rows.length} of ${rawData.length} rows</div>`;
    }
    return html;
  }

  function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Stage Rendering ────────────────────────────────────────
  function renderStages() {
    stageList.innerHTML = '';
    if (stages.length === 0) {
      stageList.innerHTML = `<div class="empty-state" id="emptyStages">
        <div class="empty-icon">🔗</div>
        <p>No transform stages yet. Add one below.</p>
      </div>`;
      return;
    }

    stages.forEach((stage, idx) => {
      const div = document.createElement('div');
      div.className = 'stage-item';
      div.innerHTML = `
        <div class="stage-number">${idx + 1}</div>
        <div class="stage-info">
          <div class="stage-type">${getStageLabel(stage.type)}</div>
          <div class="stage-detail">${getStageDetail(stage)}</div>
        </div>
        <div class="stage-actions">
          <button title="Move up" onclick="DP.moveStage(${stage.id}, -1)">↑</button>
          <button title="Move down" onclick="DP.moveStage(${stage.id}, 1)">↓</button>
          <button title="Edit" onclick="DP.editStage(${stage.id})">✎</button>
          <button title="Preview this stage" onclick="DP.previewStage(${stage.id})">👁</button>
          <button class="delete-btn" title="Remove" onclick="DP.removeStage(${stage.id})">✕</button>
        </div>
      `;
      stageList.appendChild(div);
    });
    updateStats();
  }

  function getStageLabel(type) {
    const labels = {
      filter: '🔍 Filter',
      map: '🔄 Map Columns',
      sort: '↕ Sort',
      aggregate: '📊 Aggregate',
      deduplicate: '🧹 Deduplicate'
    };
    return labels[type] || type;
  }

  function getStageDetail(stage) {
    const c = stage.config;
    if (!c) return 'Not configured';
    switch (stage.type) {
      case 'filter':
        return `Keep rows where "${c.column}" ${c.operator} "${c.value}"`;
      case 'map':
        const ops = [];
        if (c.renameTo) ops.push(`Rename "${c.column}" → "${c.renameTo}"`);
        if (c.keepColumns && c.keepColumns.length > 0) ops.push(`Keep: ${c.keepColumns.join(', ')}`);
        if (c.dropColumns && c.dropColumns.length > 0) ops.push(`Drop: ${c.dropColumns.join(', ')}`);
        return ops.join(' | ') || 'No changes';
      case 'sort':
        return `Sort by "${c.column}" ${c.order === 'desc' ? 'descending' : 'ascending'}`;
      case 'aggregate':
        return `Group by "${c.column}", compute ${c.function} of "${c.aggColumn}"`;
      case 'deduplicate':
        return `Remove duplicates by "${c.column}"`;
      default:
        return '';
    }
  }

  // ── Stage CRUD ─────────────────────────────────────────────
  addStageType.addEventListener('change', (e) => {
    const type = e.target.value;
    if (!type) return;
    addStageType.value = '';
    openStageModal(type, null);
  });

  window.DP = {};

  DP.moveStage = function (id, dir) {
    const idx = stages.findIndex(s => s.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= stages.length) return;
    const temp = stages[idx];
    stages[idx] = stages[newIdx];
    stages[newIdx] = temp;
    renderStages();
  };

  DP.editStage = function (id) {
    const stage = stages.find(s => s.id === id);
    if (!stage) return;
    openStageModal(stage.type, stage);
  };

  DP.removeStage = function (id) {
    stages = stages.filter(s => s.id !== id);
    renderStages();
    showToast('Stage removed', 'info');
  };

  DP.previewStage = function (id) {
    if (rawData.length === 0) {
      showToast('No data loaded.', 'error');
      return;
    }
    runPipeline(id);
  };

  // ── Stage Modal ────────────────────────────────────────────
  let editingStage = null;
  let modalStageType = '';

  function openStageModal(type, existingStage) {
    modalStageType = type;
    editingStage = existingStage;
    const config = existingStage ? existingStage.config : {};
    modalTitle.textContent = existingStage ? 'Edit Stage' : 'New Stage: ' + getStageLabel(type);
    modalForm.innerHTML = buildModalForm(type, config, columns);
    modalOverlay.classList.add('active');
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
    editingStage = null;
  }

  modalCancel.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  modalSave.addEventListener('click', () => {
    const config = readModalForm(modalStageType);
    if (!config) return;
    if (editingStage) {
      editingStage.config = config;
      showToast('Stage updated', 'success');
    } else {
      stages.push({ id: ++stageIdCounter, type: modalStageType, config });
      showToast('Stage added', 'success');
    }
    closeModal();
    renderStages();
  });

  function buildModalForm(type, config, cols) {
    const colOptions = cols.map(c => `<option value="${escapeHTML(c)}" ${config.column === c ? 'selected' : ''}>${escapeHTML(c)}</option>`).join('');

    switch (type) {
      case 'filter': {
        const ops = ['equals', 'not equals', 'contains', '>', '<', '>=', '<=', 'starts with'];
        const opOpts = ops.map(o => `<option value="${o}" ${config.operator === o ? 'selected' : ''}>${escapeHTML(o)}</option>`).join('');
        return `
          <div class="form-group">
            <label>Column</label>
            <select id="cfg_column">${colOptions}</select>
          </div>
          <div class="form-group">
            <label>Operator</label>
            <select id="cfg_operator">${opOpts}</select>
          </div>
          <div class="form-group">
            <label>Value</label>
            <input type="text" id="cfg_value" value="${escapeHTML(config.value || '')}" placeholder="Filter value">
          </div>`;
      }
      case 'map': {
        const checked = (config.keepColumns || []);
        const dropped = (config.dropColumns || []);
        const checkboxes = cols.map(c => `
          <label><input type="checkbox" value="${escapeHTML(c)}" class="map-col-cb" ${checked.length === 0 || checked.includes(c) ? 'checked' : ''}> ${escapeHTML(c)}</label>
        `).join('');
        const dropChecks = cols.map(c => `
          <label><input type="checkbox" value="${escapeHTML(c)}" class="map-drop-cb" ${dropped.includes(c) ? 'checked' : ''}> ${escapeHTML(c)}</label>
        `).join('');
        return `
          <div class="form-group">
            <label>Rename column (optional)</label>
            <select id="cfg_column">${colOptions}</select>
          </div>
          <div class="form-group">
            <label>Rename to</label>
            <input type="text" id="cfg_renameTo" value="${escapeHTML(config.renameTo || '')}" placeholder="New name">
          </div>
          <div class="form-group">
            <label>Keep only these columns (leave all checked to keep all)</label>
            <div class="column-selector" id="cfg_keepWrap">${checkboxes}</div>
          </div>
          <div class="form-group">
            <label>Drop these columns</label>
            <div class="column-selector" id="cfg_dropWrap">${dropChecks}</div>
          </div>`;
      }
      case 'sort': {
        const ordOpts = `<option value="asc" ${config.order === 'asc' ? 'selected' : ''}>Ascending</option><option value="desc" ${config.order === 'desc' || !config.order ? 'selected' : ''}>Descending</option>`;
        return `
          <div class="form-group">
            <label>Sort by column</label>
            <select id="cfg_column">${colOptions}</select>
          </div>
          <div class="form-group">
            <label>Order</label>
            <select id="cfg_order">${ordOpts}</select>
          </div>`;
      }
      case 'aggregate': {
        const funcs = ['sum', 'count', 'avg', 'min', 'max'];
        const funcOpts = funcs.map(f => `<option value="${f}" ${config.function === f ? 'selected' : ''}>${f.toUpperCase()}</option>`).join('');
        return `
          <div class="form-group">
            <label>Group by column</label>
            <select id="cfg_column">${colOptions}</select>
          </div>
          <div class="form-group">
            <label>Aggregate function</label>
            <select id="cfg_function">${funcOpts}</select>
          </div>
          <div class="form-group">
            <label>Aggregate column</label>
            <select id="cfg_aggColumn">${colOptions}</select>
          </div>`;
      }
      case 'deduplicate':
        return `
          <div class="form-group">
            <label>Deduplicate by column</label>
            <select id="cfg_column">${colOptions}</select>
          </div>`;
      default:
        return '<p>Unknown stage type.</p>';
    }
  }

  function readModalForm(type) {
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };

    switch (type) {
      case 'filter': {
        const column = getVal('cfg_column');
        const operator = getVal('cfg_operator');
        const value = getVal('cfg_value');
        if (!column || !operator) {
          showToast('Please select a column and operator.', 'error');
          return null;
        }
        return { column, operator, value };
      }
      case 'map': {
        const column = getVal('cfg_column');
        const renameTo = getVal('cfg_renameTo');
        const keepChecked = [...document.querySelectorAll('.map-col-cb:checked')].map(cb => cb.value);
        const dropChecked = [...document.querySelectorAll('.map-drop-cb:checked')].map(cb => cb.value);
        return { column, renameTo, keepColumns: keepChecked, dropColumns: dropChecked };
      }
      case 'sort': {
        const column = getVal('cfg_column');
        const order = getVal('cfg_order');
        if (!column) {
          showToast('Please select a column.', 'error');
          return null;
        }
        return { column, order };
      }
      case 'aggregate': {
        const column = getVal('cfg_column');
        const func = getVal('cfg_function');
        const aggColumn = getVal('cfg_aggColumn');
        if (!column || !aggColumn) {
          showToast('Please select columns.', 'error');
          return null;
        }
        return { column, function: func, aggColumn };
      }
      case 'deduplicate': {
        const column = getVal('cfg_column');
        if (!column) {
          showToast('Please select a column.', 'error');
          return null;
        }
        return { column };
      }
    }
    return {};
  }

  // ── Pipeline Engine ────────────────────────────────────────
  btnRun.addEventListener('click', () => {
    if (rawData.length === 0) {
      showToast('No data to process.', 'error');
      return;
    }
    runPipeline(null);
    showToast('Pipeline executed successfully!', 'success');
  });

  btnClear.addEventListener('click', () => {
    rawData = [];
    columns = [];
    stages = [];
    pipelineResult = [];
    stagePreviews = {};
    activePreviewTab = 'raw';
    fileName.textContent = '';
    fileInput.value = '';
    renderStages();
    renderExtractPreview();
    renderPreviewTabs();
    $('#previewContent').innerHTML = `<div class="empty-state">
      <div class="empty-icon">📋</div>
      <p>Upload a file and run the pipeline to see data here.</p>
    </div>`;
    btnExportCSV.disabled = true;
    btnExportJSON.disabled = true;
    updateStats();
    showToast('All data cleared.', 'info');
  });

  function runPipeline(previewUpToStageId) {
    let data = rawData.map(r => ({ ...r })); // deep-ish copy
    stagePreviews = {};

    for (const stage of stages) {
      data = applyStage(data, stage, stage.id === previewUpToStageId ? true : false);
      stagePreviews[stage.id] = data.map(r => ({ ...r }));

      if (previewUpToStageId !== null && stage.id === previewUpToStageId) {
        pipelineResult = data;
        renderPreviewTabs();
        renderPreviewContent('stage_' + stage.id);
        showToast(`Preview: stage "${getStageLabel(stage.type)}" complete (${data.length} rows)`, 'info');
        return data;
      }
    }

    pipelineResult = data;
    renderPreviewTabs();
    renderPreviewContent('final');
    btnExportCSV.disabled = data.length === 0;
    btnExportJSON.disabled = data.length === 0;
    return data;
  }

  function applyStage(data, stage) {
    switch (stage.type) {
      case 'filter': return transformFilter(data, stage.config);
      case 'map': return transformMap(data, stage.config);
      case 'sort': return transformSort(data, stage.config);
      case 'aggregate': return transformAggregate(data, stage.config);
      case 'deduplicate': return transformDeduplicate(data, stage.config);
      default: return data;
    }
  }

  // ── Transform: Filter ──────────────────────────────────────
  function transformFilter(data, config) {
    const { column, operator, value } = config;
    return data.filter(row => {
      const cell = row[column];
      const cellStr = String(cell).toLowerCase();
      const valStr = String(value).toLowerCase();
      const numCell = Number(cell);
      const numVal = Number(value);

      switch (operator) {
        case 'equals': return cellStr === valStr;
        case 'not equals': return cellStr !== valStr;
        case 'contains': return cellStr.includes(valStr);
        case 'starts with': return cellStr.startsWith(valStr);
        case '>': return !isNaN(numCell) && !isNaN(numVal) && numCell > numVal;
        case '<': return !isNaN(numCell) && !isNaN(numVal) && numCell < numVal;
        case '>=': return !isNaN(numCell) && !isNaN(numVal) && numCell >= numVal;
        case '<=': return !isNaN(numCell) && !isNaN(numVal) && numCell <= numVal;
        default: return true;
      }
    });
  }

  // ── Transform: Map Columns ─────────────────────────────────
  function transformMap(data, config) {
    if (data.length === 0) return data;

    // Step 1: Rename
    let result = data;
    if (config.column && config.renameTo) {
      result = result.map(row => {
        const newRow = { ...row };
        if (newRow.hasOwnProperty(config.column)) {
          newRow[config.renameTo] = newRow[config.column];
          delete newRow[config.column];
        }
        return newRow;
      });
    }

    // Step 2: Drop columns
    if (config.dropColumns && config.dropColumns.length > 0) {
      result = result.map(row => {
        const newRow = { ...row };
        config.dropColumns.forEach(col => delete newRow[col]);
        return newRow;
      });
    }

    // Step 3: Keep only specified columns (if any keepColumns set)
    if (config.keepColumns && config.keepColumns.length > 0) {
      const effectiveCols = config.keepColumns.filter(c => !config.dropColumns || !config.dropColumns.includes(c));
      result = result.map(row => {
        const newRow = {};
        effectiveCols.forEach(col => {
          if (row.hasOwnProperty(col)) newRow[col] = row[col];
        });
        return newRow;
      });
    }

    return result;
  }

  // ── Transform: Sort ────────────────────────────────────────
  function transformSort(data, config) {
    const { column, order } = config;
    const sorted = [...data];
    sorted.sort((a, b) => {
      let va = a[column];
      let vb = b[column];
      // Handle undefined/null
      if (va == null) va = '';
      if (vb == null) vb = '';
      // Numeric comparison if both are numbers
      if (typeof va === 'number' && typeof vb === 'number') {
        return order === 'asc' ? va - vb : vb - va;
      }
      // Try numeric parse
      const na = Number(va);
      const nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) {
        return order === 'asc' ? na - nb : nb - na;
      }
      // String comparison
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return order === 'asc' ? -1 : 1;
      if (sa > sb) return order === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  // ── Transform: Aggregate ───────────────────────────────────
  function transformAggregate(data, config) {
    const { column: groupByCol, function: aggFunc, aggColumn } = config;
    const groups = {};

    data.forEach(row => {
      const key = row[groupByCol] !== undefined ? String(row[groupByCol]) : '__null__';
      if (!groups[key]) groups[key] = { key: row[groupByCol], values: [] };
      groups[key].values.push(row[aggColumn]);
    });

    const result = [];
    Object.values(groups).forEach(group => {
      const vals = group.values;
      const numVals = vals.map(Number).filter(v => !isNaN(v));
      let aggResult;

      switch (aggFunc) {
        case 'sum':
          aggResult = numVals.reduce((a, b) => a + b, 0);
          break;
        case 'count':
          aggResult = vals.length;
          break;
        case 'avg':
          aggResult = numVals.length > 0 ? numVals.reduce((a, b) => a + b, 0) / numVals.length : 0;
          aggResult = Math.round(aggResult * 100) / 100;
          break;
        case 'min':
          aggResult = numVals.length > 0 ? Math.min(...numVals) : 0;
          break;
        case 'max':
          aggResult = numVals.length > 0 ? Math.max(...numVals) : 0;
          break;
        default:
          aggResult = vals.length;
      }

      const row = {};
      row[groupByCol] = group.key;
      row[`${aggFunc}(${aggColumn})`] = aggResult;
      result.push(row);
    });

    return result;
  }

  // ── Transform: Deduplicate ─────────────────────────────────
  function transformDeduplicate(data, config) {
    const { column } = config;
    const seen = new Set();
    return data.filter(row => {
      const val = row[column] !== undefined ? String(row[column]) : '__null__';
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  }

  // ── Preview Tabs ───────────────────────────────────────────
  function renderPreviewTabs() {
    previewTabs.innerHTML = '';

    // Raw tab
    const rawBtn = document.createElement('button');
    rawBtn.className = 'tab-btn' + (activePreviewTab === 'raw' ? ' active' : '');
    rawBtn.textContent = 'Raw Data';
    rawBtn.onclick = () => { activePreviewTab = 'raw'; renderPreviewTabs(); renderPreviewContent('raw'); };
    previewTabs.appendChild(rawBtn);

    // Stage tabs
    stages.forEach((stage, idx) => {
      if (stagePreviews[stage.id]) {
        const btn = document.createElement('button');
        btn.className = 'tab-btn' + (activePreviewTab === 'stage_' + stage.id ? ' active' : '');
        btn.textContent = `Stage ${idx + 1}`;
        btn.onclick = () => { activePreviewTab = 'stage_' + stage.id; renderPreviewTabs(); renderPreviewContent('stage_' + stage.id); };
        previewTabs.appendChild(btn);
      }
    });

    // Final tab
    if (pipelineResult.length > 0) {
      const finalBtn = document.createElement('button');
      finalBtn.className = 'tab-btn' + (activePreviewTab === 'final' ? ' active' : '');
      finalBtn.textContent = 'Final';
      finalBtn.onclick = () => { activePreviewTab = 'final'; renderPreviewTabs(); renderPreviewContent('final'); };
      previewTabs.appendChild(finalBtn);
    }
  }

  function renderPreviewContent(key) {
    let data, cols;
    if (key === 'raw') {
      data = rawData;
      cols = columns;
    } else if (key === 'final') {
      data = pipelineResult;
      cols = data.length > 0 ? Object.keys(data[0]) : [];
    } else if (key.startsWith('stage_')) {
      const stageId = parseInt(key.split('_')[1]);
      data = stagePreviews[stageId] || [];
      cols = data.length > 0 ? Object.keys(data[0]) : [];
    } else {
      data = [];
      cols = [];
    }

    if (!data || data.length === 0) {
      previewContent.innerHTML = '<div class="empty-state"><p>No data to preview.</p></div>';
      return;
    }

    const displayData = data.slice(0, 200);
    let html = buildTableHTML(displayData, cols);
    if (data.length > 200) {
      html += `<div style="text-align:center;padding:8px;font-size:0.75rem;color:var(--text-muted);">Showing 200 of ${data.length} rows</div>`;
    }
    previewContent.innerHTML = html;
  }

  // ── Export ─────────────────────────────────────────────────
  btnExportCSV.addEventListener('click', () => {
    if (pipelineResult.length === 0) return;
    const cols = Object.keys(pipelineResult[0]);
    let csv = cols.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + '\n';
    pipelineResult.forEach(row => {
      csv += cols.map(c => {
        let val = row[c] !== undefined && row[c] !== null ? String(row[c]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',') + '\n';
    });
    downloadFile(csv, 'pipeline_output.csv', 'text/csv');
    showToast('Exported as CSV', 'success');
  });

  btnExportJSON.addEventListener('click', () => {
    if (pipelineResult.length === 0) return;
    const json = JSON.stringify(pipelineResult, null, 2);
    downloadFile(json, 'pipeline_output.json', 'application/json');
    showToast('Exported as JSON', 'success');
  });

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Init ───────────────────────────────────────────────────
  updateStats();
})();
