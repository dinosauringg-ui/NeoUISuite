// ==UserScript==
// @name         NeoUI Standalone: SDB Bulk Sender
// @namespace    https://github.com/dinosauringg-ui/NeoUISuite
// @version      1.0.2
// @description  Standalone "give many items to one person, or one item to many people" tool for the Safety Deposit Box. Adds an anchored button next to the NP/NC selector.
// @author       ext1nct
// @match        https://www.neopets.com/safetydeposit.phtml*
// @match        https://neopets.com/safetydeposit.phtml*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

// ==============================================================================
// NeoUI Standalone — SDB Bulk Sender
// ------------------------------------------------------------------------------
// Extracted from NeoUI: Unified Suite. Adds ONLY the Bulk Sender power tool —
// gift multiple items to one Neofriend, or one-or-more items to a whole list
// of Neofriends, looped over the same give-neofriend.php endpoint the native
// page uses (which only accepts one item -> one recipient per call).
//
// Fully non-invasive: does not touch, hide, or replace the native SDB page.
// Adds a single "⚡ Bulk Sender" button next to the NP/NC toggle that
// opens a self-contained modal, appended straight to <body> — same footprint
// as the modal it opens, so it can never be knocked out by the native page's
// own Vue re-rendering.
// ==============================================================================

(function () {
    'use strict';

    // ── Baseline theme tokens (scoped, additive — never touches page-native CSS) ──
    var THEME_STYLE_ID = 'neoui-standalone-bulksender-theme-vars';
    if (!document.getElementById(THEME_STYLE_ID)) {
        var themeStyle = document.createElement('style');
        themeStyle.id = THEME_STYLE_ID;
        themeStyle.textContent = [
            ':root {',
            '  --nui-font-display: "TP Cafeteria","Museo","Segoe UI Rounded",sans-serif;',
            '  --nui-font-body: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
            '  --nui-radius-sm:8px; --nui-radius-md:14px; --nui-radius-lg:20px; --nui-radius-pill:8px;',
            '  --nui-space-1:4px; --nui-space-2:8px; --nui-space-3:12px; --nui-space-4:16px; --nui-space-5:24px; --nui-space-6:32px;',
            '  --nui-ease:cubic-bezier(.25,1,.5,1); --nui-ease-snap:cubic-bezier(.34,1.56,.64,1);',
            '  --nui-dur-fast:.12s; --nui-dur-base:.22s; --nui-dur-slow:.36s;',
            '  --nui-bg:#F3F5F8; --nui-surface:#FFFFFF; --nui-surface-2:#E9EDF3; --nui-border:#D6DCE5;',
            '  --nui-text:#1F2937; --nui-text-muted:#5B6472; --nui-text-faint:#98A2B3;',
            '  --nui-accent:#2E6BE0; --nui-accent-ink:#FFFFFF; --nui-accent-soft:#DCE7FB;',
            '  --nui-accent-2:#5B6472; --nui-accent-2-soft:#E9EDF3;',
            '  --nui-success:#2FA84B; --nui-success-soft:#DCFCE7;',
            '  --nui-warning:#B98900; --nui-warning-soft:#FBF0CB;',
            '  --nui-danger:#DC3B30; --nui-danger-soft:#FCD2CE;',
            '  --nui-shadow:rgba(31,41,55,.12); --nui-overlay:rgba(31,41,55,.45);',
            '}'
        ].join('\n');
        document.head.appendChild(themeStyle);
    }

    // ── Bulk Sender utility CSS (generic .nui-btn / .nui-input / etc, only used by this tool) ──
    var BULK_SENDER_STYLE_ID = 'neoui-sdb-bulksender-styles';
    if (!document.getElementById(BULK_SENDER_STYLE_ID)) {
        var bulkSenderStyle = document.createElement('style');
        bulkSenderStyle.id = BULK_SENDER_STYLE_ID;
        bulkSenderStyle.textContent = [
            '.nui-reset, .nui-reset * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }',
            '.nui-reset { font-family: var(--nui-font-body); }',
            '.nui-surface { background: var(--nui-surface); }',
            '.nui-drawer-backdrop { position:fixed; inset:0; z-index:100000; background:var(--nui-overlay); opacity:0; pointer-events:none; transition: opacity var(--nui-dur-fast) var(--nui-ease); }',
            '.nui-drawer-backdrop.is-open { opacity:1; pointer-events:auto; }',
            '.nui-btn { font-family:var(--nui-font-body); padding:11px 16px; font-size:14px; font-weight:700; border-radius:var(--nui-radius-sm); border:none; cursor:pointer; transition:transform var(--nui-dur-fast) var(--nui-ease-snap), filter var(--nui-dur-fast) var(--nui-ease), opacity var(--nui-dur-fast) var(--nui-ease); text-align:center; line-height:1.2; }',
            '.nui-btn:active { transform:scale(0.97); }',
            '.nui-btn:disabled { opacity:.55; cursor:default; transform:none; }',
            '.nui-btn-primary { background:var(--nui-accent); color:var(--nui-accent-ink); }',
            '.nui-btn-primary:active { filter:brightness(0.94); }',
            '.nui-btn-secondary { background:var(--nui-surface-2); color:var(--nui-text); border:1px solid var(--nui-border); }',
            '.nui-btn-block { width:100%; display:block; }',
            '.nui-btn-sm { padding:9px 14px; font-size:13px; }',
            '.nui-input, .nui-select, .nui-textarea { width:100%; padding:10px 12px; border-radius:var(--nui-radius-sm); border:1px solid var(--nui-border); background:var(--nui-surface-2); color:var(--nui-text); font-family:var(--nui-font-body); font-size:13px; outline:none; box-sizing:border-box; transition:all .15s; }',
            '.nui-input:focus, .nui-select:focus, .nui-textarea:focus { border-color:var(--nui-accent); background:var(--nui-surface); }',
            // Anchored launcher button - adjusted to sit nicely in the flex wrapper
            '.neoui-bulksender-fab { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:var(--nui-radius-sm); border:none; cursor:pointer; background:var(--nui-accent); color:var(--nui-accent-ink); font-family:var(--nui-font-display); font-size:14px; font-weight:800; box-shadow:0 2px 6px var(--nui-shadow); transition:transform var(--nui-dur-fast) var(--nui-ease-snap), filter var(--nui-dur-fast) var(--nui-ease); text-transform:uppercase; letter-spacing:0.5px; }',
        ].join('\n');
        document.head.appendChild(bulkSenderStyle);
    }

    // ---- SDB Bulk Sender (power tool) ----
    var _sdbBulkCache = null;
    function sdbBulkFetchBootstrap(force) {
        if (_sdbBulkCache && !force) return Promise.resolve(_sdbBulkCache);
        return fetch('/safetydeposit.phtml', { credentials: 'same-origin' })
            .then(function (r) { return r.text(); })
            .then(function (html) {
                var m = html.match(/window\.__sdbData\s*=\s*(\{[\s\S]*?\});/);
                if (!m) throw new Error('bootstrap not found');
                var data = JSON.parse(m[1]);
                _sdbBulkCache = data;
                return data;
            });
    }

    function sdbBulkEsc(s) {
        var d = document.createElement('div');
        d.textContent = String(s == null ? '' : s);
        return d.innerHTML;
    }
    function sdbBulkImgUrl(item) {
        return 'https://images.neopets.com/items/' + item.obj_filename + '.gif';
    }

    function openSDBBulkSender() {
        const backdrop = document.createElement('div');
        backdrop.className = 'nui-drawer-backdrop nui-reset is-open';
        backdrop.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--nui-overlay);display:flex;align-items:center;justify-content:center;padding:var(--nui-space-4);';

        const modal = document.createElement('div');
        modal.className = 'nui-surface';
        modal.style.cssText = 'width:100%;max-width:640px;height:min(88vh,720px);border-radius:var(--nui-radius-lg);border:1px solid var(--nui-border);box-shadow:0 10px 40px rgba(0,0,0,0.5);display:flex;flex-direction:column;overflow:hidden;transform:scale(0.95);opacity:0;transition:all var(--nui-dur-fast) var(--nui-ease-snap);';

        function closeModal() {
            modal.style.transform = 'scale(0.95)'; modal.style.opacity = '0';
            backdrop.style.opacity = '0';
            setTimeout(function () { backdrop.remove(); }, 200);
        }
        backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeModal(); });
        document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); } });

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;gap:var(--nui-space-3);padding:var(--nui-space-3) var(--nui-space-4);border-bottom:1px solid var(--nui-border);flex-shrink:0;';
        header.innerHTML =
            '<span style="font-family:var(--nui-font-display);font-size:16px;font-weight:800;color:var(--nui-accent);flex:1;">⚡ SDB Bulk Sender</span>' +
            '<button id="nui-sdbbulk-close" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--nui-text-muted);line-height:1;padding:0;">×</button>';
        header.querySelector('#nui-sdbbulk-close').addEventListener('click', closeModal);

        const content = document.createElement('div');
        content.style.cssText = 'flex:1;overflow-y:auto;padding:var(--nui-space-4);font-size:13px;';
        content.innerHTML = '<div style="padding:60px 0;text-align:center;color:var(--nui-text-muted);">Loading…</div>';

        modal.appendChild(header);
        modal.appendChild(content);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        requestAnimationFrame(function () { modal.style.transform = 'scale(1)'; modal.style.opacity = '1'; });

        sdbBulkFetchBootstrap().then(function (boot) {
            if (!boot.isVerified) {
                content.innerHTML =
                    '<div style="padding:40px 20px;text-align:center;color:var(--nui-text-muted);">' +
                        '<div style="font-size:32px;margin-bottom:10px;">🔒</div>' +
                        '<div style="font-weight:700;color:var(--nui-text);margin-bottom:6px;">Verified account required</div>' +
                        '<div>Giving items to other players requires a verified Neopets account.</div>' +
                    '</div>';
                return;
            }
            renderModeSelect(boot);
        }).catch(function () {
            content.innerHTML = '<div style="padding:40px 0;text-align:center;color:var(--nui-danger);">Could not load your account info. Try again in a moment.</div>';
        });

        function renderModeSelect(boot) {
            content.innerHTML = '';

            const intro = document.createElement('div');
            intro.style.cssText = 'font-size:12px;color:var(--nui-text-muted);margin-bottom:14px;line-height:1.5;';
            intro.textContent = "Send multiple items in one go — either several items to one person, or one item to a whole list of people. Each send still goes through Neopets' own gifting rules (tradeable, non-NC items only), just looped for you.";
            content.appendChild(intro);

            const tabRow = document.createElement('div');
            tabRow.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;';
            const tabA = document.createElement('button');
            tabA.type = 'button';
            tabA.className = 'nui-btn nui-btn-primary';
            tabA.style.cssText = 'flex:1;';
            tabA.textContent = 'Many Items → 1 Person';
            const tabB = document.createElement('button');
            tabB.type = 'button';
            tabB.className = 'nui-btn nui-btn-secondary';
            tabB.style.cssText = 'flex:1;';
            tabB.textContent = 'Items → Many People';
            tabRow.appendChild(tabA);
            tabRow.appendChild(tabB);
            content.appendChild(tabRow);

            const body = document.createElement('div');
            content.appendChild(body);

            function setMode(mode) {
                tabA.className = 'nui-btn ' + (mode === 'A' ? 'nui-btn-primary' : 'nui-btn-secondary');
                tabB.className = 'nui-btn ' + (mode === 'B' ? 'nui-btn-primary' : 'nui-btn-secondary');
                tabA.style.cssText = 'flex:1;'; tabB.style.cssText = 'flex:1;';
                if (mode === 'A') renderManyToOne(body, boot); else renderOneToMany(body, boot);
            }
            tabA.addEventListener('click', function () { setMode('A'); });
            tabB.addEventListener('click', function () { setMode('B'); });
            setMode('A');
        }

        // ── Shared: item search + eligible-item list rendering ─────────────
        function buildItemSearch(container, boot, opts) {
            var searchWrap = document.createElement('div');
            searchWrap.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
            searchWrap.innerHTML =
                '<input type="text" class="nui-input" placeholder="Search items in your SDB…" style="flex:1;padding:7px 10px;font-size:13px;">' +
                '<button type="button" class="nui-btn nui-btn-secondary nui-btn-sm">Search</button>';
            var searchInput = searchWrap.querySelector('input');
            var searchBtn = searchWrap.querySelector('button');
            container.appendChild(searchWrap);

            var resultsBox = document.createElement('div');
            resultsBox.style.cssText = 'max-height:220px;overflow-y:auto;border:1px solid var(--nui-border);border-radius:var(--nui-radius-sm);padding:4px;margin-bottom:12px;';
            resultsBox.innerHTML = '<div style="padding:16px;text-align:center;color:var(--nui-text-faint);font-size:12px;">Search for an item above to get started.</div>';
            container.appendChild(resultsBox);

            function runSearch() {
                var q = searchInput.value.trim();
                resultsBox.innerHTML = '<div style="padding:16px;text-align:center;color:var(--nui-text-muted);font-size:12px;">Searching…</div>';
                fetch('/np-templates/ajax/safetydeposit/get-items.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
                    body: JSON.stringify({ page: 1, per_page: 30, search: q, category: '', sort: '', view_filter: 'np', _ref_ck: boot.refCk }),
                }).then(function (r) { return r.json(); }).then(function (data) {
                    if (!data.success) { resultsBox.innerHTML = '<div style="padding:16px;text-align:center;color:var(--nui-danger);font-size:12px;">Could not search items.</div>'; return; }
                    var items = data.data.items || [];
                    if (!items.length) { resultsBox.innerHTML = '<div style="padding:16px;text-align:center;color:var(--nui-text-faint);font-size:12px;">No items found.</div>'; return; }
                    resultsBox.innerHTML = '';
                    items.forEach(function (item) {
                        var ineligible = !!item.is_notrade || !!item.is_nc;
                        var row = document.createElement('div');
                        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 4px;border-radius:var(--nui-radius-sm);' + (ineligible ? 'opacity:0.45;' : 'cursor:pointer;');
                        row.innerHTML =
                            '<img src="' + sdbBulkImgUrl(item) + '" style="width:28px;height:28px;object-fit:contain;flex-shrink:0;" onerror="this.style.visibility=\'hidden\'">' +
                            '<div style="flex:1;min-width:0;">' +
                                '<div style="font-size:12px;font-weight:700;color:var(--nui-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + sdbBulkEsc(item.obj_name) + '</div>' +
                                '<div style="font-size:10px;color:var(--nui-text-faint);">Qty: ' + item.amount + (ineligible ? ' · ' + (item.is_nc ? 'NC item — not giftable' : 'Not tradeable') : '') + '</div>' +
                            '</div>';
                        if (!ineligible) {
                            row.addEventListener('mouseover', function () { row.style.background = 'var(--nui-surface-2)'; });
                            row.addEventListener('mouseout', function () { row.style.background = 'transparent'; });
                            row.addEventListener('click', function () { opts.onPick(item, row); });
                        }
                        resultsBox.appendChild(row);
                    });
                }).catch(function () {
                    resultsBox.innerHTML = '<div style="padding:16px;text-align:center;color:var(--nui-danger);font-size:12px;">Network error.</div>';
                });
            }
            searchBtn.addEventListener('click', runSearch);
            searchInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') runSearch(); });
        }

        function buildRecipientInput(labelText, boot) {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'margin-bottom:12px;';
            var listId = 'nui-sdbbulk-nf-' + Math.random().toString(36).slice(2, 8);
            wrap.innerHTML =
                '<div style="font-size:11px;font-weight:700;color:var(--nui-text-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">' + labelText + '</div>' +
                '<input type="text" list="' + listId + '" class="nui-input" placeholder="Username" style="width:100%;padding:7px 10px;font-size:13px;">' +
                '<datalist id="' + listId + '">' + (boot.neofriends || []).map(function (n) { return '<option value="' + sdbBulkEsc(n) + '">'; }).join('') + '</datalist>';
            return wrap;
        }

        function runBatch(container, boot, jobs, onDone) {
            container.innerHTML = '';
            var pinWrap = null, pinInput = null;
            if (boot.pinRequired) {
                pinWrap = document.createElement('div');
                pinWrap.style.cssText = 'margin-bottom:12px;';
                pinWrap.innerHTML =
                    '<div style="font-size:11px;font-weight:700;color:var(--nui-text-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Safety Deposit Box PIN</div>' +
                    '<input type="password" maxlength="4" class="nui-input" style="width:120px;padding:7px 10px;font-size:13px;text-align:center;">';
                pinInput = pinWrap.querySelector('input');
                container.appendChild(pinWrap);
            }

            var list = document.createElement('div');
            list.style.cssText = 'display:flex;flex-direction:column;gap:4px;max-height:280px;overflow-y:auto;margin-bottom:12px;';
            jobs.forEach(function (job, i) {
                var row = document.createElement('div');
                row.id = 'nui-sdbbulk-job-' + i;
                row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border:1px solid var(--nui-border);border-radius:var(--nui-radius-sm);font-size:12px;';
                row.innerHTML = '<span>' + sdbBulkEsc(job.label) + '</span><span data-status style="color:var(--nui-text-faint);font-weight:700;">Waiting</span>';
                list.appendChild(row);
            });
            container.appendChild(list);

            var startBtn = document.createElement('button');
            startBtn.type = 'button';
            startBtn.className = 'nui-btn nui-btn-primary nui-btn-block';
            startBtn.textContent = 'Confirm & Send (' + jobs.length + ')';
            container.appendChild(startBtn);

            startBtn.addEventListener('click', function () {
                if (boot.pinRequired && !pinInput.value.trim()) { pinInput.style.borderColor = 'var(--nui-danger)'; return; }
                startBtn.disabled = true;
                startBtn.textContent = 'Sending…';
                var pin = pinInput ? pinInput.value.trim() : '';
                var i = 0, okCount = 0, failCount = 0;
                function next() {
                    if (i >= jobs.length) {
                        startBtn.textContent = 'Done — ' + okCount + ' sent' + (failCount ? ', ' + failCount + ' failed' : '');
                        if (onDone) onDone(okCount, failCount);
                        return;
                    }
                    var job = jobs[i];
                    var statusEl = document.getElementById('nui-sdbbulk-job-' + i).querySelector('[data-status]');
                    statusEl.textContent = 'Sending…';
                    statusEl.style.color = 'var(--nui-warning)';
                    job.send(pin).then(function (res) {
                        if (res.ok) {
                            okCount++;
                            statusEl.textContent = '✓ Sent';
                            statusEl.style.color = 'var(--nui-success)';
                        } else {
                            failCount++;
                            statusEl.textContent = '✗ ' + (res.message || 'Failed');
                            statusEl.style.color = 'var(--nui-danger)';
                        }
                        i++;
                        setTimeout(next, 700);
                    });
                }
                next();
            });
        }

        function sdbBulkGive(boot, objInfoId, recipient, pin) {
            return fetch('/np-templates/ajax/safetydeposit/give-neofriend.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
                body: JSON.stringify({ obj_info_id: objInfoId, quantity: 1, recipient: recipient, pin: pin || '', _ref_ck: boot.refCk }),
            }).then(function (r) { return r.json(); }).then(function (data) {
                return { ok: !!data.success, message: data.message || data.error };
            }).catch(function () {
                return { ok: false, message: 'Network error' };
            });
        }

        function buildQtyJobs(labelBase, objInfoId, qty, recipient, boot) {
            var jobs = [];
            var n = Math.max(1, qty | 0);
            for (var i = 0; i < n; i++) {
                jobs.push({
                    label: n > 1 ? (labelBase + ' (' + (i + 1) + '/' + n + ')') : labelBase,
                    send: function (pin) { return sdbBulkGive(boot, objInfoId, recipient, pin); },
                });
            }
            return jobs;
        }

        function renderManyToOne(container, boot) {
            container.innerHTML = '';
            var cart = []; // [{item, qty}]

            var searchSection = document.createElement('div');
            container.appendChild(searchSection);

            var cartLabel = document.createElement('div');
            cartLabel.style.cssText = 'font-size:11px;font-weight:700;color:var(--nui-text-muted);text-transform:uppercase;letter-spacing:.04em;margin:4px 0;';
            cartLabel.textContent = 'Selected items (0)';
            container.appendChild(cartLabel);

            var cartBox = document.createElement('div');
            cartBox.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:12px;';
            cartBox.innerHTML = '<div style="font-size:12px;color:var(--nui-text-faint);">Nothing selected yet — search above and click an item to add it.</div>';
            container.appendChild(cartBox);

            var recipientWrap = buildRecipientInput('Send everything to', boot);
            container.appendChild(recipientWrap);
            var recipientInput = recipientWrap.querySelector('input');

            var reviewBtn = document.createElement('button');
            reviewBtn.type = 'button';
            reviewBtn.className = 'nui-btn nui-btn-primary nui-btn-block';
            reviewBtn.textContent = 'Review & Send';
            container.appendChild(reviewBtn);

            var batchArea = document.createElement('div');
            batchArea.style.marginTop = '12px';
            container.appendChild(batchArea);

            function renderCart() {
                cartLabel.textContent = 'Selected items (' + cart.length + ')';
                if (!cart.length) {
                    cartBox.innerHTML = '<div style="font-size:12px;color:var(--nui-text-faint);">Nothing selected yet — search above and click an item to add it.</div>';
                    return;
                }
                cartBox.innerHTML = '';
                cart.forEach(function (entry, idx) {
                    var row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid var(--nui-border);border-radius:var(--nui-radius-sm);';
                    row.innerHTML =
                        '<span style="flex:1;font-size:12px;font-weight:700;color:var(--nui-text);">' + sdbBulkEsc(entry.item.obj_name) + '</span>' +
                        '<input type="number" min="1" max="' + entry.item.amount + '" value="' + entry.qty + '" class="nui-input" style="width:56px;padding:3px;font-size:11px;text-align:center;">' +
                        '<button type="button" class="nui-btn nui-btn-secondary" style="padding:2px 8px;font-size:11px;">✕</button>';
                    row.querySelector('input').addEventListener('change', function () {
                        var v = parseInt(this.value, 10) || 1;
                        entry.qty = Math.max(1, Math.min(v, entry.item.amount));
                        this.value = entry.qty;
                    });
                    row.querySelector('button').addEventListener('click', function () { cart.splice(idx, 1); renderCart(); });
                    cartBox.appendChild(row);
                });
            }

            buildItemSearch(searchSection, boot, {
                onPick: function (item) {
                    if (cart.some(function (e) { return e.item.obj_info_id === item.obj_info_id; })) return;
                    cart.push({ item: item, qty: 1 });
                    renderCart();
                }
            });

            reviewBtn.addEventListener('click', function () {
                var recipient = recipientInput.value.trim();
                if (!cart.length) { alert('Select at least one item first.'); return; }
                if (!recipient) { alert('Enter a recipient username first.'); return; }
                var totalSends = cart.reduce(function (sum, e) { return sum + Math.max(1, e.qty | 0); }, 0);
                if (totalSends > 30 && !confirm('You\'re about to send ' + totalSends + ' separate gifts to ' + recipient + ' (' + cart.length + ' item type' + (cart.length === 1 ? '' : 's') + '). This will take a while and can\'t be undone once each send goes through — continue?')) return;
                var jobs = [];
                cart.forEach(function (entry) {
                    jobs = jobs.concat(buildQtyJobs(entry.item.obj_name + ' → ' + recipient, entry.item.obj_info_id, entry.qty, recipient, boot));
                });
                runBatch(batchArea, boot, jobs);
            });
        }

        function renderOneToMany(container, boot) {
            container.innerHTML = '';
            var cart = []; // [{item, qty}]

            var searchSection = document.createElement('div');
            container.appendChild(searchSection);

            var selectedLabel = document.createElement('div');
            selectedLabel.style.cssText = 'font-size:11px;font-weight:700;color:var(--nui-text-muted);text-transform:uppercase;letter-spacing:.04em;margin:4px 0;';
            selectedLabel.textContent = 'Items to send (0)';
            container.appendChild(selectedLabel);

            var selectedBox = document.createElement('div');
            selectedBox.style.cssText = 'display:flex;flex-direction:column;gap:4px;margin-bottom:12px;';
            selectedBox.innerHTML = '<div style="font-size:12px;color:var(--nui-text-faint);">Search above and click an item to add it — you can add more than one.</div>';
            container.appendChild(selectedBox);

            function renderSelected() {
                selectedLabel.textContent = 'Items to send (' + cart.length + ')';
                if (!cart.length) {
                    selectedBox.innerHTML = '<div style="font-size:12px;color:var(--nui-text-faint);">Search above and click an item to add it — you can add more than one.</div>';
                    return;
                }
                selectedBox.innerHTML = '';
                cart.forEach(function (entry, idx) {
                    var row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 8px;border:1px solid var(--nui-border);border-radius:var(--nui-radius-sm);';
                    row.innerHTML =
                        '<img src="' + sdbBulkImgUrl(entry.item) + '" style="width:24px;height:24px;object-fit:contain;flex-shrink:0;" onerror="this.style.visibility=\'hidden\'">' +
                        '<span style="flex:1;font-size:12px;font-weight:700;color:var(--nui-text);">' + sdbBulkEsc(entry.item.obj_name) + '</span>' +
                        '<span style="font-size:11px;color:var(--nui-text-faint);">Have: ' + entry.item.amount + '</span>' +
                        '<span style="font-size:11px;color:var(--nui-text-muted);white-space:nowrap;">Qty/person:</span>' +
                        '<input type="number" min="1" max="' + entry.item.amount + '" value="' + entry.qty + '" class="nui-input" style="width:56px;padding:3px;font-size:11px;text-align:center;">' +
                        '<button type="button" class="nui-btn nui-btn-secondary" style="padding:2px 8px;font-size:11px;">✕</button>';
                    row.querySelector('input').addEventListener('change', function () {
                        var v = parseInt(this.value, 10) || 1;
                        entry.qty = Math.max(1, Math.min(v, entry.item.amount));
                        this.value = entry.qty;
                    });
                    row.querySelector('button').addEventListener('click', function () { cart.splice(idx, 1); renderSelected(); });
                    selectedBox.appendChild(row);
                });
            }

            var recipientsWrap = document.createElement('div');
            recipientsWrap.style.cssText = 'margin-bottom:12px;';
            recipientsWrap.innerHTML =
                '<div style="font-size:11px;font-weight:700;color:var(--nui-text-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">Recipients (one per line)</div>' +
                '<textarea class="nui-input" rows="5" placeholder="username_one&#10;username_two&#10;username_three" style="width:100%;padding:8px;font-size:12px;resize:vertical;"></textarea>';
            container.appendChild(recipientsWrap);
            var recipientsArea = recipientsWrap.querySelector('textarea');

            var validationMsg = document.createElement('div');
            validationMsg.style.cssText = 'font-size:11px;color:var(--nui-danger);margin-bottom:8px;display:none;';
            container.appendChild(validationMsg);

            var reviewBtn = document.createElement('button');
            reviewBtn.type = 'button';
            reviewBtn.className = 'nui-btn nui-btn-primary nui-btn-block';
            reviewBtn.textContent = 'Review & Send';
            container.appendChild(reviewBtn);

            var batchArea = document.createElement('div');
            batchArea.style.marginTop = '12px';
            container.appendChild(batchArea);

            buildItemSearch(searchSection, boot, {
                onPick: function (item) {
                    if (cart.some(function (e) { return e.item.obj_info_id === item.obj_info_id; })) return;
                    cart.push({ item: item, qty: 1 });
                    renderSelected();
                }
            });

            reviewBtn.addEventListener('click', function () {
                if (!cart.length) { alert('Pick at least one item to send first.'); return; }
                var recipients = recipientsArea.value.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
                recipients = recipients.filter(function (r, idx) { return recipients.indexOf(r) === idx; }); // dedupe
                if (!recipients.length) { alert('Enter at least one recipient.'); return; }

                var shortfalls = cart.filter(function (entry) {
                    return (entry.qty * recipients.length) > entry.item.amount;
                });
                if (shortfalls.length) {
                    validationMsg.style.display = 'block';
                    validationMsg.textContent = shortfalls.map(function (entry) {
                        var needed = entry.qty * recipients.length;
                        return entry.item.obj_name + ': only have ' + entry.item.amount + ', need ' + needed + ' for ' + recipients.length + ' people at ' + entry.qty + ' each';
                    }).join('; ') + '.';
                    return;
                }
                validationMsg.style.display = 'none';

                var totalSends = cart.reduce(function (sum, e) { return sum + e.qty; }, 0) * recipients.length;
                if (totalSends > 30 && !confirm('You\'re about to send ' + totalSends + ' separate gifts total (' + cart.length + ' item type' + (cart.length === 1 ? '' : 's') + ' to ' + recipients.length + ' people). This will take a while and can\'t be undone once each send goes through — continue?')) return;

                var jobs = [];
                recipients.forEach(function (r) {
                    cart.forEach(function (entry) {
                        jobs = jobs.concat(buildQtyJobs(entry.item.obj_name + ' → ' + r, entry.item.obj_info_id, entry.qty, r, boot));
                    });
                });
                runBatch(batchArea, boot, jobs);
            });
        }
    }

    // ── Anchored launcher button ────────────────────────────────────────────
    function addLauncherButton() {
        if (document.getElementById('neoui-bulksender-fab')) return; 
        
        var fab = document.createElement('button');
        fab.id = 'neoui-bulksender-fab';
        fab.type = 'button';
        fab.className = 'neoui-bulksender-fab nui-reset';
        fab.title = 'Send several items or gift to several people at once';
        fab.innerHTML = '<span style="font-size:14px;">⚡</span><span>Bulk Sender</span>';
        fab.addEventListener('click', function () { openSDBBulkSender(); });

        var npToggle = document.querySelector('.nptoggle');
        
        if (npToggle) {
            // Create a wrapper to hold both the toggle pill and our button side-by-side
            var wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'center';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '16px'; // Space between toggle and button
            
            // Inherit the toggle's margins so the page structure stays perfectly intact
            var computedMargins = window.getComputedStyle(npToggle);
            wrapper.style.marginBottom = computedMargins.marginBottom;
            wrapper.style.marginTop = computedMargins.marginTop;
            
            // Remove the auto-centering margins from the toggle itself so it obeys the flex wrapper
            npToggle.style.margin = '0'; 
            
            // Insert wrapper, then move the toggle into it alongside the new button
            npToggle.parentNode.insertBefore(wrapper, npToggle);
            wrapper.appendChild(npToggle);
            wrapper.appendChild(fab);
        } else {
            // Fallback just in case the layout changes
            fab.style.position = 'fixed';
            fab.style.top = '10px';
            fab.style.right = '10px';
            fab.style.zIndex = '99998';
            document.body.appendChild(fab);
        }
    }

    if (document.body) {
        addLauncherButton();
    } else {
        document.addEventListener('DOMContentLoaded', addLauncherButton);
    }
})();
