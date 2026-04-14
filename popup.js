document.addEventListener('DOMContentLoaded', function () {
    const emailForm = document.getElementById('emailForm');
    const webhookUrlInput = document.getElementById('webhookUrl');
    const saveWebhookBtn = document.getElementById('saveWebhookBtn');
    const configToggle = document.getElementById('configToggle');
    const configContent = document.getElementById('configContent');
    const toggleIcon = document.getElementById('toggleIcon');
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const loadingText = loading.querySelector('p');
    const messageDiv = document.getElementById('message');

    // Mode Toggle Elements
    const modeSwitch = document.getElementById('modeSwitch');
    const singleFields = document.getElementById('singleFields');
    const bulkFields = document.getElementById('bulkFields');
    const bulkEmailsInput = document.getElementById('bulkEmails');

    // Preview Elements
    const previewContainer = document.getElementById('previewContainer');
    const previewBtn = document.getElementById('previewBtn');
    const previewBody = document.getElementById('previewBody');
    const backToEditBtn = document.getElementById('backToEditBtn');
    const firstNameOnlyCheckbox = document.getElementById('firstNameOnly');
    const globalLinkOption = document.getElementById('globalLinkOption'); // Container for single-mode link

    // State for Bulk Preview
    let bulkData = []; // Array of objects: { id, email, name, company, includeLink }
    let isPreviewMode = false;

    // Default configuration
    const DEFAULT_WEBHOOK = 'http://localhost:5678/webhook/email-sender';

    // Inputs for auto-extraction (Single Mode)
    const emailInput = document.getElementById('email');
    const companyNameInput = document.getElementById('companyName');
    const personNameInput = document.getElementById('personName');

    // --- Helpers ---

    function extractNameFromEmail(email) {
        if (!email.includes('@')) return '';
        let userPart = email.split('@')[0];
        let name = userPart.replace(/[._]/g, ' ');
        return name.replace(/\b\w/g, l => l.toUpperCase());
    }

    // List of common company suffixes/keywords to split by (Sorted by length for better matching)
    // You can add more to this list to "train" it further!
    const COMPANY_KEYWORDS = [
        'Technologies', 'Technology', 'Solutions', 'Solution', 'Systems', 'System',
        'Infotech', 'Group', 'Global', 'Consulting', 'Services', 'Software',
        'Labs', 'Lab', 'Media', 'Digital', 'Studio', 'Ventures', 'Enterprises',
        'International', 'Industries', 'Soft', 'Tech', 'Corp', 'Inc', 'Ltd', 'Pvt',
        'Hub', 'IT', 'Web', 'Net', 'Sys', 'Com', 'Health', 'Care', 'Pharma',
        'Energy', 'Logistics', 'Capital', 'Finance', 'Data', 'Cloud', 'Interactive',
        'Networks', 'Network', 'Security', 'Designs', 'Design', 'Creative',
        'Holdings', 'Holding', 'Partners', 'Partner', 'Associates', 'Associate',
        'Consultants', 'Consultant', 'Advisors', 'Advisor', 'Management',
        'Development', 'Developers', 'Developer', 'Infra', 'Construction',
        'Realty', 'Estates', 'Estate', 'Properties', 'Property', 'Housing',
        'Foods', 'Food', 'Beverages', 'Beverage', 'Exports', 'Export',
        'Imports', 'Import', 'Traders', 'Trader', 'Trading', 'Marketing',
        'Communications', 'Communication', 'Events', 'Event', 'Entertainment',
        'Productions', 'Production', 'Education', 'Learning', 'Academy',
        'School', 'College', 'University', 'Institute', 'Hospital', 'Hospitals',
        'Clinic', 'Clinics', 'Diagnostics', 'Diagnostic', 'Life', 'Sciences',
        'Science', 'Bio', 'Genetics', 'Pharma', 'Pharmaceuticals', 'Chemicals',
        'Chemical', 'Engineering', 'Engineers', 'Engineer', 'Works', 'Work',
        'Manufacturing', 'Manufactures', 'Manufacturer', 'Automotives',
        'Automotive', 'Auto', 'Motors', 'Motor', 'Power', 'Electric',
        'Solar', 'Wind', 'Renewables', 'Renewable', 'Green', 'Enviro',
        'Metals', 'Metal', 'Steel', 'Iron', 'Alloys', 'Alloy', 'Mining',
        'Minerals', 'Mineral', 'Resources', 'Resource', 'Oils', 'Oil',
        'Gas', 'Petroleum', 'Petro', 'Chemicals', 'Chemical', 'Fertilizers',
        'Fertilizer', 'Agro', 'Agriculture', 'Farms', 'Farm', 'Seeds',
        'Seed', 'Textiles', 'Textile', 'Fabrics', 'Fabric', 'Garments',
        'Garment', 'Apparels', 'Apparel', 'Fashion', 'Lifestyle', 'Retail',
        'Stores', 'Store', 'Shop', 'Mall', 'Mart', 'Bazaar', 'Online',
        'Ecom', 'Commerce', 'Fintech', 'Edtech', 'Healthtech', 'Medtech',
        'Insurtech', 'Proptech', 'Logitech', 'Foodtech', 'Agrotech',
        'Cleantech', 'Greentech', 'Biotech', 'Nanotech', 'Robotics',
        'AI', 'ML', 'IoT', 'Blockchain', 'Cyber', 'Security', 'Defence',
        'Aerospace', 'Aviation', 'Marine', 'Shipping', 'Logistics',
        'Transport', 'Travel', 'Tourism', 'Hospitality', 'Hotels',
        'Hotel', 'Resorts', 'Resort', 'Restaurants', 'Restaurant',
        'Cafe', 'Bistro', 'Foods', 'Food', 'Beverages', 'Beverage',
        'India', 'Indian', 'International', 'Global', 'World', 'Asia',
        'Better', 'Best', 'Smart', 'Future', 'Next', 'Neo',
        'Foundation', 'Trust', 'Society', 'Association', 'Council',
        'Times', 'Post', 'News', 'Media', 'Chronicle', 'Journal'
    ];

    function extractCompanyFromEmail(email) {
        if (!email.includes('@')) return '';
        let domainPart = email.split('@')[1];
        if (!domainPart) return '';

        // Remove .com, .co.in, etc.
        let companyBase = domainPart.split('.')[0];
        let originalBase = companyBase; // Keep original for reference

        // --- Smart Extraction Strategy ---
        // Iterate through keywords to find any that exist inside the string
        // We want to find the *last* matching keyword or the *longest* meaningful one to split correctly.

        let foundKeyword = '';
        let splitIndex = -1;

        // Sort keywords by length descending to match "Better" before "Bet" (if it existed)
        // The list is already sorted roughly by length/importance in declaration

        for (let keyword of COMPANY_KEYWORDS) {
            let lowerKeyword = keyword.toLowerCase();
            let idx = companyBase.toLowerCase().indexOf(lowerKeyword);

            if (idx > 0) {
                // Found keyword inside (not at start). 
                // We pick the one that appears latest or is longest? 
                // Let's stick to the first valid 'suffix' style match we find from our sorted list.
                // But wait, for 'thebetterindia', 'better' is in the middle, 'india' is at the end.
                // 'India' (length 5) vs 'Better' (length 6).
                // If we match 'India' at the end, we get "Thebetter India".
                // If we match 'Better', we might get "The Betterindia".

                // Let's try a recursive approach or multi-split?
                // For simplicity: Replace ALL known keywords with space + keyword

                // New Strategy: Insert space before every known keyword found
                // We must be careful not to double space or break inside words wrongly
                // Safer approach for now: Just one split at the *last* matched keyword?
                // The user's case: "thebetterindia" -> "Thebetter India". 
                // "India" was found at end. "Better" was NOT found because we stopped after first match?
                // The previous logic broke `break` after first match.

                // Let's try to match ALL keywords.

                // Actually, let's just insert a space before the keyword if found
                let regex = new RegExp(keyword, "ig");
                // Only replace if it's not already separated (this is hard in a solid string)
                // Let's just use the end-match logic but RECURSIVE?
                // No, just find the BEST split.

                if (companyBase.toLowerCase().endsWith(lowerKeyword)) {
                    splitIndex = companyBase.length - lowerKeyword.length;
                    foundKeyword = keyword;
                    break; // Found the suffix
                }
            }
        }

        // This logic above is what we HAD. It failed to split "Thebetter".
        // Issue: "India" matched at end. "Better" was skipped because "India" was deeper? 
        // No, "India" matched and we stopped. 
        // We need to look at the PREFIX "Thebetter" and see if IT contains keywords too.

        // REVISED ALGORITHM:
        // 1. Find suffix keyword. Split.
        // 2. Look at the remaining prefix. Does IT end with a keyword? Split again.
        // 3. Repeat until no keywords at end of prefix.

        let parts = [];
        let currentString = companyBase;

        while (true) {
            let matched = false;
            for (let keyword of COMPANY_KEYWORDS) {
                let lowerKeyword = keyword.toLowerCase();
                if (currentString.toLowerCase().endsWith(lowerKeyword) && currentString.length > lowerKeyword.length) {
                    // Ends with keyword AND leaves some prefix
                    let splitAt = currentString.length - lowerKeyword.length;
                    let suffix = keyword; // Use correct casing
                    parts.unshift(suffix); // Add to start of parts list
                    currentString = currentString.substring(0, splitAt);
                    matched = true;
                    break; // Restart loop with new shorter string to find next suffix
                }
                // If it is the whole string exactly
                else if (currentString.toLowerCase() === lowerKeyword) {
                    parts.unshift(keyword);
                    currentString = "";
                    matched = true;
                    break;
                }
            }
            if (!matched || currentString === "") break;
        }

        // Add whatever is left of the string to the front
        if (currentString.length > 0) {
            // Capitalize the prefix
            currentString = currentString.charAt(0).toUpperCase() + currentString.slice(1);
            parts.unshift(currentString);
        }

        return parts.join(' ');
    }

    // Auto-fill fields on email input (Single Mode)
    emailInput.addEventListener('input', function () {
        const email = this.value;
        const name = extractNameFromEmail(email);
        const company = extractCompanyFromEmail(email);

        if (name) personNameInput.value = name;
        if (company) companyNameInput.value = company;
    });

    // --- Mode Switching ---

    modeSwitch.addEventListener('change', function () {
        // Reset preview state when switching main modes
        isPreviewMode = false;
        bulkData = [];
        togglePreviewView(false);

        if (this.checked) {
            // Bulk Mode
            singleFields.classList.add('hidden');
            globalLinkOption.classList.add('hidden'); // Hide single link option in bulk (rows have their own)
            bulkFields.classList.remove('hidden');

            submitBtn.style.display = 'none'; // Hide main submit, we use Preview first

            // Clear single requirement
            emailInput.removeAttribute('required');
            companyNameInput.removeAttribute('required');
            personNameInput.removeAttribute('required');
        } else {
            // Single Mode
            singleFields.classList.remove('hidden');
            globalLinkOption.classList.remove('hidden');
            bulkFields.classList.add('hidden');

            submitBtn.style.display = 'block';
            submitBtn.textContent = 'Send Email';

            // Restore requirement
            emailInput.setAttribute('required', '');
            companyNameInput.setAttribute('required', '');
            personNameInput.setAttribute('required', '');
        }
    });

    // --- Preview Logic ---

    previewBtn.addEventListener('click', function () {
        const rawEmails = bulkEmailsInput.value;
        const emailList = rawEmails.split(/\r?\n/)
            .map(e => e.trim())
            .filter(e => e);

        if (emailList.length === 0) {
            showMessage('Please enter at least one email address', 'error');
            return;
        }

        // Parse and Populate Data
        bulkData = emailList.map((email, index) => {
            const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            // Default link to true for all initially
            return {
                id: index,
                email: email,
                isValid: isEmailValid,
                name: extractNameFromEmail(email),
                company: extractCompanyFromEmail(email),
                includeLink: true
            };
        });

        // Filter out bad emails? Or just show them as invalid?
        // Let's filter invalid ones for simplicity or mark them
        const validCount = bulkData.filter(d => d.isValid).length;
        if (validCount === 0) {
            showMessage('No valid emails found.', 'error');
            return;
        }

        // Apply "First Name Only" default if checked (unlikely on first load, but possible)
        if (firstNameOnlyCheckbox.checked) {
            applyFirstNameOnly();
        }

        renderTable();
        togglePreviewView(true);
    });

    backToEditBtn.addEventListener('click', function () {
        togglePreviewView(false);
    });

    firstNameOnlyCheckbox.addEventListener('change', function () {
        if (this.checked) {
            applyFirstNameOnly();
        } else {
            // Re-extract full names from original emails
            bulkData.forEach(row => {
                row.name = extractNameFromEmail(row.email);
            });
        }
        renderTable();
    });

    function applyFirstNameOnly() {
        bulkData.forEach(row => {
            if (row.name) {
                row.name = row.name.split(' ')[0];
            }
        });
    }

    function togglePreviewView(showPreview) {
        isPreviewMode = showPreview;
        if (showPreview) {
            bulkFields.classList.add('hidden'); // Hide textarea
            previewContainer.classList.remove('hidden'); // Show table
            submitBtn.style.display = 'block';
            submitBtn.textContent = 'Send All Emails';
        } else {
            bulkFields.classList.remove('hidden'); // Show textarea
            previewContainer.classList.add('hidden'); // Hide table
            submitBtn.style.display = 'none'; // Hide send button (force preview again)
        }
    }

    function renderTable() {
        previewBody.innerHTML = '';
        bulkData.forEach((row, index) => {
            if (!row.isValid) return; // Skip invalid for now

            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td style="font-size: 11px; color:#555;">${row.email}</td>
                <td><input type="text" class="row-name" data-id="${row.id}" value="${row.name}"></td>
                <td><input type="text" class="row-company" data-id="${row.id}" value="${row.company}"></td>
                <td style="text-align: center;">
                    <input type="checkbox" class="row-link" data-id="${row.id}" ${row.includeLink ? 'checked' : ''}>
                </td>
                <td>
                    <button type="button" class="remove-row-btn" data-id="${row.id}">×</button>
                </td>
            `;

            previewBody.appendChild(tr);
        });

        attachRowListeners();
    }

    function attachRowListeners() {
        // Name Change
        document.querySelectorAll('.row-name').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const row = bulkData.find(d => d.id === id);
                if (row) row.name = e.target.value;
            });
        });

        // Company Change (Smart Update)
        document.querySelectorAll('.row-company').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const newValue = e.target.value;
                const row = bulkData.find(d => d.id === id);

                if (row) {
                    const oldValue = row.company;

                    // Update all matching companies in data
                    bulkData.forEach(d => {
                        if (d.company === oldValue) {
                            d.company = newValue;
                        }
                    });

                    // Update all matching inputs in UI immediately
                    document.querySelectorAll('.row-company').forEach(otherInput => {
                        if (otherInput.value === oldValue) {
                            otherInput.value = newValue;
                        }
                    });
                }
            });
        });

        // Link Toggle
        document.querySelectorAll('.row-link').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const row = bulkData.find(d => d.id === id);
                if (row) row.includeLink = e.target.checked;
            });
        });

        // Delete Row
        document.querySelectorAll('.remove-row-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id);
                bulkData = bulkData.filter(d => d.id !== id);
                renderTable(); // Re-render

                // If all deleted, go back
                if (bulkData.length === 0) {
                    togglePreviewView(false);
                }
            });
        });
    }

    // --- Configuration & Helpers ---

    chrome.storage.local.get(['webhookUrl'], function (result) {
        webhookUrlInput.value = result.webhookUrl || DEFAULT_WEBHOOK;
    });

    configToggle.addEventListener('click', function () {
        configContent.classList.toggle('show');
        toggleIcon.textContent = configContent.classList.contains('show') ? '▲' : '▼';
    });

    saveWebhookBtn.addEventListener('click', function () {
        const url = webhookUrlInput.value.trim();
        if (!url) {
            showMessage('Please enter a webhook URL', 'error');
            return;
        }
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            showMessage('URL must start with http:// or https://', 'error');
            return;
        }
        chrome.storage.local.set({ webhookUrl: url }, function () {
            showMessage('Webhook URL saved!', 'success');
            setTimeout(() => {
                configContent.classList.remove('show');
                toggleIcon.textContent = '▼';
            }, 1000);
        });
    });

    async function sendEmailData(webhookUrl, formData) {
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            return { ok: response.ok, status: response.status };
        } catch (error) {
            console.error('Error:', error);
            return { ok: false, error: error };
        }
    }

    // --- Submission Logic ---

    emailForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        chrome.storage.local.get(['webhookUrl'], async function (result) {
            const webhookUrl = result.webhookUrl || DEFAULT_WEBHOOK;

            if (modeSwitch.checked) {
                // --- BULK SEND FROM TABLE DATA ---
                // --- BULK SEND via Dedicated Window ---
                if (!isPreviewMode || bulkData.length === 0) {
                    return;
                }

                // Get delay settings
                const minDelayInput = document.getElementById('minDelay');
                const maxDelayInput = document.getElementById('maxDelay');
                const delay = {
                    min: parseInt(minDelayInput.value) || 0,
                    max: parseInt(maxDelayInput.value) || 0
                };

                const validRows = bulkData.filter(d => d.isValid);

                if (validRows.length === 0) {
                    showMessage('No valid emails to send.', 'error');
                    return;
                }

                // Prepare Queue
                const queue = validRows.map(row => ({
                    email: row.email,
                    companyName: row.company,
                    personName: row.name,
                    includeLink: row.includeLink ? 'yes' : 'no'
                }));

                // Save Queue & Settings
                chrome.storage.local.set({
                    bulkQueue: queue,
                    delaySettings: delay,
                    webhookUrl: webhookUrl
                }, function () {
                    // Open Dedicated Runner Window
                    chrome.windows.create({
                        url: 'runner.html',
                        type: 'popup',
                        width: 500,
                        height: 600
                    });

                    // Update UI in main popup (or close it)
                    showMessage('🚀 Bulk sender started in new window.', 'success');

                    // Optional: Close main popup to avoid confusion
                    setTimeout(() => window.close(), 1000);
                });

            } else {
                // --- SINGLE SEND MODE ---
                const email = emailInput.value.trim();
                const includeLink = document.getElementById('includeLink').checked ? 'yes' : 'no';

                const formData = {
                    email: email,
                    companyName: companyNameInput.value.trim(),
                    personName: personNameInput.value.trim(),
                    includeLink: includeLink
                };

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(formData.email)) {
                    showMessage('Please enter a valid email address', 'error');
                    return;
                }

                setLoading(true, 'Sending email...');
                const res = await sendEmailData(webhookUrl, formData);
                setLoading(false);

                if (res.ok) {
                    showMessage('✅ Email request sent!', 'success');
                    emailForm.reset();
                } else {
                    showMessage('❌ Failed to send.', 'error');
                }
            }
        });
    });

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = 'message ' + type;
        messageDiv.style.display = 'block';
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }

    function setLoading(isLoading, text = 'Sending email...') {
        submitBtn.disabled = isLoading;
        loading.style.display = isLoading ? 'block' : 'none';
        if (loadingText) loadingText.textContent = text;
        if (isLoading) messageDiv.style.display = 'none';
    }
});
