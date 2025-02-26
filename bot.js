const makeWASocket = require("@whiskeysockets/baileys").default;
const { useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    let sock; // Declare sock outside to make it accessible in event handlers

    async function connectToWhatsApp() {
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false, // We'll handle QR in connection.update
            browser: ['MyBot', 'Chrome', '1.0.0'], // More explicit browser details.
        });

        sock.ev.on("connection.update", (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log("🔹 امسح رمز QR لتسجيل الدخول:");
                qrcode.generate(qr, { small: true });
            }

            if (connection === "close") {
                const shouldReconnect =
                    lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log(
                    "connection closed due to ",
                    lastDisconnect.error,
                    ", reconnecting ",
                    shouldReconnect
                );
                if (shouldReconnect) {
                    connectToWhatsApp(); // Attempt to reconnect
                } else {
                    console.log("Logged out.  Delete auth_info and re-run.");
                    // Consider deleting auth_info here automatically, but be careful.
                    // fs.rmSync("auth_info", { recursive: true, force: true }); // Example (use with caution!)
                }
            } else if (connection === "open") {
                console.log("opened connection");
            }
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("messages.upsert", async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const sender = msg.key.remoteJid;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

            console.log(`📩 رسالة جديدة من ${sender}: ${text}`);

            let reply;
            if (text.toLowerCase() === "مرحبا") {
                reply = "أهلًا وسهلًا! كيف يمكنني مساعدتك؟ 😊";
            } else if (text.toLowerCase().includes("كيف حالك")) {
                reply = "أنا بوت واتساب، وأعمل بشكل رائع! 💪😁";
            } else {
                reply = "أنا مجرد بوت، لا أفهم كل شيء بعد! 🤖";
            }

            await sock.sendMessage(sender, { text: reply });
            console.log(`✅ تم الرد على ${sender}: ${reply}`);
        });
    }

    connectToWhatsApp(); // Initial connection
}

startBot();