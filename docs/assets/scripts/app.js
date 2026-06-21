/* ===== VISIONARYCODE — SHARED APP LOGIC ===== */

/* ---------- localStorage helpers ---------- */
const DB = {
  get: (k) => JSON.parse(localStorage.getItem('vc_' + k) || 'null'),
  set: (k, v) => localStorage.setItem('vc_' + k, JSON.stringify(v)),
  push: (k, item) => { const arr = DB.get(k) || []; arr.push(item); DB.set(k, arr); },
};

/* ---------- Seed initial data ---------- */
function seedData() {
  if (DB.get('seeded')) return;

  DB.set('mentors', [
    { id: 'm1', name: 'Carlos Méndez', email: 'carlos@vc.pe', role: 'mentor', langs: ['Python', 'JavaScript'], rating: 4.8, sessions: 32, available: true, hours: 18 },
    { id: 'm2', name: 'Ana Torres', email: 'ana@vc.pe', role: 'mentor', langs: ['JavaScript', 'React', 'Node.js'], rating: 4.9, sessions: 45, available: true, hours: 24 },
    { id: 'm3', name: 'Luis Paredes', email: 'luis@vc.pe', role: 'mentor', langs: ['Python', 'SQL'], rating: 4.6, sessions: 21, available: false, hours: 10 },
    { id: 'm4', name: 'María Quispe', email: 'maria@vc.pe', role: 'mentor', langs: ['TypeScript', 'React', 'Node.js'], rating: 4.7, sessions: 28, available: true, hours: 15 },
    { id: 'm5', name: 'Diego Flores', email: 'diego@vc.pe', role: 'mentor', langs: ['JavaScript', 'Python', 'SQL'], rating: 4.5, sessions: 15, available: true, hours: 8 },
  ]);

  DB.set('students', [
    { id: 's1', name: 'Demo Estudiante', email: 'estudiante@vc.pe', role: 'student', progress: 65, badges: ['primer-codigo', 'sin-errores'], completedModules: 3, totalModules: 5 },
  ]);

  DB.set('history', [
    { id: 'h1', studentId: 's1', mentorId: 'm1', mentorName: 'Carlos Méndez', topic: 'Python - Funciones recursivas', date: '2026-06-10', duration: 45, rating: 5 },
    { id: 'h2', studentId: 's1', mentorId: 'm2', mentorName: 'Ana Torres', topic: 'JavaScript - Promesas y async/await', date: '2026-06-14', duration: 60, rating: 5 },
    { id: 'h3', studentId: 's1', mentorId: 'm4', mentorName: 'María Quispe', topic: 'TypeScript - Tipos generics', date: '2026-06-18', duration: 30, rating: 4 },
  ]);

  DB.set('queue', []);
  DB.set('seeded', true);
}

/* ---------- Auth ---------- */
const Auth = {
  login(email, password) {
    const mentors = DB.get('mentors') || [];
    const students = DB.get('students') || [];
    const all = [...mentors, ...students];
    const user = all.find(u => u.email === email);
    if (!user) return null;
    DB.set('currentUser', user);
    return user;
  },
  register(data) {
    if (data.role === 'student') {
      const s = { id: 's' + Date.now(), ...data, progress: 0, badges: [], completedModules: 0, totalModules: 5 };
      const arr = DB.get('students') || [];
      arr.push(s); DB.set('students', arr);
      DB.set('currentUser', s);
      return s;
    } else {
      const m = { id: 'm' + Date.now(), ...data, rating: 0, sessions: 0, available: false, hours: 0 };
      const arr = DB.get('mentors') || [];
      arr.push(m); DB.set('mentors', arr);
      DB.set('currentUser', m);
      return m;
    }
  },
  logout() { localStorage.removeItem('vc_currentUser'); window.location.href = '../auth/login.html'; },
  current() { return DB.get('currentUser'); },
  requireStudent() {
    const u = Auth.current();
    if (!u || u.role !== 'student') { window.location.href = '../auth/login.html'; return null; }
    return u;
  },
  requireMentor() {
    const u = Auth.current();
    if (!u || u.role !== 'mentor') { window.location.href = '../auth/login.html'; return null; }
    return u;
  },
};

/* ---------- Toast ---------- */
function toast(msg, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.animation = 'fadeOut .3s ease forwards'; setTimeout(() => el.remove(), 300); }, duration);
}

/* ---------- Accessibility: TTS (Screen Reader Simulation) ---------- */
const TTS = {
  synth: window.speechSynthesis,
  rate: 1,
  pitch: 1,
  voice: null,
  earcons: true,
  externalReader: false,
  pronunciationMap: {
    '{': 'abrir llave', '}': 'cerrar llave',
    '(': 'abrir paréntesis', ')': 'cerrar paréntesis',
    '[': 'abrir corchete', ']': 'cerrar corchete',
    '<': 'menor que', '>': 'mayor que',
    '=': 'igual', '==': 'igual igual', '===': 'igual estricto',
    '!=': 'diferente', '!==': 'diferente estricto',
    '&&': 'Y lógico', '||': 'O lógico',
    '=>': 'flecha', '->': 'flecha derecha',
    '+': 'más', '-': 'menos', '*': 'asterisco', '/': 'barra', '%': 'módulo',
    '#': 'numeral', '@': 'arroba', '!': 'exclamación', ';': 'punto y coma',
    ':': 'dos puntos', ',': 'coma', '.': 'punto', '"': 'comilla doble', "'": 'comilla simple',
  },

  loadSettings() {
    const s = DB.get('a11y') || {};
    this.rate = s.rate || 1;
    this.pitch = s.pitch || 1;
    this.earcons = s.earcons !== false;
    this.externalReader = s.externalReader || false;
    if (s.voiceUri && this.synth) {
      const voices = this.synth.getVoices();
      this.voice = voices.find(v => v.voiceURI === s.voiceUri) || null;
    }
    if (s.fontScale) document.documentElement.style.setProperty('--font-scale', s.fontScale);
    if (s.highContrast) document.body.classList.add('high-contrast');
    this.applyCustomShortcuts();
  },

  speak(text, priority = false) {
    if (this.externalReader) return;
    if (!this.synth) return;
    if (priority) this.synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = this.rate; u.pitch = this.pitch; u.lang = 'es-ES';
    if (this.voice) u.voice = this.voice;
    this.synth.speak(u);
    this.announce(text);
  },

  speakCode(line) {
    if (this.externalReader) return;
    let t = line;
    Object.entries(this.pronunciationMap).forEach(([sym, name]) => {
      t = t.split(sym).join(' ' + name + ' ');
    });
    this.speak(t);
  },

  announce(text) {
    let live = document.getElementById('aria-live');
    if (!live) { live = document.createElement('div'); live.id = 'aria-live'; live.setAttribute('aria-live', 'assertive'); live.setAttribute('aria-atomic', 'true'); live.className = 'sr-only'; document.body.appendChild(live); }
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = text; });
  },

  /* Earcons via AudioContext (US-04, US-05, US-10, US-47) */
  playEarcon(type) {
    if (!this.earcons) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);

      const configs = {
        success: { freq: 880, type: 'sine', duration: 0.4, env: [0, 0.3, 0.3, 0] },
        error:   { freq: 220, type: 'sawtooth', duration: 0.5, env: [0, 0.4, 0.1, 0] },
        save:    { freq: 660, type: 'sine', duration: 0.2, env: [0, 0.1, 0.1, 0] },
        badge:   { freq: [523, 659, 784], type: 'sine', duration: 0.8 },
        notify:  { freq: 440, type: 'sine', duration: 0.3, env: [0, 0.2, 0.2, 0] },
        disconnect: { freq: 330, type: 'sawtooth', duration: 0.6, env: [0, 0.3, 0.1, 0] },
      };

      const c = configs[type] || configs.notify;

      if (Array.isArray(c.freq)) {
        // Chord / arpeggio
        c.freq.forEach((f, i) => {
          const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
          o2.connect(g2); g2.connect(ctx.destination);
          o2.frequency.value = f; o2.type = 'sine';
          const t = ctx.currentTime + i * 0.15;
          g2.gain.setValueAtTime(0.2, t);
          g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
          o2.start(t); o2.stop(t + 0.4);
        });
      } else {
        osc.frequency.value = c.freq; osc.type = c.type;
        const env = c.env || [0, 0.3, 0.1, 0];
        gain.gain.setValueAtTime(env[0], ctx.currentTime);
        gain.gain.linearRampToValueAtTime(env[1], ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(env[2], ctx.currentTime + c.duration * 0.8);
        gain.gain.linearRampToValueAtTime(env[3], ctx.currentTime + c.duration);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + c.duration);
      }
    } catch(e) { /* AudioContext may require user gesture */ }
  },

  applyCustomShortcuts() {
    const customs = DB.get('customShortcuts') || {};
    Object.entries(customs).forEach(([action, key]) => {
      window._customShortcuts = window._customShortcuts || {};
      window._customShortcuts[action] = key;
    });
  },
};

/* ---------- Navbar user info ---------- */
function renderNavUser() {
  const u = Auth.current();
  if (!u) return;
  const el = document.getElementById('nav-user');
  if (!el) return;
  const initials = u.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  el.innerHTML = `<div class="nav-user">
    <div class="avatar-sm" aria-hidden="true">${initials}</div>
    <span>${u.name}</span>
    <button class="btn btn-ghost btn-sm" onclick="Auth.logout()">Salir</button>
  </div>`;
}

/* ---------- Mentoring helpers ---------- */
const Mentoring = {
  getAvailableMentors(lang = '') {
    const mentors = DB.get('mentors') || [];
    return mentors.filter(m => m.available && (!lang || m.langs.includes(lang)));
  },
  requestMentor(studentId, lang, problem) {
    const queue = DB.get('queue') || [];
    const existing = queue.find(q => q.studentId === studentId && q.status === 'waiting');
    if (existing) return existing;
    const req = { id: 'q' + Date.now(), studentId, lang, problem, status: 'waiting', createdAt: new Date().toISOString() };
    queue.push(req); DB.set('queue', queue);
    return req;
  },
  cancelRequest(studentId) {
    let queue = DB.get('queue') || [];
    queue = queue.filter(q => !(q.studentId === studentId && q.status === 'waiting'));
    DB.set('queue', queue);
  },
  acceptRequest(reqId, mentorId) {
    const queue = DB.get('queue') || [];
    const req = queue.find(q => q.id === reqId);
    if (!req) return null;
    req.status = 'active'; req.mentorId = mentorId;
    DB.set('queue', queue);
    DB.set('activeSession', { ...req, startTime: new Date().toISOString() });
    return req;
  },
  getPendingRequests() {
    const queue = DB.get('queue') || [];
    return queue.filter(q => q.status === 'waiting');
  },
  addRating(historyId, rating) {
    const history = DB.get('history') || [];
    const item = history.find(h => h.id === historyId);
    if (item) { item.rating = rating; DB.set('history', history); }
  },
  addReport(mentorId, reason, studentId) {
    const reports = DB.get('reports') || [];
    reports.push({ id: 'r' + Date.now(), mentorId, reason, studentId: 'anonymous', date: new Date().toISOString() });
    DB.set('reports', reports);
  },
  toggleMentorAvailability(mentorId) {
    const mentors = DB.get('mentors') || [];
    const m = mentors.find(m => m.id === mentorId);
    if (m) { m.available = !m.available; DB.set('mentors', mentors); DB.set('currentUser', m); return m.available; }
    return false;
  },
  endSession(sessionId, duration) {
    const session = DB.get('activeSession');
    if (!session) return;
    const mentors = DB.get('mentors') || [];
    const mentor = mentors.find(m => m.id === session.mentorId);
    if (mentor) {
      mentor.hours = (mentor.hours || 0) + Math.round(duration / 60);
      DB.set('mentors', mentors);
      // update currentUser if mentor
      const cu = Auth.current();
      if (cu && cu.role === 'mentor' && cu.id === mentor.id) DB.set('currentUser', mentor);
    }
    const hist = DB.get('history') || [];
    hist.push({ id: 'h' + Date.now(), studentId: session.studentId, mentorId: session.mentorId, mentorName: mentor?.name || '', topic: session.problem || '', date: new Date().toISOString().split('T')[0], duration: Math.round(duration / 60), rating: 0 });
    DB.set('history', hist);
    DB.set('activeSession', null);
    let queue = DB.get('queue') || [];
    queue = queue.filter(q => q.id !== session.id);
    DB.set('queue', queue);
  },
};

/* ---------- Progress helpers ---------- */
const Progress = {
  BADGES: {
    'primer-codigo':    { name: 'Primer Código', icon: '🚀', desc: 'Ejecutaste tu primer programa' },
    'sin-errores':      { name: 'Sin Errores', icon: '✅', desc: 'Compilaste sin errores 5 veces' },
    'colaborador':      { name: 'Colaborador', icon: '🤝', desc: 'Completaste 3 sesiones de tutoría' },
    'acelerador':       { name: 'Acelerador', icon: '⚡', desc: 'Completaste el 50% del curso' },
    'maestro':          { name: 'Maestro del Código', icon: '🎓', desc: 'Completaste todos los módulos' },
  },
  update(studentId, delta) {
    const students = DB.get('students') || [];
    const s = students.find(s => s.id === studentId);
    if (!s) return;
    s.progress = Math.min(100, (s.progress || 0) + delta);
    const cu = Auth.current();
    if (cu && cu.id === studentId) { cu.progress = s.progress; DB.set('currentUser', cu); }
    DB.set('students', students);
    this.checkBadges(s);
  },
  checkBadges(student) {
    const earned = student.badges || [];
    const toGrant = [];
    if (!earned.includes('primer-codigo') && student.progress >= 5) toGrant.push('primer-codigo');
    if (!earned.includes('acelerador') && student.progress >= 50) toGrant.push('acelerador');
    if (!earned.includes('maestro') && student.progress >= 100) toGrant.push('maestro');
    toGrant.forEach(b => {
      earned.push(b);
      TTS.playEarcon('badge');
      TTS.speak(`¡Felicidades! Obtuviste la insignia: ${this.BADGES[b].name}`, true);
      toast(`🏆 Nueva insignia: ${this.BADGES[b].name}`, 'success', 5000);
    });
    student.badges = earned;
    const students = DB.get('students') || [];
    const idx = students.findIndex(s => s.id === student.id);
    if (idx >= 0) students[idx] = student;
    DB.set('students', students);
  },
  grantBadge(studentId, badgeId) {
    const students = DB.get('students') || [];
    const s = students.find(s => s.id === studentId);
    if (!s || s.badges.includes(badgeId)) return;
    s.badges.push(badgeId);
    DB.set('students', students);
    const cu = Auth.current();
    if (cu && cu.id === studentId) { cu.badges = s.badges; DB.set('currentUser', cu); }
  },
};

/* ---------- Certificate generation (print-based) ---------- */
function generateCertificate(type = 'student') {
  const u = Auth.current();
  if (!u) return;
  const win = window.open('', '_blank', 'width=900,height=650');
  const today = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
  const content = type === 'student' ? `
    <h1 style="color:#005B60;font-size:2.5rem;margin-bottom:.5rem">Certificado de Finalización</h1>
    <p style="font-size:1.1rem;color:#6b7280">Este documento certifica que</p>
    <h2 style="font-size:2rem;margin:1rem 0;color:#1f2937">${u.name}</h2>
    <p>ha completado exitosamente la ruta de aprendizaje de programación accesible en</p>
    <h3 style="color:#005B60;font-size:1.5rem;margin:.75rem 0">VisionaryCode</h3>
    <p>demostrando competencias en programación inclusiva.</p>
  ` : `
    <h1 style="color:#005B60;font-size:2.5rem;margin-bottom:.5rem">Constancia de Mentoría Voluntaria</h1>
    <p style="font-size:1.1rem;color:#6b7280">Se otorga la presente constancia a</p>
    <h2 style="font-size:2rem;margin:1rem 0;color:#1f2937">${u.name}</h2>
    <p>por su contribución de <strong>${u.hours || 0} horas</strong> de mentoría inclusiva en</p>
    <h3 style="color:#005B60;font-size:1.5rem;margin:.75rem 0">VisionaryCode</h3>
    <p>apoyando a estudiantes tecnológicos con necesidades especiales.</p>
  `;
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Certificado - VisionaryCode</title>
    <style>
      body{font-family:Georgia,serif;background:#F2F7F6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
      .cert{background:#fff;border:4px solid #005B60;border-radius:16px;padding:3rem;max-width:700px;width:90%;text-align:center;box-shadow:0 8px 40px rgba(0,91,96,.15);}
      .logo{font-size:1.2rem;font-weight:700;color:#005B60;margin-bottom:2rem;}
      .date{color:#6b7280;font-size:.9rem;margin-top:2rem;}
      .signature{border-top:2px solid #e5e7eb;padding-top:1rem;margin-top:2rem;color:#6b7280;font-size:.85rem;}
      @media print{body{background:#fff;}}
    </style>
  </head><body><div class="cert" role="main" aria-label="Certificado">
    <div class="logo">⬡ VisionaryCode</div>
    ${content}
    <p class="date">Emitido el ${today}</p>
    <div class="signature"><p>Plataforma de Educación Inclusiva VisionaryCode</p><p style="margin-top:.5rem;font-style:italic">Este documento es accesible para lectores de pantalla</p></div>
    <button onclick="window.print()" style="margin-top:1.5rem;padding:.6rem 1.5rem;background:#005B60;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem;">Imprimir / Guardar PDF</button>
  </div></body></html>`);
  win.document.close();
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  seedData();
  TTS.loadSettings();
  renderNavUser();

  // Keyboard shortcut: Alt+H = read shortcut help
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'h') {
      TTS.speak('Atajos disponibles: Alt H ayuda. Alt S guardar. Control Enter ejecutar código. Alt Flecha Derecha aumentar velocidad de voz. Alt Flecha Izquierda disminuir velocidad. Escape cancelar lectura.', true);
    }
    if (e.key === 'Escape') { TTS.synth && TTS.synth.cancel(); }
    // Voice speed (US-36)
    if (e.altKey && e.key === 'ArrowRight') {
      TTS.rate = Math.min(3, +(TTS.rate + 0.1).toFixed(1));
      const s = DB.get('a11y') || {}; s.rate = TTS.rate; DB.set('a11y', s);
      TTS.speak(`Velocidad: ${TTS.rate}`);
    }
    if (e.altKey && e.key === 'ArrowLeft') {
      TTS.rate = Math.max(0.5, +(TTS.rate - 0.1).toFixed(1));
      const s = DB.get('a11y') || {}; s.rate = TTS.rate; DB.set('a11y', s);
      TTS.speak(`Velocidad: ${TTS.rate}`);
    }
  });
});
