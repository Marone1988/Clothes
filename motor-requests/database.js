const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'moteurs.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS demandes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_demande TEXT UNIQUE NOT NULL,
    type_demande TEXT NOT NULL CHECK(type_demande IN ('changement', 'pose')),
    installation TEXT NOT NULL,
    equipement TEXT NOT NULL,
    puissance TEXT NOT NULL,
    tension TEXT NOT NULL,
    vitesse TEXT NOT NULL,
    anomalie TEXT,
    matricule_moteur_depose TEXT,
    demandeur TEXT NOT NULL,
    service TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'envoye' CHECK(statut IN ('envoye', 'approuve', 'refuse')),
    commentaire_admin TEXT,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_mise_a_jour DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS moteurs_deposes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    demande_id INTEGER NOT NULL,
    matricule TEXT NOT NULL,
    statut_reparation TEXT NOT NULL DEFAULT 'attente_envoi'
      CHECK(statut_reparation IN ('attente_envoi', 'en_reparation', 'repare')),
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_mise_a_jour DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE CASCADE
  );
`);

function genererNumeroDemande() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `DM-${year}${month}${day}-${rand}`;
}

// Demandes
const demandesRepo = {
  creer(data) {
    const numero = genererNumeroDemande();
    const stmt = db.prepare(`
      INSERT INTO demandes
        (numero_demande, type_demande, installation, equipement, puissance, tension, vitesse,
         anomalie, matricule_moteur_depose, demandeur, service)
      VALUES
        (@numero_demande, @type_demande, @installation, @equipement, @puissance, @tension, @vitesse,
         @anomalie, @matricule_moteur_depose, @demandeur, @service)
    `);
    const result = stmt.run({ ...data, numero_demande: numero });
    const demande = this.parId(result.lastInsertRowid);

    if (data.type_demande === 'changement' && data.matricule_moteur_depose) {
      moteursRepo.creer(result.lastInsertRowid, data.matricule_moteur_depose);
    }

    return demande;
  },

  parId(id) {
    return db.prepare('SELECT * FROM demandes WHERE id = ?').get(id);
  },

  parNumero(numero) {
    return db.prepare('SELECT * FROM demandes WHERE numero_demande = ?').get(numero);
  },

  parDemandeur(demandeur) {
    return db.prepare(`
      SELECT d.*, m.statut_reparation, m.matricule as mat_depose
      FROM demandes d
      LEFT JOIN moteurs_deposes m ON m.demande_id = d.id
      WHERE LOWER(d.demandeur) = LOWER(?)
      ORDER BY d.date_creation DESC
    `).all(demandeur);
  },

  toutes() {
    return db.prepare(`
      SELECT d.*, m.statut_reparation, m.matricule as mat_depose
      FROM demandes d
      LEFT JOIN moteurs_deposes m ON m.demande_id = d.id
      ORDER BY d.date_creation DESC
    `).all();
  },

  mettreAJourStatut(id, statut, commentaire) {
    db.prepare(`
      UPDATE demandes
      SET statut = ?, commentaire_admin = ?, date_mise_a_jour = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(statut, commentaire || null, id);
    return this.parId(id);
  }
};

// Moteurs déposés
const moteursRepo = {
  creer(demandeId, matricule) {
    db.prepare(`
      INSERT INTO moteurs_deposes (demande_id, matricule) VALUES (?, ?)
    `).run(demandeId, matricule);
  },

  parDemandeId(demandeId) {
    return db.prepare('SELECT * FROM moteurs_deposes WHERE demande_id = ?').get(demandeId);
  },

  tous() {
    return db.prepare(`
      SELECT m.*, d.numero_demande, d.installation, d.equipement, d.demandeur, d.service
      FROM moteurs_deposes m
      JOIN demandes d ON d.id = m.demande_id
      ORDER BY m.date_creation DESC
    `).all();
  },

  mettreAJourStatut(id, statut) {
    db.prepare(`
      UPDATE moteurs_deposes
      SET statut_reparation = ?, date_mise_a_jour = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(statut, id);
    return this.parId(id);
  },

  parId(id) {
    return db.prepare('SELECT * FROM moteurs_deposes WHERE id = ?').get(id);
  }
};

module.exports = { demandesRepo, moteursRepo };
