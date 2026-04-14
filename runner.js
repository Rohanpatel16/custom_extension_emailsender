document.addEventListener('DOMContentLoaded', async () => {
    const progressDiv = document.getElementById('progress');
    const logDiv = document.getElementById('log');
    const closeBtn = document.getElementById('closeBtn');

    // Load data from storage (passed from popup)
    const data = await chrome.storage.local.get(['bulkQueue', 'webhookUrl', 'delaySettings']);
    const queue = data.bulkQueue || [];
    const DEFAULT_WEBHOOK = 'http://localhost:5678/webhook/email-sender';
    const webhookUrl = data.webhookUrl || DEFAULT_WEBHOOK;
    const delay = data.delaySettings || 0;

    if (!webhookUrl) {
        log("❌ Error: Webhook URL not found.", "error");
        return;
    }

    if (queue.length === 0) {
        log("⚠️ No emails to send.", "warning");
        progressDiv.textContent = "No emails in queue.";
        enableClose();
        return;
    }

    log(`🚀 Starting batch of ${queue.length} emails...`);

    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        // Update Progress UI
        progressDiv.textContent = `Sending ${i + 1} of ${queue.length}...`;

        try {
            // Simulate delay
            let currentDelay = 0;
            if (typeof delay === 'object') {
                const min = delay.min || 0;
                const max = delay.max || min;
                const actualMin = Math.min(min, max);
                const actualMax = Math.max(min, max);
                if (actualMax > 0) {
                    currentDelay = Math.floor(Math.random() * (actualMax - actualMin + 1) + actualMin);
                }
            } else {
                currentDelay = typeof delay === 'number' ? delay : 0;
            }

            if (i > 0 && currentDelay > 0) {
                log(`⏳ Waiting ${currentDelay}s...`);
                await new Promise(r => setTimeout(r, currentDelay * 1000));
            }

            // Prepare payload
            const formData = {
                email: item.email,
                companyName: item.companyName,
                personName: item.personName,
                includeLink: item.includeLink
            };

            // Send Request
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                log(`✅ Sent: ${item.email}`);
                sentCount++;
            } else {
                log(`❌ Failed (${response.status}): ${item.email}`, "error");
                failedCount++;
            }

        } catch (err) {
            log(`❌ Error: ${item.email} - ${err.message}`, "error");
            failedCount++;
        }
    }

    // Final Status
    progressDiv.textContent = "Process Completed!";
    log("-------------------------");
    log(`🏁 Done. Sent: ${sentCount}, Failed: ${failedCount}`);

    if (failedCount === 0) {
        showStatus(`All ${sentCount} emails sent successfully!`, 'success');
    } else {
        showStatus(`Completed with errors. Sent: ${sentCount}, Failed: ${failedCount}`, 'error');
    }

    // Clear queue to prevent re-sending if window reloads
    await chrome.storage.local.set({ bulkQueue: [] });

    enableClose();

    // Auto-close 2 seconds after completion
    setTimeout(() => {
        window.close();
    }, 2000);
});

function enableClose() {
    const closeBtn = document.getElementById('closeBtn');
    closeBtn.disabled = false;
    closeBtn.textContent = "Close Window";
    closeBtn.addEventListener('click', () => window.close());
}

function log(msg, type = "info") {
    const logDiv = document.getElementById('log');
    const div = document.createElement('div');
    div.textContent = msg;
    if (type === "error") div.style.color = "red";
    if (type === "warning") div.style.color = "orange";
    logDiv.appendChild(div);
    logDiv.scrollTop = logDiv.scrollHeight;
}

function showStatus(text, type) {
    const statusBar = document.getElementById('statusBar');
    statusBar.textContent = text;
    statusBar.className = 'status-bar ' + type;
    statusBar.style.display = 'block';
}
