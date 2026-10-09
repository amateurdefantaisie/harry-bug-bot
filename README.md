# Harry Bug Bot

Bot WhatsApp Node.js destiné à des tests fonctionnels limités, uniquement sur des comptes et des destinataires qui ont explicitement consenti. Ce dépôt n'est pas conçu pour le spam, le harcèlement ou le contournement des systèmes anti-abus.

## Prérequis

- Node.js 18 ou supérieur
- npm
- Un compte WhatsApp que vous êtes autorisé à utiliser
- Un terminal interactif pour la première authentification

## Installation

```bash
git clone https://github.com/amateurdefantaisie/harry-bug-bot.git
cd harry-bug-bot
npm install
cp .env.example .env
```

Modifiez `.env` et renseignez les numéros réels. Les valeurs d'exemple ne sont pas des numéros valides.

- `ADMIN_NUMBERS` : numéros qui peuvent envoyer des commandes, séparés par des virgules.
- `TARGET_NUMBERS` : cibles de test autorisées avec leur consentement, séparées par des virgules.
- `MAX_MESSAGES_PER_RUN` : plafond configurable de 1 à 5 messages par exécution (5 par défaut). L’assistant demande la quantité à chaque test.
- `DELAY_MIN` et `DELAY_MAX` : délais en secondes, de 1 à 60. `BATCH_SIZE` et `BATCH_PAUSE` sont obsolètes : ils sont ignorés et peuvent être supprimés des variables d’hébergement.
- `PUPPETEER_NO_SANDBOX` : désactivé par défaut. Ne l'activer que si l'environnement l'exige et après évaluation du risque.

Sans administrateur configuré, toutes les commandes sont refusées. Une cible qui ne figure pas dans `TARGET_NUMBERS` est refusée. Les commandes administratives ne fonctionnent pas dans les groupes.

## Déploiement sur un hébergeur Pterodactyl/Bot-Hosting

1. Dans le panneau du serveur, choisissez la version Node.js compatible (Node 18 ou plus récent, de préférence une version LTS prise en charge par l’hébergeur).
2. Vérifiez que le dépôt est bien cloné et que le serveur démarre dans le dossier qui contient `package.json`.
3. Configurez les variables dans la section **Startup / Variables / Environment** du panneau. Sur un hébergeur, ces variables sont généralement injectées dans le processus Node.js : elles remplacent la configuration locale et il n’est pas nécessaire d’y téléverser un fichier `.env`.
4. Définissez au minimum `ADMIN_NUMBERS` et `TARGET_NUMBERS` avec des numéros au format international, chiffres seulement, sans `+`, séparés par des virgules. N’ajoutez que des destinataires ayant consenti aux tests.
5. Supprimez les anciennes variables `BATCH_SIZE` et `BATCH_PAUSE` du panneau si elles existent. Le code ne les utilise plus ; après cette correction, elles ne doivent plus empêcher le démarrage.
6. Vérifiez que `MAX_MESSAGES_PER_RUN` est un entier entre 1 et 5, `DELAY_MIN` et `DELAY_MAX` des entiers entre 1 et 60, avec le minimum inférieur ou égal au maximum.
7. Utilisez `npm install` si l’hébergeur ne l’exécute pas automatiquement, puis redémarrez le serveur. La commande de démarrage doit être `npm start` ou `node src/index.js`.
8. Pour la première authentification, le processus doit pouvoir recevoir une entrée interactive et afficher le QR code. Si le panneau ne fournit pas de terminal interactif, authentifiez la session dans un terminal interactif puis conservez le dossier de session dans un stockage persistant et privé. Ne partagez pas les fichiers de session.

### Différence entre `.env` et `.env.example`

- `.env.example` est un modèle versionné dans Git. Il ne contient pas tes vrais numéros et le programme ne le charge pas automatiquement.
- `.env` est ton fichier local de configuration, créé en copiant le modèle avec `cp .env.example .env`. Il est ignoré par Git et ne doit pas être envoyé au dépôt.
- Dans Bot-Hosting, renseigne plutôt les valeurs dans les variables du panneau. Un fichier `.env` local dans Codespaces n’est pas automatiquement transféré sur le serveur d’hébergement.
- Si l’explorateur semble montrer deux fichiers similaires, vérifie les noms complets : `.env` et `.env.example` sont deux fichiers distincts. Le dépôt ne contient pas de fichier `.env` réel.

## Démarrage

```bash
npm run check
npm test
npm start
```

Au premier démarrage, choisissez le QR code ou le code d'appairage. Gardez le dossier de session privé et persistant. Ne le commitez jamais et ne partagez jamais son contenu.

## Commandes

- `!help` : aide
- `!test` : assistant interactif demandant la cible, le nombre de messages, le texte, puis une confirmation
- `!cancel` : annule la configuration interactive avant l’envoi
- `!stop` : demande l'arrêt du test
- `!stats` : statistiques en mémoire
- `!status` : état de connexion
- `!cible` : nombre de cibles autorisées configurées

Les anciennes commandes `!bug` et `!bugconfig` sont désactivées. L’assistant récapitule la cible, la quantité et le texte, puis exige une confirmation explicite. Le plafond reste fixé à cinq messages maximum par exécution et le test s'arrête en cas d'échec d'envoi. N'utilisez pas cet outil pour tester des limites anti-spam ou contacter des personnes sans consentement.

## Sécurité et déploiement

- Limitez l'accès système au processus et au répertoire de session.
- Utilisez un stockage persistant privé pour la session.
- Préférez Chromium avec sandbox activé.
- Ne publiez pas `.env`, les sessions ou les journaux contenant des données personnelles.
- WhatsApp Web est une interface non officielle susceptible de changer ; une mise à jour peut casser l'authentification.
- Vérifiez les conditions de WhatsApp et les lois applicables avant tout test.

## Dépannage

- **Commandes ignorées** : vérifiez `ADMIN_NUMBERS`, au format international sans signe plus.
- **Cible refusée** : vérifiez `TARGET_NUMBERS` et assurez-vous que le destinataire a consenti.
- **Session perdue** : vérifiez la persistance et les permissions du dossier de session.
- **Chromium ne démarre pas** : vérifiez les dépendances système et évitez de désactiver le sandbox sauf nécessité.

## Licence

MIT.
