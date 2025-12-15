# Documentation: API de Gestion des Règles de Badges

## Nouveaux Endpoints

### Base URL: `/badgeRule`

Tous les endpoints nécessitent une authentification (`authMiddleware`).

---

## 📋 Liste des Endpoints

### 1. **GET** `/badgeRule/getAll`
Récupère toutes les règles de badges.

**Response:**
```json
[
  {
    "_id": "...",
    "badgeName": "Premier Pas",
    "conditionType": "completedTrainings",
    "conditionField": "completedTrainings",
    "operator": ">=",
    "value": 1,
    "isActive": true,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

---

### 2. **GET** `/badgeRule/active`
Récupère uniquement les règles actives.

**Response:** Même format que `/getAll`, filtré sur `isActive: true`.

---

### 3. **GET** `/badgeRule/badge/:badgeName`
Récupère toutes les règles pour un badge spécifique.

**Exemple:** `/badgeRule/badge/Marathon`

---

### 4. **GET** `/badgeRule/get/:id`
Récupère une règle spécifique par son ID.

---

### 5. **POST** `/badgeRule/create`
Crée une nouvelle règle de badge.

**Body:**
```json
{
  "badgeName": "Marathon",
  "conditionType": "totalPoints",
  "conditionField": "totalPoints",
  "operator": ">=",
  "value": 5000,
  "isActive": true
}
```

**Champs:**
- `badgeName` (string, required): Nom du badge associé
- `conditionType` (enum, required): `"totalPoints"` | `"completedTrainings"` | `"custom"`
- `conditionField` (string, required): Champ à évaluer (ex: `"totalPoints"`, `"completedTrainings"`)
- `operator` (enum, required): `">="` | `">"` | `"="` | `"<"` | `"<="`
- `value` (number, required): Valeur seuil à atteindre
- `customCondition` (string, optional): Condition personnalisée pour les règles complexes
- `isActive` (boolean, default: true): Statut de la règle

---

### 6. **PATCH** `/badgeRule/update/:id`
Met à jour une règle existante.

**Body:** Tous les champs sont optionnels (au moins un requis).

---

### 7. **PATCH** `/badgeRule/toggle/:id`
Active ou désactive une règle.

**Response:**
```json
{
  "message": "Rule activated",
  "data": { ... }
}
```

---

### 8. **DELETE** `/badgeRule/delete/:id`
Supprime une règle spécifique.

---

### 9. **DELETE** `/badgeRule/deleteAll`
Supprime toutes les règles (à utiliser avec précaution).

---

## 🔄 Système d'Évaluation Dynamique

Le [badgeService.ts](src/utils/badgeService.ts) a été refactorisé pour évaluer les règles dynamiquement :

### Avant (règles codées en dur):
```typescript
if (statsCount >= 1) {
    await this.awardBadge(userId, "Premier Pas");
}
```

### Après (règles dynamiques):
```typescript
const activeRules = await BadgeRuleModel.find({ isActive: true });
for (const rule of activeRules) {
    const shouldAward = await this.evaluateRule(rule, userData);
    if (shouldAward) {
        await this.awardBadge(userId, rule.badgeName);
    }
}
```

---

## 📦 Seeder

Le seeder inclut maintenant 6 règles par défaut :
- **Premier Pas**: 1 entraînement complété
- **Débutant Motivé**: 3 entraînements complétés
- **Acharné**: 10 entraînements complétés
- **Expert**: 1000 points
- **Marathon**: 5000 points
- **Champion**: 10000 points

Exécuter le seeder:
```bash
npm run seed
```

---

## 🎯 Exemples d'Utilisation

### Créer une règle "Ultra Marathon" (10000 points):
```bash
POST /badgeRule/create
{
  "badgeName": "Ultra Marathon",
  "conditionType": "totalPoints",
  "conditionField": "totalPoints",
  "operator": ">=",
  "value": 10000
}
```

### Créer une règle "Régularité" (50 entraînements):
```bash
POST /badgeRule/create
{
  "badgeName": "Régularité",
  "conditionType": "completedTrainings",
  "conditionField": "completedTrainings",
  "operator": ">=",
  "value": 50
}
```

### Désactiver temporairement une règle:
```bash
PATCH /badgeRule/toggle/:ruleId
```

---

## ⚠️ Notes de Sécurité

- Les `customCondition` utilisent `eval()` - **À utiliser avec précaution en production**
- En production, remplacer par une bibliothèque sécurisée comme `json-rules-engine`
- Tous les endpoints nécessitent une authentification

---

## 🔗 Fichiers Modifiés/Créés

- ✅ [src/models/badgeRuleModel.ts](src/models/badgeRuleModel.ts) - Nouveau modèle
- ✅ [src/schemas/badgeRuleSchema.ts](src/schemas/badgeRuleSchema.ts) - Validation Zod
- ✅ [src/routes/badgeRuleRouter.ts](src/routes/badgeRuleRouter.ts) - Routes API
- ✅ [src/utils/badgeService.ts](src/utils/badgeService.ts) - Logique dynamique
- ✅ [seeders/badgeRuleSeeder.ts](seeders/badgeRuleSeeder.ts) - Données initiales
- ✅ [index.ts](index.ts) - Enregistrement de la route `/badgeRule`
