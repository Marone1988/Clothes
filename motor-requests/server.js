const express = require('express');
const cors = require('cors');
const path = require('path');
const { demandesRepo, moteursRepo } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── DEMANDES ────────────────────────────────────────────────────────────────

// Créer une demande
app.post('/api/demandes', (req, res) => {
  try {
    const {
      type_demande, installation, equipement, puissance, tension, vitesse,
      anomalie, matricule_moteur_depose, demandeur, service
    } = req.body;

    if (!type_demande || !installation || !equipement || !puissance ||
        !tension || !vitesse || !demandeur || !service) {
      return res.status(400).json({ erreur: 'Tous les champs obligatoires doivent être remplis.' });
    }

    if (type_demande === 'changement' && !matricule_moteur_depose) {
      return res.status(400).json({ erreur: 'Le matricule du moteur à déposer est obligatoire pour un changement.' });
    }

    const demande = demandesRepo.creer({
      type_demande, installation, equipement, puissance, tension, vitesse,
      anomalie: anomalie || null,
      matricule_moteur_depose: matricule_moteur_depose || null,
      demandeur, service
    });

    res.status(201).json(demande);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur lors de la création de la demande.' });
  }
});

// Suivi par demandeur
app.get('/api/demandes/suivi/:demandeur', (req, res) => {
  try {
    const demandes = demandesRepo.parDemandeur(req.params.demandeur);
    res.json(demandes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Toutes les demandes (admin)
app.get('/api/demandes', (req, res) => {
  try {
    const demandes = demandesRepo.toutes();
    res.json(demandes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Détail d'une demande
app.get('/api/demandes/:id', (req, res) => {
  try {
    const demande = demandesRepo.parId(req.params.id);
    if (!demande) return res.status(404).json({ erreur: 'Demande non trouvée.' });
    const moteur = moteursRepo.parDemandeId(demande.id);
    res.json({ ...demande, moteur: moteur || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Mettre à jour le statut d'une demande (admin)
app.patch('/api/demandes/:id/statut', (req, res) => {
  try {
    const { statut, commentaire } = req.body;
    const valides = ['envoye', 'approuve', 'refuse'];
    if (!valides.includes(statut)) {
      return res.status(400).json({ erreur: 'Statut invalide.' });
    }
    const demande = demandesRepo.parId(req.params.id);
    if (!demande) return res.status(404).json({ erreur: 'Demande non trouvée.' });

    const maj = demandesRepo.mettreAJourStatut(req.params.id, statut, commentaire);
    res.json(maj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// ─── MOTEURS DÉPOSÉS ─────────────────────────────────────────────────────────

// Tous les moteurs déposés (admin)
app.get('/api/moteurs', (req, res) => {
  try {
    const moteurs = moteursRepo.tous();
    res.json(moteurs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Mettre à jour le statut de réparation d'un moteur (admin)
app.patch('/api/moteurs/:id/statut', (req, res) => {
  try {
    const { statut_reparation } = req.body;
    const valides = ['attente_envoi', 'en_reparation', 'repare'];
    if (!valides.includes(statut_reparation)) {
      return res.status(400).json({ erreur: 'Statut de réparation invalide.' });
    }
    const moteur = moteursRepo.parId(req.params.id);
    if (!moteur) return res.status(404).json({ erreur: 'Moteur non trouvé.' });

    const maj = moteursRepo.mettreAJourStatut(req.params.id, statut_reparation);
    res.json(maj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// Fallback SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
