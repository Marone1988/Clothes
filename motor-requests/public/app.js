/* ─────────────────────────────────────────
   CONFIGURATION
───────────────────────────────────────── */
const API = '';  // même origine

/* ─────────────────────────────────────────
   NAVIGATION — onglets principaux
───────────────────────────────────────── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'admin') chargerAdmin();
  });
});

/* ─────────────────────────────────────────
   NAVIGATION — sous-onglets admin
───────────────────────────────────────── */
document.querySelectorAll('.admin-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.adminTab}`).classList.add('active');
    if (btn.dataset.adminTab === 'moteurs-admin') chargerMoteurs();
    if (btn.dataset.adminTab === 'demandes-admin') chargerDemandes();
  });
});

/* ─────────────────────────────────────────
   FORMULAIRE NOUVELLE DEMANDE
───────────────────────────────────────── */
const form = document.getElementById('form-demande');

// Afficher/masquer les champs selon le type de demande
document.querySelectorAll('input[name="type_demande"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const champsChangement = document.getElementById('champs-changement');
    const matricule = document.getElementById('matricule_moteur_depose');
    const anomalie = document.getElementById('anomalie');
    if (radio.value === 'changement') {
      champsChangement.style.display = 'block';
      matricule.required = true;
      anomalie.required = true;
    } else {
      champsChangement.style.display = 'none';
      matricule.required = false;
      anomalie.required = false;
    }
  });
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validerFormulaire()) return;

  const fd = new FormData(form);
  const data = {
    type_demande: fd.get('type_demande'),
    installation: fd.get('installation'),
    equipement: fd.get('equipement'),
    puissance: fd.get('puissance'),
    tension: fd.get('tension'),
    vitesse: fd.get('vitesse'),
    anomalie: fd.get('anomalie') || null,
    matricule_moteur_depose: fd.get('matricule_moteur_depose') || null,
    demandeur: fd.get('demandeur'),
    service: fd.get('service'),
  };

  const btnSubmit = form.querySelector('[type="submit"]');
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Envoi en cours…';

  try {
    const res = await fetch(`${API}/api/demandes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.erreur || 'Erreur inconnue');

    form.closest('.card').classList.add('hidden');
    const confirmation = document.getElementById('confirmation');
    confirmation.classList.remove('hidden');
    document.getElementById('confirmation-numero').textContent = json.numero_demande;
    afficherToast('Demande soumise avec succès !', 'success');
  } catch (err) {
    afficherToast(`Erreur : ${err.message}`, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span class="btn-icon">📤</span> Soumettre la demande';
  }
});

document.getElementById('btn-nouvelle').addEventListener('click', () => {
  form.reset();
  document.getElementById('champs-changement').style.display = 'none';
  form.closest('.card').classList.remove('hidden');
  document.getElementById('confirmation').classList.add('hidden');
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
});

function validerFormulaire() {
  let valide = true;
  const requis = form.querySelectorAll('[required]');
  requis.forEach(input => {
    input.classList.remove('error');
    if (!input.value.trim()) {
      input.classList.add('error');
      valide = false;
    }
  });
  const typeChecked = form.querySelector('input[name="type_demande"]:checked');
  if (!typeChecked) {
    afficherToast('Veuillez sélectionner un type de demande.', 'error');
    valide = false;
  }
  if (!valide) afficherToast('Veuillez remplir tous les champs obligatoires.', 'error');
  return valide;
}

/* ─────────────────────────────────────────
   SUIVI DEMANDES (par demandeur)
───────────────────────────────────────── */
document.getElementById('btn-rechercher').addEventListener('click', rechercherDemandes);
document.getElementById('search-demandeur').addEventListener('keydown', e => {
  if (e.key === 'Enter') rechercherDemandes();
});

async function rechercherDemandes() {
  const nom = document.getElementById('search-demandeur').value.trim();
  if (!nom) { afficherToast('Veuillez entrer votre nom.', 'error'); return; }

  try {
    const res = await fetch(`${API}/api/demandes/suivi/${encodeURIComponent(nom)}`);
    const demandes = await res.json();

    const container = document.getElementById('resultats-suivi');
    const liste = document.getElementById('liste-demandes-suivi');
    const aucun = document.getElementById('aucun-resultat');

    if (!demandes.length) {
      container.classList.add('hidden');
      aucun.classList.remove('hidden');
      return;
    }

    aucun.classList.add('hidden');
    container.classList.remove('hidden');
    liste.innerHTML = `<p class="section-title">${demandes.length} demande(s) trouvée(s) pour « ${nom} »</p>`;
    demandes.forEach(d => liste.appendChild(creerCarteDemandeUser(d)));
  } catch (err) {
    afficherToast('Erreur lors de la recherche.', 'error');
  }
}

function creerCarteDemandeUser(d) {
  const div = document.createElement('div');
  div.className = 'demande-card';
  div.innerHTML = `
    <div class="demande-card-header">
      <span class="demande-numero">${d.numero_demande}</span>
      <span class="demande-type-badge type-${d.type_demande}">${d.type_demande === 'pose' ? '⚙️ Pose' : '🔄 Changement'}</span>
      ${badgeStatutDemande(d.statut)}
    </div>
    <div class="demande-card-body">
      <div class="info-item"><span class="info-label">Installation</span><span class="info-value">${d.installation}</span></div>
      <div class="info-item"><span class="info-label">Équipement</span><span class="info-value">${d.equipement}</span></div>
      <div class="info-item"><span class="info-label">Puissance</span><span class="info-value">${d.puissance} kW</span></div>
      <div class="info-item"><span class="info-label">Tension</span><span class="info-value">${d.tension} V</span></div>
      <div class="info-item"><span class="info-label">Vitesse</span><span class="info-value">${d.vitesse} tr/min</span></div>
    </div>
    ${stepperDemande(d.statut)}
    ${d.type_demande === 'changement' && d.mat_depose ? `
      <div style="margin-top:14px; padding:12px; background:var(--gray-50); border-radius:8px; border:1px solid var(--gray-200)">
        <p style="font-size:0.78rem;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Moteur déposé — ${d.mat_depose}</p>
        ${stepperReparation(d.statut_reparation)}
      </div>` : ''}
    ${d.commentaire_admin ? `<div style="margin-top:10px;padding:10px 14px;background:#fef3c7;border-radius:8px;font-size:0.85rem;color:#92400e"><strong>Commentaire :</strong> ${d.commentaire_admin}</div>` : ''}
    <div class="demande-card-footer">
      <span class="demande-date">📅 ${formatDate(d.date_creation)}</span>
    </div>
  `;
  return div;
}

/* ─────────────────────────────────────────
   ADMINISTRATION
───────────────────────────────────────── */
let toutesDemandesAdmin = [];
let tousMoteurs = [];
let filtreActifDemandes = 'tous';
let filtreActifMoteurs = 'tous';

async function chargerAdmin() {
  await Promise.all([chargerDemandes(), chargerMoteurs()]);
}

async function chargerDemandes() {
  try {
    const res = await fetch(`${API}/api/demandes`);
    toutesDemandesAdmin = await res.json();
    afficherDemandesAdmin(filtreActifDemandes);
  } catch (err) {
    afficherToast('Erreur chargement demandes.', 'error');
  }
}

async function chargerMoteurs() {
  try {
    const res = await fetch(`${API}/api/moteurs`);
    tousMoteurs = await res.json();
    afficherMoteursAdmin(filtreActifMoteurs);
  } catch (err) {
    afficherToast('Erreur chargement moteurs.', 'error');
  }
}

document.getElementById('btn-refresh-demandes').addEventListener('click', chargerDemandes);
document.getElementById('btn-refresh-moteurs').addEventListener('click', chargerMoteurs);

// Filtres demandes
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtreActifDemandes = btn.dataset.filter;
    afficherDemandesAdmin(filtreActifDemandes);
  });
});

// Filtres moteurs
document.querySelectorAll('.filter-btn-m').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn-m').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filtreActifMoteurs = btn.dataset.filterM;
    afficherMoteursAdmin(filtreActifMoteurs);
  });
});

function afficherDemandesAdmin(filtre) {
  const liste = document.getElementById('liste-demandes-admin');
  const data = filtre === 'tous' ? toutesDemandesAdmin
    : toutesDemandesAdmin.filter(d => d.statut === filtre);

  if (!data.length) {
    liste.innerHTML = `<div class="empty-state"><span>📂</span><p>Aucune demande${filtre !== 'tous' ? ' dans cette catégorie' : ''}.</p></div>`;
    return;
  }

  liste.innerHTML = '';
  data.forEach(d => {
    const card = creerCarteDemandeAdmin(d);
    liste.appendChild(card);
  });
}

function creerCarteDemandeAdmin(d) {
  const div = document.createElement('div');
  div.className = 'demande-card';
  div.innerHTML = `
    <div class="demande-card-header">
      <span class="demande-numero">${d.numero_demande}</span>
      <span class="demande-type-badge type-${d.type_demande}">${d.type_demande === 'pose' ? '⚙️ Pose' : '🔄 Changement'}</span>
      ${badgeStatutDemande(d.statut)}
    </div>
    <div class="demande-card-body">
      <div class="info-item"><span class="info-label">Demandeur</span><span class="info-value">${d.demandeur}</span></div>
      <div class="info-item"><span class="info-label">Service</span><span class="info-value">${d.service}</span></div>
      <div class="info-item"><span class="info-label">Installation</span><span class="info-value">${d.installation}</span></div>
      <div class="info-item"><span class="info-label">Équipement</span><span class="info-value">${d.equipement}</span></div>
      <div class="info-item"><span class="info-label">Puissance</span><span class="info-value">${d.puissance} kW</span></div>
      <div class="info-item"><span class="info-label">Tension / Vitesse</span><span class="info-value">${d.tension} V / ${d.vitesse} tr/min</span></div>
    </div>
    <div class="demande-card-footer">
      <span class="demande-date">📅 ${formatDate(d.date_creation)}</span>
      <button class="btn btn-secondary btn-sm btn-detail" data-id="${d.id}">Voir & Gérer →</button>
    </div>
  `;
  div.querySelector('.btn-detail').addEventListener('click', (e) => {
    e.stopPropagation();
    ouvrirModalDemande(d.id);
  });
  div.addEventListener('click', () => ouvrirModalDemande(d.id));
  return div;
}

function afficherMoteursAdmin(filtre) {
  const liste = document.getElementById('liste-moteurs-admin');
  const data = filtre === 'tous' ? tousMoteurs
    : tousMoteurs.filter(m => m.statut_reparation === filtre);

  if (!data.length) {
    liste.innerHTML = `<div class="empty-state"><span>🔧</span><p>Aucun moteur${filtre !== 'tous' ? ' dans cette catégorie' : ''}.</p></div>`;
    return;
  }

  liste.innerHTML = '';
  data.forEach(m => {
    const card = creerCarteMoteur(m);
    liste.appendChild(card);
  });
}

function creerCarteMoteur(m) {
  const div = document.createElement('div');
  div.className = 'moteur-card';
  div.innerHTML = `
    <div class="moteur-card-header">
      <span class="moteur-matricule">🔧 ${m.matricule}</span>
      ${badgeStatutReparation(m.statut_reparation)}
    </div>
    <div class="moteur-card-body">
      <div class="info-item"><span class="info-label">Demande</span><span class="info-value">${m.numero_demande}</span></div>
      <div class="info-item"><span class="info-label">Installation</span><span class="info-value">${m.installation}</span></div>
      <div class="info-item"><span class="info-label">Équipement</span><span class="info-value">${m.equipement}</span></div>
      <div class="info-item"><span class="info-label">Demandeur</span><span class="info-value">${m.demandeur}</span></div>
    </div>
    ${stepperReparation(m.statut_reparation)}
    <div class="statut-select" style="margin-top:14px">
      <label>Changer le statut :</label>
      <select class="select-statut-rep" data-id="${m.id}">
        <option value="attente_envoi" ${m.statut_reparation === 'attente_envoi' ? 'selected' : ''}>En attente d'envoi</option>
        <option value="en_reparation" ${m.statut_reparation === 'en_reparation' ? 'selected' : ''}>En réparation</option>
        <option value="repare" ${m.statut_reparation === 'repare' ? 'selected' : ''}>Réparé</option>
      </select>
      <button class="btn btn-primary btn-sm btn-update-rep" data-id="${m.id}">Mettre à jour</button>
    </div>
  `;

  div.querySelector('.btn-update-rep').addEventListener('click', async () => {
    const sel = div.querySelector('.select-statut-rep');
    await mettreAJourStatutMoteur(m.id, sel.value);
  });

  return div;
}

/* ─────────────────────────────────────────
   MODAL DÉTAIL DEMANDE
───────────────────────────────────────── */
async function ouvrirModalDemande(id) {
  try {
    const res = await fetch(`${API}/api/demandes/${id}`);
    const d = await res.json();

    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <h3>📋 Demande ${d.numero_demande}</h3>

      <div class="modal-section">
        <h4>Informations générales</h4>
        <div class="modal-grid">
          <div class="modal-field"><span class="f-label">Demandeur</span><span class="f-value">${d.demandeur}</span></div>
          <div class="modal-field"><span class="f-label">Service</span><span class="f-value">${d.service}</span></div>
          <div class="modal-field"><span class="f-label">Type</span><span class="f-value">${d.type_demande === 'pose' ? '⚙️ Pose' : '🔄 Changement'}</span></div>
          <div class="modal-field"><span class="f-label">Date</span><span class="f-value">${formatDate(d.date_creation)}</span></div>
        </div>
      </div>

      <div class="modal-section">
        <h4>Localisation & Équipement</h4>
        <div class="modal-grid">
          <div class="modal-field"><span class="f-label">Installation</span><span class="f-value">${d.installation}</span></div>
          <div class="modal-field"><span class="f-label">Équipement</span><span class="f-value">${d.equipement}</span></div>
        </div>
      </div>

      <div class="modal-section">
        <h4>Caractéristiques moteur</h4>
        <div class="modal-grid">
          <div class="modal-field"><span class="f-label">Puissance</span><span class="f-value">${d.puissance} kW</span></div>
          <div class="modal-field"><span class="f-label">Tension</span><span class="f-value">${d.tension} V</span></div>
          <div class="modal-field"><span class="f-label">Vitesse</span><span class="f-value">${d.vitesse} tr/min</span></div>
        </div>
      </div>

      ${d.type_demande === 'changement' ? `
      <div class="modal-section">
        <h4>Moteur à déposer</h4>
        <div class="modal-grid">
          <div class="modal-field"><span class="f-label">Matricule</span><span class="f-value">${d.matricule_moteur_depose || '—'}</span></div>
          <div class="modal-field"><span class="f-label">Anomalie</span><span class="f-value">${d.anomalie || '—'}</span></div>
        </div>
        ${d.moteur ? `
          <div style="margin-top:12px">
            <p style="font-size:0.78rem;font-weight:700;text-transform:uppercase;color:var(--gray-500);margin-bottom:8px">Statut réparation</p>
            ${badgeStatutReparation(d.moteur.statut_reparation)}
            ${stepperReparation(d.moteur.statut_reparation)}
          </div>
        ` : ''}
      </div>` : ''}

      <div class="modal-section">
        <h4>Statut de la demande</h4>
        ${badgeStatutDemande(d.statut)}
        ${stepperDemande(d.statut)}
        ${d.commentaire_admin ? `<p style="margin-top:10px;padding:10px;background:#fef3c7;border-radius:8px;font-size:0.85rem;color:#92400e"><strong>Commentaire admin :</strong> ${d.commentaire_admin}</p>` : ''}
      </div>

      ${d.statut === 'envoye' ? `
      <div class="modal-section">
        <h4>Action administrative</h4>
        <div class="comment-group">
          <label style="font-size:0.85rem;font-weight:600">Commentaire (optionnel)</label>
          <textarea id="admin-commentaire" placeholder="Remarques, motif de refus..."></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-success" id="btn-approuver" data-id="${d.id}">✅ Approuver</button>
          <button class="btn btn-danger" id="btn-refuser" data-id="${d.id}">❌ Refuser</button>
        </div>
      </div>` : ''}
    `;

    // Boutons approbation
    const btnApprouver = content.querySelector('#btn-approuver');
    const btnRefuser = content.querySelector('#btn-refuser');

    if (btnApprouver) {
      btnApprouver.addEventListener('click', async () => {
        const commentaire = document.getElementById('admin-commentaire').value;
        await mettreAJourStatutDemande(d.id, 'approuve', commentaire);
        fermerModal();
      });
    }

    if (btnRefuser) {
      btnRefuser.addEventListener('click', async () => {
        const commentaire = document.getElementById('admin-commentaire').value;
        await mettreAJourStatutDemande(d.id, 'refuse', commentaire);
        fermerModal();
      });
    }

    document.getElementById('modal-overlay').classList.remove('hidden');
  } catch (err) {
    afficherToast('Erreur chargement détail.', 'error');
  }
}

document.getElementById('modal-close').addEventListener('click', fermerModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) fermerModal();
});

function fermerModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

/* ─────────────────────────────────────────
   API CALLS
───────────────────────────────────────── */
async function mettreAJourStatutDemande(id, statut, commentaire) {
  try {
    const res = await fetch(`${API}/api/demandes/${id}/statut`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut, commentaire }),
    });
    if (!res.ok) throw new Error();
    afficherToast(`Demande ${statut === 'approuve' ? 'approuvée' : 'refusée'} avec succès.`, 'success');
    await chargerDemandes();
  } catch {
    afficherToast('Erreur mise à jour demande.', 'error');
  }
}

async function mettreAJourStatutMoteur(id, statut) {
  try {
    const res = await fetch(`${API}/api/moteurs/${id}/statut`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut_reparation: statut }),
    });
    if (!res.ok) throw new Error();
    const labels = { attente_envoi: 'En attente d\'envoi', en_reparation: 'En réparation', repare: 'Réparé' };
    afficherToast(`Statut mis à jour : ${labels[statut]}`, 'success');
    await chargerMoteurs();
  } catch {
    afficherToast('Erreur mise à jour moteur.', 'error');
  }
}

/* ─────────────────────────────────────────
   COMPOSANTS UI
───────────────────────────────────────── */
function badgeStatutDemande(statut) {
  const map = {
    envoye:   ['badge-envoye',   '📤 Envoyée'],
    approuve: ['badge-approuve', '✅ Approuvée'],
    refuse:   ['badge-refuse',   '❌ Refusée'],
  };
  const [cls, label] = map[statut] || ['', statut];
  return `<span class="badge ${cls}">${label}</span>`;
}

function badgeStatutReparation(statut) {
  const map = {
    attente_envoi: ['badge-attente',    "⏳ En attente d'envoi"],
    en_reparation: ['badge-reparation', '🔧 En réparation'],
    repare:        ['badge-repare',     '✅ Réparé'],
  };
  const [cls, label] = map[statut] || ['', statut];
  return `<span class="badge ${cls}">${label}</span>`;
}

function stepperDemande(statut) {
  const steps = [
    { key: 'envoye',   label: 'Envoyée',   icon: '📤' },
    { key: 'approuve', label: 'Approuvée', icon: '✅' },
  ];

  if (statut === 'refuse') {
    return `
      <div class="stepper" style="margin-top:12px">
        <div class="step done"><div class="step-dot">📤</div><span class="step-label">Envoyée</span></div>
        <div class="step refused"><div class="step-dot">❌</div><span class="step-label">Refusée</span></div>
      </div>`;
  }

  let html = '<div class="stepper" style="margin-top:12px">';
  steps.forEach(s => {
    const isDone   = (s.key === 'envoye') ||
                     (s.key === 'approuve' && statut === 'approuve');
    const isActive = s.key === statut;
    const cls = isDone ? 'done' : (isActive ? 'active' : '');
    html += `<div class="step ${cls}"><div class="step-dot">${isDone || isActive ? s.icon : (steps.indexOf(s)+1)}</div><span class="step-label">${s.label}</span></div>`;
  });
  html += '</div>';
  return html;
}

function stepperReparation(statut) {
  const steps = [
    { key: 'attente_envoi', label: "Att. envoi",    icon: '⏳' },
    { key: 'en_reparation', label: 'En réparation', icon: '🔧' },
    { key: 'repare',        label: 'Réparé',        icon: '✅' },
  ];

  const order = steps.map(s => s.key);
  const currentIdx = order.indexOf(statut);

  let html = '<div class="stepper rep-stepper" style="margin-top:10px">';
  steps.forEach((s, i) => {
    const isDone   = i < currentIdx;
    const isActive = i === currentIdx;
    const cls = isActive && s.key === 'repare' ? 'repare'
              : isDone ? 'done'
              : isActive ? 'active' : '';
    html += `<div class="step ${cls}"><div class="step-dot">${isDone || isActive ? s.icon : (i+1)}</div><span class="step-label">${s.label}</span></div>`;
  });
  html += '</div>';
  return html;
}

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
let toastTimer = null;
function afficherToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

/* ─────────────────────────────────────────
   UTILITAIRES
───────────────────────────────────────── */
function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
