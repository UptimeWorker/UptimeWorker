# Contribuer à UptimeWorker

Merci de votre intérêt pour contribuer à UptimeWorker ! Nous accueillons les contributions de la communauté.

## Comment Contribuer

### Signaler des Bugs

Si vous trouvez un bug, veuillez créer une issue avec :
- Une description claire du problème
- Les étapes pour le reproduire
- Le comportement attendu vs le comportement réel
- Les détails de l'environnement (OS, navigateur, version Node)

### Suggérer des Fonctionnalités

Les demandes de fonctionnalités sont les bienvenues ! Veuillez :
- Vérifier d'abord les issues existantes pour éviter les doublons
- Fournir des cas d'utilisation et des exemples clairs
- Expliquer pourquoi cette fonctionnalité serait utile

### Pull Requests

1. **Forkez le dépôt** et créez une nouvelle branche depuis `main`
2. **Effectuez vos modifications** :
   - Suivez le style de code existant
   - Ajoutez des tests si applicable
   - Mettez à jour la documentation si nécessaire
3. **Testez vos modifications** :
   ```bash
   npm install
   npm run dev
   npm run build
   ```
4. **Commitez vos modifications** :
   - Utilisez des messages de commit clairs et descriptifs
   - Référencez les issues liées (ex: "Fix #123")
5. **Pushez vers votre fork** et créez une pull request

### Configuration de Développement

```bash
# Clonez votre fork
git clone https://github.com/VOTRE_NOM/uptimeworker.git
cd uptimeworker

# Installez les dépendances
npm install

# Copiez le fichier d'environnement
cp .env.example .env

# Créez votre configuration de monitors
cp monitors.json.example monitors.json
# Éditez monitors.json avec vos services de test

# Démarrez le serveur de développement
npm run dev

# Lancez les tests (quand disponibles)
npm test

# Build pour la production
npm run build
```

### Style de Code

- TypeScript pour tous les fichiers source
- React 19 avec composants fonctionnels et hooks
- Tailwind CSS pour le styling
- Suivez les patterns existants dans le codebase

### Messages de Commit

Utilisez des messages de commit clairs et descriptifs :
- `feat: Ajout d'une nouvelle fonctionnalité de monitoring`
- `fix: Résolution du problème de rendu de la timeline`
- `docs: Mise à jour du guide d'installation`
- `refactor: Simplification de la logique de calcul de statut`

### Code de Conduite

En participant à ce projet, vous acceptez de respecter notre [Code de Conduite](CODE_OF_CONDUCT.fr.md).

### Licence

En contribuant, vous acceptez que vos contributions soient sous licence MIT.
Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## Questions ?

N'hésitez pas à ouvrir une issue pour toute question ou préoccupation.

Merci de contribuer ! 🚀
