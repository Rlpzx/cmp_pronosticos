// ============================================================
//  CMP PRONÓSTICOS — app.js  (sin índices compuestos)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc,
  updateDoc, deleteDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ─── REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO FIREBASE ───
const firebaseConfig = {
  apiKey: "AIzaSyC2sXTIBmXUk8H7pPVt055MDQDQqqG5GtI",
  authDomain: "pronosticos-71f94.firebaseapp.com",
  projectId: "pronosticos-71f94",
  storageBucket: "pronosticos-71f94.firebasestorage.app",
  messagingSenderId: "1079650091331",
  appId: "1:1079650091331:web:dfd884edb2515576dd2ff6",
  measurementId: "G-9N2CX6PX5S"
};
// ────────────────────────────────────────────────────────────────

const firebaseApp = initializeApp(firebaseConfig);
const db          = getFirestore(firebaseApp);

// ===== CREDENCIALES ADMIN =====
const ADMIN_USER = "PETRO";
const ADMIN_PASS = "CMP2002*r";

// ===== ESTADO =====
let isAdmin  = false;
let pagoData = {};

// ===== DOM =====
const adminTrigger = document.getElementById("admin-trigger");
const loginModal   = document.getElementById("login-modal");
const adminPanel   = document.getElementById("admin-panel");
const mainPage     = document.getElementById("main-page");
const pagoModal    = document.getElementById("pago-modal");

// ── Helpers fecha ──────────────────────────────────────────────
function inicioHoy() {
  const d = new Date(); d.setHours(0,0,0,0); return d;
}
function esHoy(ts) {
  const hoy = inicioHoy();
  const manana = new Date(hoy); manana.setDate(manana.getDate()+1);
  const fecha = ts?.toDate ? ts.toDate() : new Date(ts);
  return fecha >= hoy && fecha < manana;
}

// ── Traer TODOS los documentos (sin query compuesta) ──────────
async function todosLosDocs() {
  const snap = await getDocs(collection(db, "pronosticos"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ──────────────────────────────────────────────────────────────
//  TRIGGER SECRETO — 3 clics esquina inferior derecha
// ──────────────────────────────────────────────────────────────
let triggerTaps = 0, triggerTimer;
adminTrigger.addEventListener("click", () => {
  triggerTaps++;
  clearTimeout(triggerTimer);
  if (triggerTaps >= 3) { triggerTaps = 0; showLoginModal(); }
  triggerTimer = setTimeout(() => { triggerTaps = 0; }, 1500);
});

// ──────────────────────────────────────────────────────────────
//  LOGIN
// ──────────────────────────────────────────────────────────────
function showLoginModal() {
  loginModal.classList.remove("hidden");
  document.getElementById("admin-user").value = "";
  document.getElementById("admin-pass").value = "";
  document.getElementById("login-error").classList.add("hidden");
}

document.getElementById("close-login").addEventListener("click", () =>
  loginModal.classList.add("hidden"));

document.getElementById("btn-login").addEventListener("click", doLogin);
document.getElementById("admin-pass").addEventListener("keydown", e => {
  if (e.key === "Enter") doLogin();
});

function doLogin() {
  const u = document.getElementById("admin-user").value.trim();
  const p = document.getElementById("admin-pass").value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    isAdmin = true;
    loginModal.classList.add("hidden");
    mainPage.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    cargarAdminLista();
    cargarHistorial();
  } else {
    document.getElementById("login-error").classList.remove("hidden");
  }
}

document.getElementById("btn-logout").addEventListener("click", () => {
  isAdmin = false;
  adminPanel.classList.add("hidden");
  mainPage.classList.remove("hidden");
  cargarPronosticosPublicos();
});

// ──────────────────────────────────────────────────────────────
//  TIPO (gratis / privado)
// ──────────────────────────────────────────────────────────────
document.getElementById("f-tipo").addEventListener("change", e => {
  document.getElementById("precio-section")
    .classList.toggle("hidden", e.target.value !== "privado");
});

// ──────────────────────────────────────────────────────────────
//  SUBIR PRONÓSTICO
// ──────────────────────────────────────────────────────────────
document.getElementById("btn-subir").addEventListener("click", async () => {
  const partido    = document.getElementById("f-partido").value.trim();
  const pronostico = document.getElementById("f-pronostico").value.trim();
  const liga       = document.getElementById("f-liga").value.trim();
  const hora       = document.getElementById("f-hora").value.trim();
  const cuota      = document.getElementById("f-cuota").value.trim();
  const tipo       = document.getElementById("f-tipo").value;
  const emoji      = document.getElementById("f-emoji").value;
  const precio     = document.getElementById("f-precio").value.trim();
  const cuenta     = document.getElementById("f-cuenta").value.trim();
  const whatsapp   = document.getElementById("f-whatsapp").value.trim();
  const msg        = document.getElementById("subir-msg");

  if (!partido || !pronostico || !liga) {
    mostrarMsg(msg, "⚠️ Completa partido, pronóstico y liga.", "var(--red)");
    return;
  }
  if (tipo === "privado" && (!precio || !cuenta || !whatsapp)) {
    mostrarMsg(msg, "⚠️ Completa precio, cuenta y WhatsApp.", "var(--red)");
    return;
  }

  const btn = document.getElementById("btn-subir");
  btn.disabled = true; btn.textContent = "Publicando...";

  try {
    const hoy = inicioHoy();
    const data = {
      partido, pronostico, liga, hora, cuota, tipo, emoji,
      fecha: Timestamp.fromDate(hoy),
      resultado: "pendiente",
      createdAt: Timestamp.now()
    };
    if (tipo === "privado") Object.assign(data, { precio, cuenta, whatsapp });

    await addDoc(collection(db, "pronosticos"), data);
    mostrarMsg(msg, "✅ Pronóstico publicado con éxito.", "var(--green)");

    ["f-partido","f-pronostico","f-liga","f-hora","f-cuota",
     "f-precio","f-cuenta","f-whatsapp"].forEach(id =>
      (document.getElementById(id).value = ""));
    document.getElementById("f-tipo").value = "gratis";
    document.getElementById("precio-section").classList.add("hidden");

    setTimeout(() => msg.classList.add("hidden"), 3000);
    cargarAdminLista();
    cargarHistorial();
  } catch (err) {
    mostrarMsg(msg, "❌ Error: " + err.message, "var(--red)");
  }
  btn.disabled = false; btn.textContent = "⬆️ PUBLICAR PRONÓSTICO";
});

function mostrarMsg(el, texto, color) {
  el.textContent = texto;
  el.style.color = color;
  el.classList.remove("hidden");
}

// ──────────────────────────────────────────────────────────────
//  ADMIN — todos los pendientes (cualquier día)
// ──────────────────────────────────────────────────────────────
async function cargarAdminLista() {
  const cont = document.getElementById("admin-lista");
  cont.innerHTML = "<p style='color:var(--text-dim);font-size:.9rem'>Cargando...</p>";
  try {
    const todos = await todosLosDocs();
    const hoy = todos
      .filter(d => d.resultado === "pendiente")
      .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

    if (!hoy.length) {
      cont.innerHTML = "<p style='color:var(--text-dim);font-size:.9rem'>No hay pronósticos pendientes.</p>";
      return;
    }
    cont.innerHTML = "";
    hoy.forEach(d => {
      const item = document.createElement("div");
      item.className = "admin-item";
      item.innerHTML = `
        <div class="ai-info">
          <div class="ai-partido">${d.emoji} ${d.partido}</div>
          <div class="ai-tipo ${d.tipo}">${d.tipo.toUpperCase()} · ${d.pronostico}</div>
        </div>
        <div class="ai-actions">
          <button class="btn-ganado" data-id="${d.id}">✅ VERDE</button>
          <button class="btn-perdido" data-id="${d.id}">❌ ROJO</button>
          <button class="btn-eliminar" data-id="${d.id}">🗑</button>
        </div>`;
      cont.appendChild(item);
    });
    cont.querySelectorAll(".btn-ganado").forEach(b =>
      b.addEventListener("click", () => marcarResultado(b.dataset.id, "ganado")));
    cont.querySelectorAll(".btn-perdido").forEach(b =>
      b.addEventListener("click", () => marcarResultado(b.dataset.id, "perdido")));
    cont.querySelectorAll(".btn-eliminar").forEach(b =>
      b.addEventListener("click", () => eliminarPronostico(b.dataset.id)));
  } catch(err) {
    cont.innerHTML = `<p style='color:var(--red)'>Error: ${err.message}</p>`;
  }
}

async function marcarResultado(id, resultado) {
  await updateDoc(doc(db, "pronosticos", id), { resultado });
  cargarAdminLista(); cargarHistorial(); actualizarStats();
}

async function eliminarPronostico(id) {
  if (!confirm("¿Eliminar este pronóstico?")) return;
  await deleteDoc(doc(db, "pronosticos", id));
  cargarAdminLista(); cargarHistorial();
}

// ──────────────────────────────────────────────────────────────
//  HISTORIAL
// ──────────────────────────────────────────────────────────────
async function cargarHistorial() {
  const cont = document.getElementById("historial-lista");
  cont.innerHTML = "";
  try {
    const todos = await todosLosDocs();
    const resueltos = todos
      .filter(d => d.resultado !== "pendiente")
      .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

    if (!resueltos.length) {
      cont.innerHTML = "<p style='color:var(--text-dim);font-size:.9rem'>Sin resultados aún.</p>";
      return;
    }
    resueltos.forEach(d => {
      const item = document.createElement("div");
      item.className = "hist-item";
      item.innerHTML = `
        <span class="hist-badge ${d.resultado}">${d.resultado.toUpperCase()}</span>
        <span>${d.emoji} ${d.partido}</span>
        <span style="color:var(--text-dim);font-size:.85rem;margin-left:auto">${d.pronostico}</span>`;
      cont.appendChild(item);
    });
  } catch(e) {
    cont.innerHTML = `<p style='color:var(--red)'>Error: ${e.message}</p>`;
  }
}

// ──────────────────────────────────────────────────────────────
//  PÁGINA PÚBLICA
// ──────────────────────────────────────────────────────────────
async function cargarPronosticosPublicos() {
  const cont    = document.getElementById("pronosticos-container");
  const noProno = document.getElementById("no-pronosticos");
  cont.innerHTML = "";
  noProno.classList.add("hidden");

  try {
    const todos = await todosLosDocs();

    // Solo pendientes de hoy en la pantalla principal
    const pendientesHoy = todos
      .filter(d => d.resultado === "pendiente")
      .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

    if (!pendientesHoy.length) { noProno.classList.remove("hidden"); }
    else { pendientesHoy.forEach((d, i) => cont.appendChild(buildCard(d.id, d, i))); }

    // Historial público: todos los resueltos (todos los tiempos)
    const resueltos = todos
      .filter(d => d.resultado !== "pendiente")
      .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

    cargarHistorialPublico(resueltos);
    actualizarStats();
  } catch(err) {
    cont.innerHTML = `<div style='color:var(--red);padding:20px'>
      Error al cargar: ${err.message}<br>
      <small>Verifica que el projectId en app.js sea correcto.</small>
    </div>`;
  }
}

function cargarHistorialPublico(resueltos) {
  const sec  = document.getElementById("historial-publico-section");
  const cont = document.getElementById("historial-publico-lista");
  if (!resueltos.length) { sec.classList.add("hidden"); return; }

  sec.classList.remove("hidden");
  cont.innerHTML = "";
  resueltos.forEach(d => {
    const item = document.createElement("div");
    item.className = "hist-item";
    // Formatear fecha legible
    const fecha = d.fecha?.toDate ? d.fecha.toDate() : new Date();
    const fechaStr = fecha.toLocaleDateString("es-CO", { day:"2-digit", month:"short" });
    item.innerHTML = `
      <span class="hist-badge ${d.resultado}">${d.resultado.toUpperCase()}</span>
      <span style="flex:1">${d.emoji} ${d.partido}</span>
      <span style="color:var(--text-dim);font-size:.8rem">${fechaStr}</span>`;
    cont.appendChild(item);
  });
}

function buildCard(id, data, idx) {
  const card = document.createElement("div");
  card.className = "pronostico-card";
  card.style.animationDelay = `${idx * 0.08}s`;

  const badgeClass = data.tipo === "gratis" ? "badge-gratis" : "badge-privado";
  const badgeText  = data.tipo === "gratis" ? "🟢 GRATIS"   : "🔒 PRIVADO";

  const bottomHTML = data.tipo === "gratis"
    ? `<div class="card-reveal">
        <div>
          <div class="reveal-label">Pronóstico</div>
          <div class="reveal-text">${data.pronostico}</div>
        </div>
        ${data.cuota ? `<div class="reveal-cuota">
          <div class="cuota-num">${data.cuota}</div>
          <div class="cuota-sub">CUOTA</div>
        </div>` : ""}
      </div>`
    : `<div class="card-locked">
        <div class="locked-info">
          <div class="locked-icon">🔐</div>
          <div class="locked-text">Pronóstico exclusivo.<br>Realiza el pago para acceder.</div>
        </div>
        <div class="locked-precio">$${Number(data.precio||0).toLocaleString("es-CO")}</div>
        <button class="btn-desbloquear">VER CÓMO PAGAR</button>
      </div>`;

  card.innerHTML = `
    <div class="card-top">
      <div class="card-sport-icon">${data.emoji}</div>
      <div class="card-main">
        <div class="card-liga">${data.liga}</div>
        <div class="card-partido">${data.partido}</div>
        ${data.hora ? `<div class="card-hora">🕐 ${data.hora}</div>` : ""}
      </div>
      <span class="card-badge ${badgeClass}">${badgeText}</span>
    </div>
    ${bottomHTML}`;

  card.querySelector(".btn-desbloquear")?.addEventListener("click", () => abrirModalPago(data));
  return card;
}

// ──────────────────────────────────────────────────────────────
//  MODAL PAGO
// ──────────────────────────────────────────────────────────────
function abrirModalPago(data) {
  pagoData = data;
  document.getElementById("pago-partido").textContent = data.partido;
  document.getElementById("pago-valor").textContent =
    "$" + Number(data.precio||0).toLocaleString("es-CO") + " COP";
  document.getElementById("pago-cuenta").innerHTML =
    `<strong>${data.cuenta || "Consulta por WhatsApp"}</strong>`;
  pagoModal.classList.remove("hidden");
}

document.getElementById("close-pago").addEventListener("click", () =>
  pagoModal.classList.add("hidden"));
pagoModal.addEventListener("click", e => {
  if (e.target === pagoModal) pagoModal.classList.add("hidden");
});

document.getElementById("btn-whatsapp").addEventListener("click", () => {
  const num = (pagoData.whatsapp || "").replace(/\D/g,"");
  const msg = encodeURIComponent(
    `Hola! Quiero el pronóstico de *${pagoData.partido}*.\nAdjunto comprobante de $${Number(pagoData.precio||0).toLocaleString("es-CO")} COP.`
  );
  window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
});

// ──────────────────────────────────────────────────────────────
//  STATS
// ──────────────────────────────────────────────────────────────
async function actualizarStats() {
  try {
    const todos = await todosLosDocs();
    const win  = todos.filter(d => d.resultado === "ganado").length;
    const lose = todos.filter(d => d.resultado === "perdido").length;
    document.getElementById("stat-win").textContent  = win;
    document.getElementById("stat-lose").textContent = lose;
  } catch(e) {}
}

// ──────────────────────────────────────────────────────────────
//  INIT
// ──────────────────────────────────────────────────────────────
cargarPronosticosPublicos();