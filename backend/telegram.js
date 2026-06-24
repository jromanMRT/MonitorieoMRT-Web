const https = require("https");
const db = require("./database");

/**
 * Envía un mensaje formateado a Telegram si la alerta está activada y configurada.
 * @param {string} mensaje - Mensaje a enviar
 */
function enviarMensajeTelegram(mensaje) {
  return new Promise((resolve) => {
    db.get(
      "SELECT alerta_telegram, telegram_token, telegram_chat_id FROM configuracion WHERE id = 1",
      (err, config) => {
        if (err) {
          console.error("Error al leer configuración de Telegram:", err);
          return resolve(false);
        }

        if (!config || !config.alerta_telegram) {
          return resolve(false);
        }

        const token = config.telegram_token ? config.telegram_token.trim() : "";
        const chatId = config.telegram_chat_id ? config.telegram_chat_id.trim() : "";

        if (!token || !chatId) {
          console.warn("Telegram habilitado pero TOKEN o CHAT_ID no están configurados.");
          return resolve(false);
        }

        const payload = JSON.stringify({
          chat_id: chatId,
          text: mensaje,
          parse_mode: "HTML"
        });

        const options = {
          hostname: "api.telegram.org",
          port: 443,
          path: `/bot${token}/sendMessage`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload)
          }
        };

        const req = https.request(options, (res) => {
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(true);
            } else {
              console.error("Error de Telegram API:", body);
              resolve(false);
            }
          });
        });

        req.on("error", (error) => {
          console.error("Error de red al enviar a Telegram:", error.message);
          resolve(false);
        });

        req.write(payload);
        req.end();
      }
    );
  });
}

module.exports = { enviarMensajeTelegram };
