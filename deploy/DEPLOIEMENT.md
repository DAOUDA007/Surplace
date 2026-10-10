# Mettre SURPLACE en ligne

Guide pas à pas pour un serveur Linux (VPS Ubuntu 22.04 ou plus récent, 2 Go de mémoire suffisent au lancement).

## 1. Ce qu'il faut

- Un **VPS** (OVH, Hostinger, Contabo, DigitalOcean…), avec accès SSH.
- Un **nom de domaine**, par exemple `surplace.ci` (registre .ci : NIC.CI), avec deux adresses :
  - `surplace.ci` → l'Application (passagers, chauffeurs) ;
  - `admin.surplace.ci` → l'Administration.
  Chez votre registraire, créez deux enregistrements DNS de type **A** vers l'adresse IP du serveur.

## 2. Installer les outils

```bash
sudo apt update && sudo apt install -y nginx git build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 3. Récupérer le projet et le compiler

```bash
git clone <adresse de votre dépôt> /opt/surplace
cd /opt/surplace
npm install
npm run install:all
cp Backend/.env.example Backend/.env
nano Backend/.env          # renseignez SITE_URL=https://surplace.ci, ADMIN_URL=https://admin.surplace.ci, Gmail, SMS…
BACKEND_URL=http://127.0.0.1:4000 npm run build
```

> `BACKEND_URL` est lu au moment de la compilation : gardez-le dans la commande `npm run build`.

## 4. Démarrer les trois programmes

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup            # copiez-collez la commande affichée : relance automatique après un redémarrage
```

Vérifier : `pm2 status` (trois lignes « online »), `curl http://127.0.0.1:4000/api/health` → `{"ok":true,…}`.

Avant le premier lancement, modifiez `ADMIN_URL` dans `deploy/ecosystem.config.cjs` si votre domaine n'est pas `admin.surplace.ci`.

## 5. Nginx et HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/surplace
sudo nano /etc/nginx/sites-available/surplace      # remplacez surplace.ci par votre domaine
sudo ln -s /etc/nginx/sites-available/surplace /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Certificats HTTPS gratuits (Let's Encrypt), renouvelés automatiquement :
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d surplace.ci -d www.surplace.ci -d admin.surplace.ci
```

Le **HTTPS est indispensable** : sans lui, les téléphones refusent le GPS et les notifications push.

## 6. Première connexion

1. Ouvrez `https://admin.surplace.ci` et connectez-vous avec le compte admin de démonstration (`07 00 00 00 00`, PIN `1234`).
2. **Changez tout de suite** le numéro et le code PIN dans « Mon compte ».
3. Supprimez les comptes de démonstration passager et chauffeur (`07 00 00 00 01` et `07 00 00 00 02`).
4. Réglez les tarifs dans « Tarifs et réglages ».

## 7. Mettre à jour

```bash
cd /opt/surplace
git pull
npm run install:all
BACKEND_URL=http://127.0.0.1:4000 npm run build
pm2 restart all
```

La base de données est migrée automatiquement au démarrage (nouvelles colonnes et tables).

## 8. Sauvegardes

- Automatique : une copie par jour dans `Backend/data/backups/`, gardée 30 jours (écran « Système et sauvegardes »).
- **Copiez aussi ces fichiers hors du serveur** (sinon une panne de disque les emporterait), par exemple chaque nuit :
  ```bash
  # crontab -e
  30 3 * * * rsync -a /opt/surplace/Backend/data/backups/ utilisateur@autre-serveur:/sauvegardes/surplace/
  ```
- Restaurer : arrêtez l'API (`pm2 stop surplace-api`), remplacez `Backend/data/surplace.db` par une sauvegarde, relancez (`pm2 start surplace-api`).

## 9. Surveillance

- `https://surplace.ci/api/health` répond `{"ok":true}` quand tout va bien (code 503 sinon). Un service gratuit comme UptimeRobot peut l'interroger toutes les 5 minutes et vous prévenir par SMS ou e-mail.
- Journaux : `pm2 logs` (ou `pm2 logs surplace-api`).

## 10. Itinéraires routiers (facultatif)

Pour mesurer les distances par la route (prix plus justes, tracé sur la carte), installez un serveur **OSRM** avec la carte de Côte d'Ivoire :

```bash
sudo apt install -y docker.io
mkdir -p /opt/osrm && cd /opt/osrm
wget https://download.geofabrik.de/africa/ivory-coast-latest.osm.pbf
sudo docker run -t -v "$PWD:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/ivory-coast-latest.osm.pbf
sudo docker run -t -v "$PWD:/data" osrm/osrm-backend osrm-partition /data/ivory-coast-latest.osrm
sudo docker run -t -v "$PWD:/data" osrm/osrm-backend osrm-customize /data/ivory-coast-latest.osrm
sudo docker run -d --restart=always -p 127.0.0.1:5000:5000 -v "$PWD:/data" osrm/osrm-backend osrm-routed --algorithm mld /data/ivory-coast-latest.osrm
```

Puis dans `Backend/.env` : `OSRM_URL=http://127.0.0.1:5000`, et `pm2 restart surplace-api`.
L'écran « Système et sauvegardes » indique alors « OSRM configuré ».

## 11. SMS

Sans fournisseur, aucun SMS ne part et la vérification des numéros est désactivée en production.
Pour l'activer : compte développeur sur https://developer.orange.com, offre SMS Côte d'Ivoire, puis dans `Backend/.env` :
`SMS_PROVIDER=orange`, `ORANGE_CLIENT_ID`, `ORANGE_CLIENT_SECRET`, `ORANGE_SENDER`. Redémarrez l'API.
