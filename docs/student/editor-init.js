/* =========================================================
   VisionaryCode — Editor Accesible (US-01 al US-15)
   Archivo externo para evitar problemas de parsing HTML
   ========================================================= */

/* Ejemplos de código por lenguaje (US-01, US-04) */
var SAMPLES = {
  python: [
    '# VisionaryCode - Editor Accesible',
    '# Alt+L para leer esta linea en voz alta',
    '',
    'def calcular_promedio(lista):',
    '    if not lista:',
    '        return 0',
    '    return sum(lista) / len(lista)',
    '',
    'notas = [85, 92, 78, 95, 88]',
    'promedio = calcular_promedio(notas)',
    'print(f"Promedio de notas: {promedio:.1f}")',
    'print("Calculo completado con exito!")'
  ].join('\n'),

  javascript: [
    '// VisionaryCode - Editor Accesible',
    '',
    'function calcularPromedio(lista) {',
    '  if (lista.length === 0) return 0;',
    '  const suma = lista.reduce((a, b) => a + b, 0);',
    '  return suma / lista.length;',
    '}',
    '',
    'const notas = [85, 92, 78, 95, 88];',
    'const promedio = calcularPromedio(notas);',
    'console.log("Promedio: " + promedio.toFixed(1));',
    'console.log("Codigo ejecutado correctamente!");'
  ].join('\n'),

  htmlmixed: [
    'DOCTYPE html',
    'html lang=es',
    'head',
    '  meta charset=UTF-8',
    '  title Mi pagina title',
    'head',
    'body',
    '  h1 Hola mundo accesible h1',
    '  p Esta es mi primera pagina web. p',
    '  button type=button Clic aqui button',
    'body',
    'html'
  ].join('\n'),

  css: [
    '/* Estilos accesibles */',
    'body {',
    '  font-family: Arial, sans-serif;',
    '  font-size: 1rem;',
    '  color: #212121;',
    '  background: #FAFAFA;',
    '}',
    '',
    'h1 {',
    '  color: #005B60;',
    '  font-size: 2rem;',
    '}',
    '',
    'button {',
    '  background: #8CC63F;',
    '  color: #fff;',
    '  padding: .5rem 1rem;',
    '  border: none;',
    '  border-radius: 6px;',
    '  cursor: pointer;',
    '}'
  ].join('\n'),

  sql: [
    '-- Consulta accesible - VisionaryCode',
    'SELECT nombre, promedio',
    'FROM estudiantes',
    'WHERE promedio >= 80',
    'ORDER BY promedio DESC',
    'LIMIT 10;'
  ].join('\n')
};

/* Sugerencias de autocompletado (US-07) */
var SUGGEST = {
  python:      ['print(', 'def ', 'class ', 'import ', 'return ', 'if ', 'else:', 'elif ', 'for ', 'while ', 'len(', 'range(', 'list(', 'dict(', 'str(', 'int(', 'float(', 'input(', 'sum(', 'True', 'False', 'None'],
  javascript:  ['console.log(', 'function ', 'const ', 'let ', 'var ', 'return ', 'if (', 'else {', 'for (', 'while (', 'document.getElementById(', 'addEventListener(', 'querySelector(', 'fetch(', 'async ', 'await ', 'Promise', 'JSON.stringify('],
  htmlmixed:   ['html', 'head', 'body', 'h1', 'h2', 'p', 'div', 'span', 'a href', 'img src', 'button', 'form', 'input', 'label', 'ul', 'li', 'table', 'tr', 'td'],
  css:         ['display: flex;', 'display: grid;', 'margin: ', 'padding: ', 'color: ', 'background: ', 'font-size: ', 'border: ', 'border-radius: ', 'position: relative;', 'width: ', 'height: ', 'flex: 1;', 'gap: ', 'transition: all .2s;'],
  sql:         ['SELECT ', 'FROM ', 'WHERE ', 'ORDER BY ', 'GROUP BY ', 'INNER JOIN ', 'LEFT JOIN ', 'INSERT INTO ', 'UPDATE ', 'DELETE FROM ', 'LIMIT ', 'COUNT(*)', 'SUM(', 'AVG(', 'MAX(', 'MIN(']
};

/* ─── Estado global ─── */
var editor      = null;
var currentLang = 'python';
var isRunning   = false;
var saveTimer   = null;
var acEl        = null;
var acItems     = [];

/* ─── DB helper (envuelve localStorage) ─── */
var DB = window.DB || {
  get: function (k) {
    try { return JSON.parse(localStorage.getItem('vc_' + k) || 'null'); } catch (e) { return null; }
  },
  set: function (k, v) {
    try { localStorage.setItem('vc_' + k, JSON.stringify(v)); } catch (e) {}
  }
};

/* ─── TTS helper ─── */
function speak(text, priority) {
  if (window.TTS) { TTS.speak(text, priority); return; }
  if (window.speechSynthesis) {
    if (priority) speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    speechSynthesis.speak(u);
  }
}

/* ═══════════════════════════════════════════════
   INICIALIZACIÓN — espera a que todo cargue
   ═══════════════════════════════════════════════ */
window.addEventListener('load', function () {

  /* 1. Sesión demo si no hay usuario logueado */
  if (typeof seedData === 'function') seedData();
  if (!DB.get('currentUser')) {
    var students = DB.get('students') || [];
    DB.set('currentUser', students[0] || { id: 'demo', name: 'Demo Estudiante', role: 'student' });
  }

  /* 2. Limpiar código corrupto del localStorage */
  ['python', 'javascript', 'htmlmixed', 'css', 'sql'].forEach(function (lang) {
    var v = DB.get('savedCode_' + lang);
    if (v && typeof v === 'string' && (
      v.indexOf('join(') !== -1 ||
      v.indexOf('SAMPLES') !== -1 ||
      v.indexOf('SUGGEST') !== -1 ||
      v.indexOf('editor-init') !== -1 ||
      v.length > 50000
    )) {
      DB.set('savedCode_' + lang, null);
    }
  });

  /* 3. Crear CodeMirror directamente en el div (sin textarea) */
  var wrap = document.getElementById('editor-wrap');
  if (!wrap) return;

  if (typeof CodeMirror === 'undefined') {
    wrap.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;'
      + 'background:#F2F7F6;flex-direction:column;gap:1rem;padding:2rem;text-align:center">'
      + '<i class="fa-solid fa-triangle-exclamation fa-2x" style="color:#ef4444"></i>'
      + '<p><strong>No se pudo cargar el editor.</strong></p>'
      + '<p style="font-size:.88rem;color:#6b7280">Verifica tu conexion a internet y recarga la pagina.</p>'
      + '<button onclick="location.reload()" style="padding:.5rem 1.2rem;background:#005B60;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.9rem">Recargar</button>'
      + '</div>';
    return;
  }

  editor = CodeMirror(wrap, {
    value          : getCode('python'),
    mode           : 'python',
    theme          : 'dracula',
    lineNumbers    : true,
    autoCloseBrackets: true,
    matchBrackets  : true,
    tabSize        : 4,
    indentWithTabs : false,
    lineWrapping   : false,
    extraKeys: {
      'Ctrl-Enter'   : function () { runCode();     return false; },
      'Ctrl-S'       : function () { saveCode();    return false; },
      'Ctrl-Shift-S' : function () { stopRun();     return false; },
      'Alt-L'        : function () { readLine();    return false; },
      'Alt-N'        : function () { announcePos(); return false; },
      'Alt-V'        : function () { checkSyntax(); return false; },
      'Alt-H'        : function () { openModal();   return false; },
      'Ctrl-Space'   : function () { showAC();      return false; },
      'Alt-Down'     : function () { jumpBlock(1);  return false; },
      'Alt-Up'       : function () { jumpBlock(-1); return false; },
      'Tab': function (cm) {
        if (acEl && acEl.style.display === 'block') { acceptAC(); return false; }
        cm.execCommand('indentMore');
      },
      'Escape': function () {
        hideAC();
        if (window.speechSynthesis) speechSynthesis.cancel();
      }
    }
  });

  /* Tamaño y foco */
  setTimeout(function () { editor.refresh(); editor.focus(); }, 100);
  window.addEventListener('resize', function () { if (editor) editor.refresh(); });

  /* Cursor → status bar (US-11) + preview (US-02) */
  editor.on('cursorActivity', function () {
    var c  = editor.getCursor();
    var ln = c.line;
    var ch = c.ch;
    document.getElementById('st-ln').textContent  = ln + 1;
    document.getElementById('st-col').textContent = ch + 1;
    var line = editor.getLine(ln) || '';
    var sp   = (line.match(/^(\s*)/) || ['', ''])[1].length;
    document.getElementById('st-lv').textContent = Math.floor(sp / 4);
    document.getElementById('line-box').textContent =
      'L' + (ln + 1) + ': ' + (line.trim() || '(linea vacia)');
  });

  /* Cambios → autocompletar + marcar sin guardar (US-07, US-10) */
  editor.on('change', function () {
    clearTimeout(window._acT);
    window._acT = setTimeout(function () {
      var cur  = editor.getCursor();
      var line = editor.getLine(cur.line).substring(0, cur.ch);
      var word = (line.match(/[\w.]+$/) || [''])[0];
      if (word.length >= 2) showACSuggestions(word);
      else hideAC();
    }, 280);
    markUnsaved();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { autoSave(); }, 120000);
  });

  /* Bienvenida */
  setTimeout(function () {
    speak('Editor de codigo VisionaryCode listo. Ctrl+Enter para ejecutar. Alt+H para atajos.');
  }, 900);
});

/* ═══════════════════════
   HELPERS DE UI
   ═══════════════════════ */
function getCode(lang) {
  var saved = DB.get('savedCode_' + lang);
  var ok = saved
    && typeof saved === 'string'
    && saved.trim().length > 0
    && saved.length < 50000
    && saved.indexOf('join(') === -1
    && saved.indexOf('SAMPLES') === -1;
  return ok ? saved : (SAMPLES[lang] || '');
}

function setStatus(html) {
  var el = document.getElementById('st-msg');
  if (el) el.innerHTML = html;
}

function markUnsaved() {
  var b = document.getElementById('save-badge');
  var t = document.getElementById('save-txt');
  if (b) b.classList.add('pending');
  if (t) t.textContent = 'Sin guardar';
}

function markSaved() {
  var b = document.getElementById('save-badge');
  var t = document.getElementById('save-txt');
  if (b) b.classList.remove('pending');
  if (t) t.textContent = 'Guardado';
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cLog(msg, cls) {
  var c = document.getElementById('console-out');
  if (!c) return;
  var d = document.createElement('div');
  d.className = 'cl cl-' + (cls || 'info');
  d.textContent = msg;
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

/* ═══════════════════════════════
   US-02, US-03: LECTOR DE LÍNEA
   ═══════════════════════════════ */
function readLine() {
  if (!editor) return;
  var c   = editor.getCursor();
  var ln  = editor.getLine(c.line) || '';
  var sp  = (ln.match(/^(\s*)/) || ['', ''])[1].length;
  var lv  = Math.floor(sp / 4);
  var txt = (lv ? 'Nivel ' + lv + '. ' : '') + (ln.trim() || 'Linea vacia');
  if (window.TTS) TTS.speakCode(txt);
  else speak(txt);
}

function announcePos() {
  if (!editor) return;
  var c = editor.getCursor();
  speak('Linea ' + (c.line + 1) + ', columna ' + (c.ch + 1), true);
}

/* ══════════════════════════
   US-12: SALTAR BLOQUES
   ══════════════════════════ */
var BLOCK_RE = /^(def |class |function |async function |if |else|elif |for |while |const |let |var |switch )/;

function jumpBlock(dir) {
  if (!editor) return;
  var cur   = editor.getCursor();
  var total = editor.lineCount();
  var start = cur.line + dir;
  var end   = dir > 0 ? total : -1;
  for (var i = start; i !== end; i += dir) {
    if (BLOCK_RE.test((editor.getLine(i) || '').trim())) {
      editor.setCursor(i, 0);
      editor.focus();
      speak('Bloque: ' + (editor.getLine(i) || '').trim().substring(0, 50));
      return;
    }
  }
  speak(dir > 0 ? 'No hay mas bloques abajo.' : 'No hay mas bloques arriba.');
}

/* ══════════════════════════
   US-08: VERIFICAR SINTAXIS
   ══════════════════════════ */
function checkSyntax() {
  if (!editor) return;
  var code   = editor.getValue();
  var errors = [];
  var stack  = [];
  var pairs  = { ')': '(', ']': '[', '}': '{' };
  var opens  = { '(': 1, '[': 1, '{': 1 };
  var inStr  = false;
  var strCh  = '';

  for (var i = 0; i < code.length; i++) {
    var ch = code[i];
    if (inStr) {
      if (ch === strCh && code[i - 1] !== '\\') inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strCh = ch; continue; }
    if (opens[ch]) { stack.push(ch); continue; }
    if (pairs[ch]) {
      if (!stack.length || stack[stack.length - 1] !== pairs[ch])
        errors.push("'" + ch + "' sin par de apertura");
      else stack.pop();
    }
  }
  stack.forEach(function (c) { errors.push("'" + c + "' sin cerrar"); });

  var panel = document.getElementById('err-panel');
  if (!panel) return;

  if (errors.length === 0) {
    panel.innerHTML = '<p style="font-size:.78rem;color:#8CC63F">&#x2713; Sin errores.</p>';
    speak('Sin errores de sintaxis.', true);
    setStatus('&#x2713; OK');
  } else {
    panel.innerHTML = errors.map(function (e) {
      return '<div style="font-size:.76rem;color:#ef4444;padding:.2rem 0">&#x2715; ' + esc(e) + '</div>';
    }).join('');
    speak(errors.length + ' error(es). ' + errors[0], true);
    setStatus('&#x2715; ' + errors.length + ' error(es)');
  }
}

/* ══════════════════════════
   US-07: AUTOCOMPLETADO
   ══════════════════════════ */
function showAC() {
  if (!editor) return;
  var cur  = editor.getCursor();
  var line = editor.getLine(cur.line).substring(0, cur.ch);
  showACSuggestions((line.match(/[\w.]+$/) || [''])[0]);
}

function showACSuggestions(prefix) {
  if (!prefix) { hideAC(); return; }
  var list = (SUGGEST[currentLang] || []).filter(function (s) {
    return s.toLowerCase().indexOf(prefix.toLowerCase()) === 0 && s !== prefix;
  }).slice(0, 8);

  if (!list.length) { hideAC(); return; }
  acItems = list;

  if (!acEl) {
    acEl = document.createElement('div');
    acEl.style.cssText =
      'position:absolute;z-index:500;background:#fff;border:2px solid #005B60;'
      + 'border-radius:6px;box-shadow:0 4px 16px rgba(0,91,96,.15);'
      + 'min-width:200px;max-height:190px;overflow-y:auto;display:none';
    document.getElementById('editor-wrap').appendChild(acEl);
  }

  acEl.innerHTML = list.map(function (s, i) {
    return '<div style="padding:.34rem .85rem;cursor:pointer;font-size:.82rem;font-family:Fira Code,monospace;'
      + (i === 0 ? 'background:#E0F2F1;color:#005B60' : 'color:#212121')
      + '" onmousedown="event.preventDefault();acceptSug(\'' + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\')">'
      + esc(s) + '</div>';
  }).join('');

  acEl.style.display = 'block';
  var prev = document.getElementById('ac-preview');
  if (prev) prev.textContent = list[0];
  speak('Sugerencia: ' + list[0] + '. Tab para aceptar.');
}

function hideAC() {
  if (acEl) acEl.style.display = 'none';
}

function acceptAC() {
  if (acItems[0]) acceptSug(acItems[0]);
}

function acceptSug(s) {
  if (!editor || !s) return;
  var cur    = editor.getCursor();
  var line   = editor.getLine(cur.line).substring(0, cur.ch);
  var prefix = (line.match(/[\w.]+$/) || [''])[0];
  editor.replaceRange(s, { line: cur.line, ch: cur.ch - prefix.length }, cur);
  hideAC();
  editor.focus();
}

/* ═══════════════════════════════
   US-13: EJECUTAR CÓDIGO
   ═══════════════════════════════ */
function runCode() {
  if (!editor || isRunning) return;
  isRunning = true;
  document.getElementById('btn-run').disabled = true;
  document.getElementById('btn-stop').classList.add('visible');
  setStatus('&#9658; Ejecutando&hellip;');
  cLog('▶ Ejecutando ' + currentLang + '...', 'info');
  speak('Ejecutando codigo.');

  setTimeout(function () {
    if (!isRunning) return;
    var code = editor.getValue();
    try {
      var out = '';
      if (currentLang === 'javascript') {
        out = execJS(code);
      } else if (currentLang === 'python') {
        out = execPython(code);
      } else if (currentLang === 'htmlmixed') {
        var tags = (code.match(/[a-zA-Z]+/g) || []).length;
        out = 'HTML procesado — ' + tags + ' elemento(s) detectado(s).';
      } else if (currentLang === 'css') {
        var rules = (code.match(/\{/g) || []).length;
        out = 'CSS procesado — ' + rules + ' regla(s) detectada(s).';
      } else if (currentLang === 'sql') {
        var stmts = (code.match(/;/g) || []).length || 1;
        out = 'SQL procesado — ' + stmts + ' sentencia(s).';
      }

      out.split('\n').forEach(function (ln) { cLog(ln || ' ', 'ok'); });
      setStatus('&#x2713; Ejecutado');
      speak('Ejecucion completada.', true);
      var ep = document.getElementById('err-panel');
      if (ep) ep.innerHTML = '<p style="font-size:.78rem;color:#8CC63F">&#x2713; Sin errores.</p>';

    } catch (err) {
      cLog('Error: ' + err.message, 'err');
      setStatus('&#x2715; Error');
      speak('Error: ' + err.message, true);
      var ep2 = document.getElementById('err-panel');
      if (ep2) ep2.innerHTML = '<div style="font-size:.76rem;color:#ef4444;padding:.2rem 0">&#x2715; ' + esc(err.message) + '</div>';
    }

    isRunning = false;
    document.getElementById('btn-run').disabled = false;
    document.getElementById('btn-stop').classList.remove('visible');
    setTimeout(function () {
      var co = document.getElementById('console-out');
      if (co) co.focus();
    }, 120);
  }, 400);
}

/* US-15: Detener */
function stopRun() {
  isRunning = false;
  document.getElementById('btn-run').disabled = false;
  document.getElementById('btn-stop').classList.remove('visible');
  cLog('Ejecucion detenida.', 'warn');
  speak('Detenido.', true);
  setStatus('&#x23F9; Detenido');
}

/* US-10: Guardar */
function saveCode() {
  if (!editor) return;
  DB.set('savedCode_' + currentLang, editor.getValue());
  markSaved();
  setStatus('Guardado');
  speak('Codigo guardado.');
}

function autoSave() {
  if (!editor) return;
  DB.set('savedCode_' + currentLang, editor.getValue());
  markSaved();
}

/* Reset */
function resetCode() {
  if (!editor) return;
  if (!confirm('Restablecer el codigo de ejemplo?')) return;
  DB.set('savedCode_' + currentLang, null);
  editor.setValue(SAMPLES[currentLang] || '');
  markSaved();
  cLog('Codigo restablecido.', 'info');
  speak('Codigo restablecido.');
  editor.focus();
}

/* US-04: Cambiar lenguaje */
function changeLang(lang) {
  if (!editor) return;
  currentLang = lang;
  editor.setOption('mode', lang);
  editor.setValue(getCode(lang));
  markSaved();
  setStatus('');
  var ep = document.getElementById('err-panel');
  if (ep) ep.innerHTML = '<p style="font-size:.78rem;color:#6b7280">Sin errores &#x2713;</p>';
  editor.focus();
  speak('Lenguaje: ' + lang + '.');
}

/* Limpiar consola */
function clearConsole() {
  var c = document.getElementById('console-out');
  if (c) c.innerHTML = '<div class="cl cl-info">&#9658; Consola limpiada.</div>';
  speak('Consola limpiada.');
}

/* ══════════════════════════
   MODAL ATAJOS (US-09)
   ══════════════════════════ */
function openModal() {
  var m = document.getElementById('modal-sc');
  if (m) m.classList.add('open');
  speak('Atajos: Ctrl+Enter ejecutar, Alt+L leer linea, Escape cerrar.', true);
}

function closeModal() {
  var m = document.getElementById('modal-sc');
  if (m) m.classList.remove('open');
  if (editor) editor.focus();
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    var m = document.getElementById('modal-sc');
    if (m && m.classList.contains('open')) {
      closeModal(); e.preventDefault();
    } else {
      hideAC();
      if (window.speechSynthesis) speechSynthesis.cancel();
    }
  }
});

/* ═══════════════════════
   SIMULADORES DE EJECUCIÓN
   ═══════════════════════ */

/* JavaScript real */
function execJS(code) {
  var out  = [];
  var mock = {
    log:   function () { out.push([].slice.call(arguments).map(fv).join(' ')); },
    error: function () { out.push('[error] ' + [].slice.call(arguments).join(' ')); },
    warn:  function () { out.push('[warn] '  + [].slice.call(arguments).join(' ')); },
    info:  function () { out.push([].slice.call(arguments).join(' ')); }
  };
  (new Function('console', code))(mock);
  return out.length ? out.join('\n') : '(Sin salida en consola)';
}

function fv(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch (e) { return String(v); } }
  return String(v);
}

/* Python simulado */
function execPython(code) {
  var out   = [];
  var vars  = {};
  var lines = code.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.charAt(0) === '#') continue;

    var pm = line.match(/^print\s*\((.+)\)$/);
    if (pm) { out.push(pyPrint(pm[1].trim(), vars)); continue; }

    var am = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (am) { vars[am[1]] = pyEval(am[2].trim(), vars); }
  }
  return out.length ? out.join('\n') : '(Sin salida en consola)';
}

function pyPrint(expr, vars) {
  var fm = expr.match(/^f["'](.+)["']$/);
  if (fm) {
    return fm[1].replace(/\{([^}:]+)(?::([^}]+))?\}/g, function (_, key, spec) {
      var val = key in vars ? vars[key] : pyEval(key.trim(), vars);
      if (spec && typeof val === 'number' && spec.slice(-1) === 'f') {
        return val.toFixed(parseInt(spec) || 2);
      }
      return val !== undefined ? String(val) : key;
    });
  }
  var sm = expr.match(/^["'](.*)["']$/);
  if (sm) return sm[1];
  var v = pyEval(expr, vars);
  return v !== undefined ? String(v) : expr;
}

function pyEval(expr, vars) {
  expr = expr.trim();
  if (/^-?[\d.]+$/.test(expr)) return parseFloat(expr);
  var sm = expr.match(/^["'](.*)["']$/);
  if (sm) return sm[1];
  if (expr === 'True') return true;
  if (expr === 'False') return false;
  if (expr === 'None') return null;
  if (expr in vars) return vars[expr];

  var lm = expr.match(/^len\(([^)]+)\)$/);
  if (lm) {
    var lv = pyEval(lm[1].trim(), vars);
    return Array.isArray(lv) ? lv.length : String(lv).length;
  }

  var sm2 = expr.match(/^sum\(([^)]+)\)$/);
  if (sm2) {
    var sv = pyEval(sm2[1].trim(), vars);
    return Array.isArray(sv) ? sv.reduce(function (a, b) { return a + b; }, 0) : 0;
  }

  var lm2 = expr.match(/^\[(.+)\]$/);
  if (lm2) { try { return JSON.parse('[' + lm2[1] + ']'); } catch (e) {} }

  try {
    var safe = expr;
    Object.keys(vars).forEach(function (k) {
      safe = safe.replace(new RegExp('\\b' + k + '\\b', 'g'), JSON.stringify(vars[k]));
    });
    return (new Function('return (' + safe + ')'))();
  } catch (e) { return expr; }
}
