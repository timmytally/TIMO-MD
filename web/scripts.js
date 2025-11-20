const statusEl = document.getElementById("status");
const qrEl = document.getElementById("qr");
const ownerEl = document.getElementById("owner");

// Fetch status every 2 seconds
async function fetchStatus() {
    try {
        const res = await fetch("/status");
        const data = await res.json();

        statusEl.textContent = "Status: " + data.status;

        if (data.qr) {
            qrEl.innerHTML = `<img src="${data.qr}" alt="QR Code" width="200">`;
        } else {
            qrEl.innerHTML = "";
        }

        ownerEl.textContent = "Owner: " + (data.owner || "Unknown");
    } catch (err) {
        statusEl.textContent = "Status: Error";
        qrEl.innerHTML = "";
        console.error(err);
    }
}

setInterval(fetchStatus, 2000);
fetchStatus();

// Send commands via API
async function sendCommand(cmd) {
    try {
        const res = await fetch("/send-command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: cmd })
        });
        const data = await res.json();
        alert("Bot response: " + data.message);
    } catch (err) {
        console.error(err);
        alert("Failed to send command.");
    }
}
