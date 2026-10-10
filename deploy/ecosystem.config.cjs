/**
 * PM2 : garde les trois programmes en marche sur le serveur et les relance s'ils s'arrêtent
 * (ou après un redémarrage du serveur avec « pm2 startup » puis « pm2 save »).
 *
 * Lancement, depuis la racine du projet, après « npm run install:all » et « npm run build » :
 *   pm2 start deploy/ecosystem.config.cjs
 */
const path = require("node:path");

const root = path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "surplace-api",
      cwd: path.join(root, "Backend"),
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production", PORT: "4000" },
      max_memory_restart: "400M",
    },
    {
      name: "surplace-application",
      cwd: path.join(root, "Application"),
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production", BACKEND_URL: "http://127.0.0.1:4000", ADMIN_URL: "https://admin.surplace.ci" },
    },
    {
      name: "surplace-administration",
      cwd: path.join(root, "Administration"),
      script: "npm",
      args: "start",
      env: { NODE_ENV: "production", BACKEND_URL: "http://127.0.0.1:4000" },
    },
  ],
};
