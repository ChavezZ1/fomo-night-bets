const BETS = [
  { id: "cold", title: "Cold Shoulder makes the drop", hint: "The Don Toliver one people want most.", options: [["yes","Yes"],["no","No"]] },
  { id: "texas", title: "Choosin' Texas remix makes it", hint: "Drake + Don Toliver interpolating Ella Langley.", options: [["yes","Yes"],["no","No"]] },
  { id: "count", title: "New track count", hint: "Brand-new / newly official DSP tracks only.", options: [["under","Under 6.5"],["over","Over 6.5"]] },
  { id: "name", title: "Official project name includes FOMO", hint: "FOMO or Fear of Missing Out in the title.", options: [["yes","Yes"],["no","No"]] },
  { id: "toliver", title: "Don Toliver on more than one song", hint: "Two or more official credits.", options: [["yes","Yes"],["no","No"]] },
  { id: "extra", title: "At least one song not in the film", hint: "A surprise cut that FOMO didn't preview.", options: [["yes","Yes"],["no","No"]] },
  { id: "quebec", title: "First official track is Quebec", hint: "Track 1 on the DSP page.", options: [["yes","Yes"],["no","No"]] },
  { id: "video", title: "Same-night official video", hint: "A proper video posts with the audio drop.", options: [["yes","Yes"],["no","No"]] }
];
const params = new URLSearchParams(location.search);
const roomId = (params.get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
const storageKey = "fomo-bets-" + (roomId || "local");
const state = loadState() || blankState();
let seat = localStorage.getItem(storageKey + "-seat") || "";
let peer, conn;
function blankState() {
  return { v: 1, room: roomId || "", names: { a: "Anthony", b: "Player B" }, picks: { a: {}, b: {} }, locked: { a: false, b: false }, answers: {}, answersLocked: false, punishment: "", updated: Date.now() };
}
function loadState() {
  try { return JSON.parse(localStorage.getItem(storageKey) || "null"); } catch { return null; }
}
function saveState() {
  state.updated = Date.now();
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (conn && conn.open) conn.send({ type: "state", state });
  render();
}
function mergeState(incoming) {
  if (!incoming || incoming.v !== 1) return;
  state.names = Object.assign({}, state.names, incoming.names);
  state.picks = { a: Object.assign({}, state.picks.a, incoming.picks.a), b: Object.assign({}, state.picks.b, incoming.picks.b) };
  state.locked = Object.assign({}, state.locked, incoming.locked);
  state.answers = Object.assign({}, state.answers, incoming.answers);
  if (incoming.answersLocked) state.answersLocked = true;
  if (incoming.punishment) state.punishment = incoming.punishment;
  if ((incoming.updated || 0) >= (state.updated || 0)) state.updated = incoming.updated;
  localStorage.setItem(storageKey, JSON.stringify(state));
  render();
}
function scoreFor(side) {
  if (!state.answersLocked) return 0;
  return BETS.reduce((n, bet) => n + (state.picks[side][bet.id] && state.picks[side][bet.id] === state.answers[bet.id] ? 1 : 0), 0);
}
function labelOf(bet, val) {
  return (bet.options.find(o => o[0] === val) || [,"—"])[1];
}
function esc(s) {
  return String(s || "").replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m]));
}
function renderBets() {
  const box = document.getElementById("bets");
  box.innerHTML = "";
  BETS.forEach(bet => {
    const mine = seat ? state.picks[seat][bet.id] : "";
    const lockedMine = seat ? state.locked[seat] : false;
    const bothLocked = state.locked.a && state.locked.b;
    const el = document.createElement("div");
    el.className = "bet";
    el.innerHTML = "<h3>" + bet.title + "</h3><p>" + bet.hint + "</p>";
    const pills = document.createElement("div");
    pills.className = "pills";
    bet.options.forEach(([val, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (mine === val ? " on" : "");
      b.textContent = label;
      b.disabled = !seat || lockedMine;
      b.onclick = () => { state.picks[seat][bet.id] = val; saveState(); };
      pills.appendChild(b);
    });
    el.appendChild(pills);
    if (bothLocked) {
      const c = document.createElement("div");
      c.className = "compare";
      c.innerHTML = '<div class="chip">' + esc(state.names.a) + ": <b>" + labelOf(bet, state.picks.a[bet.id]) + "</b></div><div class=\"chip\">" + esc(state.names.b) + ": <b>" + labelOf(bet, state.picks.b[bet.id]) + "</b></div>";
      el.appendChild(c);
    }
    box.appendChild(el);
  });
  const answers = document.getElementById("answers");
  answers.innerHTML = "";
  BETS.forEach(bet => {
    const el = document.createElement("div");
    el.className = "bet";
    el.innerHTML = "<h3>" + bet.title + "</h3>";
    const pills = document.createElement("div");
    pills.className = "pills";
    bet.options.forEach(([val, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (state.answers[bet.id] === val ? " on" : "");
      b.textContent = label;
      b.disabled = state.answersLocked;
      b.onclick = () => { state.answers[bet.id] = val; saveState(); };
      pills.appendChild(b);
    });
    el.appendChild(pills);
    answers.appendChild(el);
  });
}
function render() {
  document.getElementById("nameA").textContent = state.names.a || "Player A";
  document.getElementById("nameB").textContent = state.names.b || "Player B";
  document.getElementById("nameAInput").value = state.names.a || "";
  document.getElementById("nameBInput").value = state.names.b || "";
  document.getElementById("seatABtn").textContent = "I'm " + (state.names.a || "Player A");
  document.getElementById("seatBBtn").textContent = "I'm " + (state.names.b || "Player B");
  document.getElementById("seatABtn").classList.toggle("on", seat === "a");
  document.getElementById("seatBBtn").classList.toggle("on", seat === "b");
  document.getElementById("roomLabel").textContent = state.room ? ("Room " + state.room) : "No room yet";
  document.getElementById("scoreA").textContent = scoreFor("a");
  document.getElementById("scoreB").textContent = scoreFor("b");
  document.getElementById("punishInput").value = state.punishment || "";
  document.getElementById("punishFinal").textContent = state.punishment ? ("Official: " + state.punishment) : "";
  const mineComplete = seat && BETS.every(b => state.picks[seat][b.id]);
  document.getElementById("lockBtn").disabled = !mineComplete || (seat && state.locked[seat]);
  document.getElementById("lockBtn").textContent = seat && state.locked[seat] ? "Picks locked" : "Lock my picks";
  document.getElementById("unlockHint").textContent = mineComplete ? (state.locked[seat] ? "Waiting on the other lock" : "Ready to lock") : "Need all 8";
  const answersReady = BETS.every(b => state.answers[b.id]);
  document.getElementById("lockAnswersBtn").disabled = !answersReady || state.answersLocked;
  document.getElementById("lockAnswersBtn").textContent = state.answersLocked ? "Answers locked" : "Lock official answers & score";
  let status = "Start a room, then share the link.";
  if (state.room) status = "Room live. Pick a side and lock all 8.";
  if (state.locked.a || state.locked.b) status = state.names.a + " " + (state.locked.a ? "locked" : "still picking") + " · " + state.names.b + " " + (state.locked.b ? "locked" : "still picking");
  if (state.locked.a && state.locked.b && !state.answersLocked) status = "Both locked. After the drop, mark what actually happened.";
  if (state.answersLocked) status = "Scored. Winner writes the punishment.";
  document.getElementById("statusLine").textContent = status;
  document.getElementById("seatNote").textContent = seat ? ("Picking as " + state.names[seat] + ".") : "Choose a side before picking.";
  const resultCard = document.getElementById("resultCard");
  if (state.answersLocked) {
    resultCard.classList.remove("hidden");
    const sa = scoreFor("a"), sb = scoreFor("b");
    let line, sub;
    if (sa > sb) { line = state.names.a + " wins"; sub = sa + "–" + sb + ". " + state.names.a + " chooses the punishment."; }
    else if (sb > sa) { line = state.names.b + " wins"; sub = sb + "–" + sa + ". " + state.names.b + " chooses the punishment."; }
    else { line = "Tie"; sub = sa + "–" + sb + ". Flip a coin, or add one more bet."; }
    document.getElementById("winnerLine").textContent = line;
    document.getElementById("winnerSub").textContent = sub;
    document.getElementById("breakdown").innerHTML = BETS.map(bet => {
      const aHit = state.picks.a[bet.id] === state.answers[bet.id];
      const bHit = state.picks.b[bet.id] === state.answers[bet.id];
      return '<div class="compare"><div class="chip">' + esc(state.names.a) + ': <span class="' + (aHit ? "ok" : "no") + '">' + (aHit ? "correct" : "wrong") + '</span></div><div class="chip">' + esc(state.names.b) + ': <span class="' + (bHit ? "ok" : "no") + '">' + (bHit ? "correct" : "wrong") + "</span></div></div>";
    }).join("");
  } else {
    resultCard.classList.add("hidden");
  }
  renderBets();
}
function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function goToRoom(code) {
  const url = new URL(location.href);
  url.searchParams.set("room", code);
  location.href = url.toString();
}
function setSeat(s) {
  seat = s;
  localStorage.setItem(storageKey + "-seat", s);
  render();
}
function setLive(on, label) {
  document.getElementById("liveDot").classList.toggle("live", on);
  document.getElementById("liveLabel").textContent = label;
}
function connectPeer() {
  if (!roomId || typeof Peer === "undefined") return;
  const hostId = "fomonight-" + roomId + "-host";
  const guestId = "fomonight-" + roomId + "-guest-" + Math.random().toString(36).slice(2, 6);
  try {
    peer = new Peer(hostId);
    peer.on("open", () => setLive(true, "Host connected"));
    peer.on("error", err => {
      if (String(err).includes("is taken") || (err && err.type === "unavailable-id")) {
        peer = new Peer(guestId);
        peer.on("open", () => {
          conn = peer.connect(hostId, { reliable: true });
          wireConn(conn);
          setLive(true, "Joined room");
        });
        peer.on("error", () => setLive(false, "Local only · same link still works on one phone"));
      } else {
        setLive(false, "Local only · pass the phone or use the same link later");
      }
    });
    peer.on("connection", c => { conn = c; wireConn(c); setLive(true, "Phones linked"); });
  } catch (e) {
    setLive(false, "Local room");
  }
}
function wireConn(c) {
  c.on("open", () => { c.send({ type: "state", state }); setLive(true, "Phones linked"); });
  c.on("data", msg => { if (msg && msg.type === "state") mergeState(msg.state); });
  c.on("close", () => setLive(false, "Link dropped · refresh both phones"));
}
document.getElementById("createBtn").onclick = () => {
  state.names.a = document.getElementById("nameAInput").value.trim() || "Anthony";
  state.names.b = document.getElementById("nameBInput").value.trim() || "Player B";
  if (roomId) { saveState(); return; }
  goToRoom(makeRoomCode());
};
document.getElementById("shareBtn").onclick = async () => {
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
    document.getElementById("shareBtn").textContent = "Copied";
    setTimeout(() => document.getElementById("shareBtn").textContent = "Copy link", 1200);
  } catch (e) {
    prompt("Copy this link", url);
  }
};
document.getElementById("nameAInput").onchange = () => { state.names.a = document.getElementById("nameAInput").value.trim() || "Anthony"; saveState(); };
document.getElementById("nameBInput").onchange = () => { state.names.b = document.getElementById("nameBInput").value.trim() || "Player B"; saveState(); };
document.getElementById("seatABtn").onclick = () => setSeat("a");
document.getElementById("seatBBtn").onclick = () => setSeat("b");
document.getElementById("lockBtn").onclick = () => { if (!seat) return; state.locked[seat] = true; saveState(); };
document.getElementById("lockAnswersBtn").onclick = () => { state.answersLocked = true; saveState(); };
document.getElementById("savePunishBtn").onclick = () => { state.punishment = document.getElementById("punishInput").value.trim(); saveState(); };
document.querySelectorAll("[data-punish]").forEach(btn => {
  btn.onclick = () => {
    document.getElementById("punishInput").value = btn.getAttribute("data-punish");
    state.punishment = btn.getAttribute("data-punish");
    saveState();
  };
});
if (roomId) {
  state.room = roomId;
  saveState();
  connectPeer();
}
render();
