# 🚗 Micro-Carnet Auto — Fiches d'Intervention & Maintenance Atelier

Application web moderne et réactive conçue spécifiquement pour les **mécaniciens, techniciens d'atelier et gestionnaires de flottes automobiles**. Elle permet de saisir, transcrire par la voix, signer et exporter des rapports d'intervention de maintenance automobile professionnels au format Word (.docx).

---

## 🌟 Fonctionnalités Principales

### 🎙️ 1. Dictée Vocale & Analyse Intelligente
- Enregistrement audio direct depuis le navigateur (compatible smartphone, tablette et PC d'atelier).
- Transcription et structuration automatique par IA (Gemini Flash) : extraction du véhicule, de la plaque d'immatriculation SIV, du kilométrage, du type d'intervention, du diagnostic, des travaux réalisés et des pièces changées.

### 🔧 2. Suivi Détaillé des Pièces Remplacées
- Tableau dédié pour renseigner :
  - **Désignation de la pièce** (ex. : *Kit distribution & pompe à eau*, *Disques et plaquettes avant*)
  - **Référence pièce OEM / Constructeur** (ex. : *BOSCH 0 986 479 123*)
  - **Quantité** installée
  - **Motif du remplacement** (usure prononcée, fuite, rupture, entretien préventif selon préconisation constructeur)

### ✍️ 3. Double Signature Tactile sur Écran
- Pad de signature manuscrite tactile pour le **Technicien / Mécanicien**.
- Pad de signature tactile pour le **Client / Responsable de Flotte**.
- Export automatique des signatures en images haute résolution dans le document Word final.

### 📄 4. Export Word (.docx) Professionnel
- Génération instantanée côté client d'un document Word soigné :
  - En-tête officiel d'atelier mécanique
  - Récapitulatif véhicule et immatriculation
  - Tableau formalisé des pièces remplacées
  - Diagnostic, constat et préconisations de sécurité
  - Blocs de signatures horodatés

### 🗂️ 5. Historique Local Récent (`localStorage`)
- Accès rapide aux dernières interventions classées par plaque d'immatriculation.
- Filtre et recherche en direct par immatriculation SIV, modèle ou technicien.
- Rechargement instantané d'une fiche précédente en 1 clic pour révision ou duplication.
- Stockage persistant et autonome sans dépendance à un serveur externe.

---

## 🛠️ Stack Technique

- **Frontend** : React 19, TypeScript, Tailwind CSS, Lucide React
- **Signature Tactile** : HTML5 Canvas haute résolution avec support tactile et souris
- **Génération Word** : `docx` (format Microsoft Word natif OpenXML)
- **Backend / API** : Express, Node.js, `@google/genai` (Gemini Flash)
- **Outillage** : Vite, TSX, ESLint

---

## 🚀 Installation et Lancement

### 1. Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)
- Clé d'API Google Gemini (optionnelle si utilisation sans analyse vocale IA)

### 2. Cloner le projet
```bash
git clone https://github.com/VOTRE_UTILISATEUR/micro-carnet-auto.git
cd micro-carnet-auto
```

### 3. Installer les dépendances
```bash
npm install
```

### 4. Configurer l'environnement
Créez un fichier `.env` à la racine (sur la base de `.env.example`) :
```env
GEMINI_API_KEY=votre_cle_api_gemini
PORT=3000
```

### 5. Démarrer l'application
```bash
# Mode développement avec serveur Express + Vite
npm run dev

# Exécution des tests automatisés
npm test

# Build de production
npm run build
```

L'application est accessible sur `http://localhost:3000`.

---

## 🧪 Tests Automatisés

Le projet inclut une suite de tests automatisée vérifiant la génération des documents Word, la conversion des signatures et la conformité du schéma de données :
```bash
npm test
```

---

## 📄 Licence

Ce projet est sous licence MIT - libre d'utilisation et d'adaptation.
