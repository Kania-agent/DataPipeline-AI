// DataPipeline-AI — ETL Pipeline Visualization
const canvas = document.getElementById('pipelineCanvas');
const ctx = canvas.getContext('2d');

const state = {
  running: false,
  progress: 0,
  nodes: [],
  connections: [],
  throughput: 0,
  recordsProcessed: 0,
  errors: 0,
  elapsed: 0,
  hoveredNode: null,
  animationFrame: null
};

// Pipeline node definitions
const nodeDefinitions = [
  { id: 'db', label: 'PostgreSQL', type: 'extract', icon: '🗄️', x: 80, y: 80, color: '#48cae4', status: 'idle', desc: 'Source database' },
  { id: 'api', label: 'REST API', type: 'extract', icon: '🌐', x: 80, y: 200, color: '#48cae4', status: 'idle', desc: 'External API feed' },
  { id: 'file', label: 'CSV Files', type: 'extract', icon: '📄', x: 80, y: 320, color: '#48cae4', status: 'idle', desc: 'File-based source' },
  { id: 'filter', label: 'Filter', type: 'transform', icon: '🔍', x: 320, y: 100, color: '#f4a261', status: 'idle', desc: 'Data filtering' },
  { id: 'map', label: 'Map', type: 'transform', icon: '🗺️', x: 320, y: 220, color: '#f4a261', status: 'idle', desc: 'Field mapping' },
  { id: 'agg', label: 'Aggregate', type: 'transform', icon: '📊', x: 320, y: 340, color: '#f4a261', status: 'idle', desc: 'Data aggregation' },
  { id: 'join', label: 'Join', type: 'transform', icon: '🔗', x: 500, y: 160, color: '#f4a261', status: 'idle', desc: 'Data join operation' },
  { id: 'validate', label: 'Validate', type: 'transform', icon: '✅', x: 500, y: 280, color: '#f4a261', status: 'idle', desc: 'Schema validation' },
  { id: 'dw', label: 'Warehouse', type: 'load', icon: '🏢', x: 720, y: 100, color: '#06d6a0', status: 'idle', desc: 'Data warehouse' },
  { id: 'cache', label: 'Redis Cache', type: 'load', icon: '⚡', x: 720, y: 220, color: '#06d6a0', status: 'idle', desc: 'In-memory cache' },
  { id: 'analytics', label: 'Analytics', type: 'load', icon: '📈', x: 720, y: 340, color: '#06d6a0', status: 'idle', desc: 'Analytics engine' },
];

const connectionDefs = [
  { from: 'db', to: 'filter' }, { from: 'db', to: 'map' },
  { from: 'api', to: 'filter' }, { from: 'api', to: 'map' },
  { from: 'file', to: 'map' }, { from: 'file', to: 'agg' },
  { from: 'filter', to: 'join' }, { from: 'map', to: 'join' },
  { from: 'map', to: 'validate' }, { from: 'agg', to: 'validate' },
  { from: 'join', to: 'dw' }, { from: 'join', to: 'cache' },
  { from: 'validate', to: 'cache' }, { from: 'validate', to: 'analytics' },
];

function initNodes() {
  state.nodes = nodeDefinitions.map(n => ({ ...n, pulsePhase: Math.random() * Math.PI * 2 }));
  state.connections = connectionDefs.map(c => ({
    ...c,
    progress: 0,
    active: false,
    particles: []
  }));
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  draw();
}

function getNodePos(id) {
  const n = state.nodes.find(n => n.id === id);
  return n ? { x: n.x + 65, y: n.y + 30 } : { x: 0, y: 0 };
}

function drawConnection(conn) {
  const from = getNodePos(conn.from);
  const to = getNodePos(conn.to);
  const midX = (from.x + to.x) / 2;

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(midX, from.y, midX, to.y, to.x, to.y);

  if (conn.active) {
    ctx.strokeStyle = 'rgba(0, 180, 216, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0, 180, 216, 0.4)';
    ctx.shadowBlur = 8;
  } else {
    ctx.strokeStyle = 'rgba(35, 53, 84, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw particles
  conn.particles.forEach(p => {
    const t = p.t;
    const x = Math.pow(1-t,3)*from.x + 3*Math.pow(1-t,2)*t*midX + 3*(1-t)*t*t*midX + t*t*t*to.x;
    const y = Math.pow(1-t,3)*from.y + 3*Math.pow(1-t,2)*t*from.y + 3*(1-t)*t*t*to.y + t*t*t*to.y;

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = p.active ? '#00b4d8' : 'rgba(0,180,216,0.3)';
    if (p.active) { ctx.shadowColor = '#00b4d8'; ctx.shadowBlur = 10; }
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function drawNode(node) {
  const w = 130, h = 60, r = 10;

  // Glow effect
  if (node.status === 'running') {
    const pulse = Math.sin(node.pulsePhase) * 0.3 + 0.7;
    ctx.shadowColor = node.color;
    ctx.shadowBlur = 15 * pulse;
  }

  // Node background
  ctx.fillStyle = node.status === 'running' ? 'rgba(26, 45, 74, 0.95)' : 'rgba(17, 34, 64, 0.9)';
  ctx.strokeStyle = node.status === 'running' ? node.color : 'rgba(35, 53, 84, 0.8)';
  ctx.lineWidth = node.status === 'running' ? 2 : 1;

  ctx.beginPath();
  ctx.roundRect(node.x, node.y, w, h, r);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Status dot
  const statusColors = { idle: '#8892a4', running: '#f4a261', complete: '#06d6a0', error: '#ef476f' };
  ctx.beginPath();
  ctx.arc(node.x + w - 14, node.y + 14, 5, 0, Math.PI * 2);
  ctx.fillStyle = statusColors[node.status];
  ctx.fill();

  // Icon + Label
  ctx.font = '18px sans-serif';
  ctx.fillText(node.icon, node.x + 12, node.y + 28);
  ctx.font = 'bold 12px "Segoe UI", sans-serif';
  ctx.fillStyle = '#e0e6ed';
  ctx.fillText(node.label, node.x + 38, node.y + 26);
  ctx.font = '10px "Segoe UI", sans-serif';
  ctx.fillStyle = '#8892a4';
  ctx.fillText(node.type.toUpperCase(), node.x + 38, node.y + 42);
}

function draw() {
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  ctx.clearRect(0, 0, w, h);

  state.connections.forEach(drawConnection);
  state.nodes.forEach(drawNode);
}

function addLog(msg, type = 'info') {
  const logs = document.getElementById('logEntries');
  const now = new Date();
  const time = now.toTimeString().slice(0, 8);
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-msg">${msg}</span>`;
  logs.prepend(entry);
  if (logs.children.length > 50) logs.lastChild.remove();
}

function updateMetrics() {
  document.getElementById('metricThroughput').textContent = state.throughput.toLocaleString() + '/s';
  document.getElementById('metricRecords').textContent = state.recordsProcessed.toLocaleString();
  document.getElementById('metricErrors').textContent = state.errors;
  document.getElementById('metricElapsed').textContent = state.elapsed + 's';
  document.getElementById('progressBar').style.width = state.progress + '%';
}

function simulatePipeline() {
  if (!state.running) return;

  const time = Date.now();

  // Advance pipeline stages sequentially
  const stageTimings = [
    { nodes: ['db', 'api', 'file'], end: 20 },
    { nodes: ['filter', 'map', 'agg'], end: 45 },
    { nodes: ['join', 'validate'], end: 70 },
    { nodes: ['dw', 'cache', 'analytics'], end: 95 },
  ];

  stageTimings.forEach(stage => {
    stage.nodes.forEach(id => {
      const node = state.nodes.find(n => n.id === id);
      if (state.progress < stage.end && state.progress >= (stage.end - 25)) {
        node.status = 'running';
        node.pulsePhase += 0.1;
      } else if (state.progress >= stage.end) {
        node.status = 'complete';
      }
    });
  });

  // Update connections
  state.connections.forEach(conn => {
    const fromNode = state.nodes.find(n => n.id === conn.from);
    const toNode = state.nodes.find(n => n.id === conn.to);
    conn.active = fromNode.status === 'complete' || fromNode.status === 'running';

    if (conn.active) {
      if (Math.random() < 0.15) {
        conn.particles.push({ t: 0, active: true });
      }
    }

    conn.particles = conn.particles.filter(p => {
      p.t += 0.02;
      if (p.t > 0.95) p.active = false;
      return p.t < 1;
    });
  });

  state.progress = Math.min(100, state.progress + 0.3);
  state.throughput = Math.floor(Math.random() * 5000 + 12000);
  state.recordsProcessed += Math.floor(Math.random() * 200 + 50);
  state.elapsed = Math.floor(state.progress * 0.5);

  if (Math.random() < 0.005) {
    state.errors++;
    addLog(`Warning: Retry on node ${state.nodes[Math.floor(Math.random() * state.nodes.length)].label}`, 'error');
  }

  if (Math.random() < 0.03) {
    const stages = ['Extract', 'Transform', 'Load'];
    addLog(`${stages[Math.floor(Math.random() * 3)]} batch completed`, 'success');
  }

  updateMetrics();
  draw();

  if (state.progress >= 100) {
    state.running = false;
    state.nodes.forEach(n => n.status = 'complete');
    addLog('Pipeline execution completed successfully!', 'success');
    document.getElementById('btnStart').textContent = '▶ Start Pipeline';
    draw();
    return;
  }

  state.animationFrame = requestAnimationFrame(simulatePipeline);
}

function startPipeline() {
  if (state.running) return;
  initNodes();
  state.running = true;
  state.progress = 0;
  state.throughput = 0;
  state.recordsProcessed = 0;
  state.errors = 0;
  state.elapsed = 0;
  addLog('Pipeline execution started', 'info');
  document.getElementById('btnStart').textContent = '⏳ Running...';
  document.getElementById('btnStart').disabled = true;
  setTimeout(() => { document.getElementById('btnStart').disabled = false; }, 1000);
  simulatePipeline();
}

function resetPipeline() {
  state.running = false;
  if (state.animationFrame) cancelAnimationFrame(state.animationFrame);
  initNodes();
  state.progress = 0;
  state.throughput = 0;
  state.recordsProcessed = 0;
  state.errors = 0;
  state.elapsed = 0;
  updateMetrics();
  draw();
  document.getElementById('btnStart').textContent = '▶ Start Pipeline';
  addLog('Pipeline reset', 'info');
}

// Canvas mouse events for tooltips
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const tooltip = document.getElementById('nodeTooltip');
  let found = false;

  for (const node of state.nodes) {
    if (mx >= node.x && mx <= node.x + 130 && my >= node.y && my <= node.y + 60) {
      tooltip.className = 'node-tooltip visible';
      tooltip.style.left = (node.x + 140) + 'px';
      tooltip.style.top = node.y + 'px';
      tooltip.innerHTML = `<h4>${node.icon} ${node.label}</h4><p>${node.desc}</p><p>Status: <strong>${node.status}</strong></p>`;
      found = true;
      break;
    }
  }

  if (!found) tooltip.className = 'node-tooltip';
});

// Init
window.addEventListener('resize', resizeCanvas);
document.getElementById('btnStart').addEventListener('click', startPipeline);
document.getElementById('btnReset').addEventListener('click', resetPipeline);

initNodes();
resizeCanvas();
addLog('DataPipeline-AI initialized', 'info');
addLog('Ready to process ETL workflows', 'info');
