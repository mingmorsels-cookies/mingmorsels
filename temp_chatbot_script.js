        function buildOffscreenCard(key) {
            const c = COOKIES[key];
            const stars = '★'.repeat(c.stars) + '☆'.repeat(5 - c.stars);
            const nutRows = Object.entries(c.nutrition).map(([k, v]) =>
                `<div style="background:#F5ECD7;border-radius:8px;padding:8px 6px;text-align:center;flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:#3D2000;font-family:Georgia,serif">${v}</div>
            <div style="font-size:10px;color:#8B6840;margin-top:2px">${k}</div>
        </div>`
            ).join('');
            const tags = c.tags.map(t =>
                `<span style="display:inline-block;background:#E8F5E1;color:#2E6B1A;font-size:10px;padding:3px 9px;border-radius:20px;margin:3px 2px;border:1px solid #BDE0A8;font-weight:600">${t}</span>`
            ).join('');
            const imgSection = c.img
                ? `<img src="${c.img}" crossOrigin="anonymous" style="width:100%;height:160px;object-fit:cover;display:block" onerror="this.style.display='none'">`
                : `<div style="width:100%;height:160px;background:${c.color};display:flex;align-items:center;justify-content:center;font-size:64px">${c.emoji}</div>`;

            return `
    <div style="width:400px;background:#FDF8F2;font-family:'DM Sans',Arial,sans-serif;border-radius:20px;overflow:hidden;border:1px solid #E8D5B0;box-shadow:0 8px 40px rgba(0,0,0,0.12)">
        ${imgSection}
        <div style="padding:18px 18px 14px">
            <div style="color:#C8960C;font-size:15px;margin-bottom:4px">${stars} (5.0)</div>
            <div style="font-family:Georgia,serif;font-size:20px;color:#3D2000;margin-bottom:8px">${c.emoji} ${c.name}</div>
            <div style="font-size:12px;color:#8B6840;line-height:1.6;margin-bottom:14px">${c.review}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">${nutRows}</div>
            <div style="margin-bottom:14px">${tags}</div>
            <div style="border-top:1px solid #E8D5B0;padding-top:12px;display:flex;align-items:center;justify-content:space-between">
                <div style="font-family:Georgia,serif;font-size:13px;color:#6B3A0F;font-style:italic">mingmorsels · Natural · Handcrafted</div>
                <div style="font-size:11px;color:#8B6840">wa.me/918884102020</div>
            </div>
        </div>
    </div>`;
        }

        function showToast(msg, duration) {
            const t = document.getElementById('mmToast');
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(() => t.classList.remove('show'), duration || 2500);
        }

        async function downloadCookieCard(key, cardUid) {
            const c = COOKIES[key];
            const zone = document.getElementById('cardRenderZone');
            zone.innerHTML = buildOffscreenCard(key);
            const el = zone.firstElementChild;
            showToast('⏳ Preparing image…', 4000);
            try {
                await new Promise(r => setTimeout(r, 300));
                const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#FDF8F2', logging: false });
                zone.innerHTML = '';
                const link = document.createElement('a');
                link.download = c.name.replace(/ /g, '_') + '_mingmorsels.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
                showToast('✅ Card downloaded!');
            } catch (err) {
                zone.innerHTML = '';
                showToast('⚠️ Download failed. Try again.');
                console.error(err);
            }
        }

        async function shareCookieCard(key, cardUid) {
            const c = COOKIES[key];
            const shareBtn = document.getElementById('sharebtn-' + cardUid);
            if (navigator.canShare) {
                const zone = document.getElementById('cardRenderZone');
                zone.innerHTML = buildOffscreenCard(key);
                const el = zone.firstElementChild;
                showToast('⏳ Preparing…', 3000);
                try {
                    await new Promise(r => setTimeout(r, 300));
                    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#FDF8F2', logging: false });
                    zone.innerHTML = '';
                    canvas.toBlob(async (blob) => {
                        const file = new File([blob], c.name.replace(/ /g, '_') + '_mingmorsels.png', { type: 'image/png' });
                        if (navigator.canShare({ files: [file] })) {
                            try {
                                await navigator.share({ title: c.name + ' — mingmorsels', text: c.name + ': ' + c.review.substring(0, 80) + '… Order: wa.me/918884102020', files: [file] });
                                showToast('✅ Shared!');
                            } catch (e) { fallbackCopy(key, cardUid, shareBtn); }
                        } else { fallbackCopy(key, cardUid, shareBtn); }
                    }, 'image/png');
                    return;
                } catch (err) { zone.innerHTML = ''; }
            }
            fallbackCopy(key, cardUid, shareBtn);
        }

        function fallbackCopy(key, cardUid, shareBtn) {
            const c = COOKIES[key];
            const text = c.name + ' by mingmorsels 🍪\n' + c.review.substring(0, 100) + '…\nOrder: https://wa.me/918884102020';
            navigator.clipboard.writeText(text).then(() => {
                if (shareBtn) { shareBtn.textContent = '✓ Copied!'; shareBtn.classList.add('copied'); setTimeout(() => { shareBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share'; shareBtn.classList.remove('copied'); }, 2500); }
                showToast('📋 Link copied to clipboard!');
            }).catch(() => showToast('⚠️ Copy not supported on this device'));
        }

    </script>
    <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap"
        rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
        }

        :root,
        [data-theme="light"] {
            --cream: #FDF8F2;
            --warm: #F5ECD7;
            --gold: #C8960C;
            --gold2: #E8B84B;
            --brown: #3D2000;
            --brown2: #6B3A0F;
            --text: #2C1A00;
            --muted: #8B6840;
            --border: #E8D5B0;
            --accent: #A0522D;
            --chat-bg: #FFFCF7;
            --bubble-user: #3D2000;
            --bubble-bot: #FFF8EE;
            --hero-grad: linear-gradient(135deg, #2C1400 0%, #5C2E00 40%, #3D2000 100%);
            --strip-bg: #F5ECD7;
            --chip-bg: white;
            --chip-color: #6B3A0F;
            --mood-bg: linear-gradient(90deg, #FFF3D6, #FFEAB8, #FFF3D6);
            --mood-btn-bg: white;
            --mood-btn-color: #6B3A0F;
            --input-bg: white;
            --input-field: #FDF8F2;
            --footer-bg: #F5ECD7;
            --toggle-bg: rgba(255, 255, 255, 0.12);
            --toggle-icon: #FFF8EE;
        }

        [data-theme="dark"] {
            --cream: #1A1008;
            --warm: #231408;
            --gold: #E8B84B;
            --gold2: #F5CC6A;
            --brown: #E8C87A;
            --brown2: #D4A85A;
            --text: #F5ECD7;
            --muted: #A88B5E;
            --border: #3D2800;
            --accent: #D4884D;
            --chat-bg: #140D03;
            --bubble-user: #4A2E08;
            --bubble-bot: #231A08;
            --hero-grad: linear-gradient(135deg, #0D0700 0%, #2A1400 40%, #1A0C00 100%);
            --strip-bg: #1E1005;
            --chip-bg: #2A1A05;
            --chip-color: #D4A85A;
            --mood-bg: linear-gradient(90deg, #1E1408, #261A08, #1E1408);
            --mood-btn-bg: #2A1A05;
            --mood-btn-color: #D4A85A;
            --input-bg: #1A1008;
            --input-field: #231408;
            --footer-bg: #1A1008;
            --toggle-bg: rgba(0, 0, 0, 0.3);
            --toggle-icon: #E8C87A;
        }

        body.custom-cursor {
            cursor: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2232%22%20height%3D%2232%22%20viewBox%3D%220%200%2032%2032%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22dough%22%20cx%3D%2235%25%22%20cy%3D%2235%25%22%20r%3D%2265%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23FDF3D8%22/%3E%3Cstop%20offset%3D%2240%25%22%20stop-color%3D%22%23EAC085%22/%3E%3Cstop%20offset%3D%2285%25%22%20stop-color%3D%22%23C68F4E%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23965F25%22/%3E%3C/radialGradient%3E%3C/defs%3E%3Cpath%20d%3D%22M16%2C3.5%20C19.5%2C3.3%2022.8%2C4.8%2025.2%2C7.2%20C27.8%2C9.8%2029.4%2C13.5%2029.5%2C17.2%20C29.6%2C21.0%2027.8%2C24.8%2025.0%2C27.2%20C22.4%2C29.5%2018.8%2C30.5%2015.2%2C30.3%20C11.5%2C30.1%207.8%2C28.3%205.5%2C25.5%20C3.2%2C22.7%202.3%2C18.8%202.6%2C15.2%20C2.9%2C11.2%204.9%2C7.5%208.0%2C5.2%20C10.4%2C3.5%2013.2%2C3.6%2016%2C3.5%20Z%22%20fill%3D%22%233D2000%22%20opacity%3D%220.2%22/%3E%3Cpath%20d%3D%22M16%2C2.5%20C19.5%2C2.3%2022.8%2C3.8%2025.2%2C6.2%20C27.8%2C8.8%2029.4%2C12.5%2029.5%2C16.2%20C29.6%2C20.0%2027.8%2C23.8%2025.0%2C26.2%20C22.4%2C28.5%2018.8%2C29.5%2015.2%2C29.3%20C11.5%2C29.1%207.8%2C27.3%205.5%2C24.5%20C3.2%2C21.7%202.3%2C17.8%202.6%2C14.2%20C2.9%2C10.2%204.9%2C6.5%208.0%2C4.2%20C10.4%2C2.5%2013.2%2C2.6%2016%2C2.5%20Z%22%20fill%3D%22url%28%23dough%29%22/%3E%3Cpath%20d%3D%22M9%2011%20Q12%2010%2014%2013%20M18%208%20Q20%2010%2019%2012%20M13%2022%20Q16%2020%2018%2023%20M8%2018%20Q11%2019%2010%2021%22%20stroke%3D%22%2380501F%22%20stroke-width%3D%220.75%22%20fill%3D%22none%22%20opacity%3D%220.45%22%20stroke-linecap%3D%22round%22/%3E%3Cpath%20d%3D%22M9%2C7%20Q11%2C5.5%2012.5%2C7.5%20Q13%2C9.5%2010.5%2C10%20Q8.5%2C10%209%2C7%20Z%22%20fill%3D%22%232B1401%22/%3E%3Ccircle%20cx%3D%229.8%22%20cy%3D%227.2%22%20r%3D%220.4%22%20fill%3D%22%23FFE5B4%22%20opacity%3D%220.6%22/%3E%3Cpath%20d%3D%22M19%2C13%20Q21%2C11%2022.5%2C13%20Q23%2C15.5%2020.5%2C16%20Q18%2C16%2019%2C13%20Z%22%20fill%3D%22%232B1401%22/%3E%3Ccircle%20cx%3D%2219.8%22%20cy%3D%2213.5%22%20r%3D%220.4%22%20fill%3D%22%23FFE5B4%22%20opacity%3D%220.6%22/%3E%3Cpath%20d%3D%22M11%2C18%20Q13.5%2C17%2014%2C19%20Q14%2C21.5%2012%2C21.5%20Q9.5%2C21.5%2011%2C18%20Z%22%20fill%3D%22%232B1401%22/%3E%3Ccircle%20cx%3D%2211.8%22%20cy%3D%2218.2%22%20r%3D%220.4%22%20fill%3D%22%23FFE5B4%22%20opacity%3D%220.6%22/%3E%3Cpath%20d%3D%22M6%2C13%20Q7.5%2C12%208.5%2C14%20Q8%2C15.5%206.5%2C15.5%20Q5%2C15.5%206%2C13%20Z%22%20fill%3D%22%232B1401%22/%3E%3Cpath%20d%3D%22M21%2C20%20Q22.5%2C18.5%2024%2C20%20Q24%2C22%2022%2C22.5%20Q20%2C22.5%2021%2C20%20Z%22%20fill%3D%22%232B1401%22/%3E%3Ccircle%20cx%3D%2221.8%22%20cy%3D%2219.8%22%20r%3D%220.4%22%20fill%3D%22%23FFE5B4%22%20opacity%3D%220.6%22/%3E%3Cpath%20d%3D%22M19%2C5%20Q20.5%2C4.5%2021.5%2C5.5%20Q21.5%2C7%2020%2C7%20Q18.5%2C7%2019%2C5%20Z%22%20fill%3D%22%232B1401%22/%3E%3C/svg%3E") 16 16, auto !important;
        }

        body.custom-cursor button,
        body.custom-cursor a,
        body.custom-cursor select,
        body.custom-cursor label,
        body.custom-cursor input[type="submit"],
        body.custom-cursor input[type="button"],
        body.custom-cursor input[type="checkbox"],
        body.custom-cursor input[type="radio"],
        body.custom-cursor summary,
        body.custom-cursor [onclick],
        body.custom-cursor [role="button"],
        body.custom-cursor .theme-toggle,
        body.custom-cursor .theme-btn,
        body.custom-cursor .lang-toggle,
        body.custom-cursor .lang-current,
        body.custom-cursor .lang-option,
        body.custom-cursor .voice-toggle,
        body.custom-cursor .voice-btn,
        body.custom-cursor .cookie-chip,
        body.custom-cursor .mood-btn,
        body.custom-cursor .gift-cookie-tile,
        body.custom-cursor .tab-btn,
        body.custom-cursor .fav-indicator,
        body.custom-cursor .carousel-dot,
        body.custom-cursor .floating-wa,
        body.custom-cursor .whatsapp-tooltip,
        body.custom-cursor .chat-send-btn,
        body.custom-cursor .chat-mic-btn,
        body.custom-cursor .history-btn,
        body.custom-cursor [class*="btn"],
        body.custom-cursor [class*="toggle"],
        body.custom-cursor [class*="dot"],
        body.custom-cursor [class*="chip"],
        body.custom-cursor [class*="tile"],
        body.custom-cursor [class*="indicator"],
        body.custom-cursor [class*="tab"],
        body.custom-cursor [class*="close"],
        body.custom-cursor [class*="session"],
        body.custom-cursor [class*="option"],
        body.custom-cursor .hero-title {
            cursor: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2232%22%20height%3D%2232%22%20viewBox%3D%220%200%2032%2032%22%3E%3Cdefs%3E%3CradialGradient%20id%3D%22doughBite%22%20cx%3D%2235%25%22%20cy%3D%2235%25%22%20r%3D%2265%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23FDF3D8%22/%3E%3Cstop%20offset%3D%2240%25%22%20stop-color%3D%22%23EAC085%22/%3E%3Cstop%20offset%3D%2285%25%22%20stop-color%3D%22%23C68F4E%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23965F25%22/%3E%3C/radialGradient%3E%3C/defs%3E%3Cpath%20d%3D%22M16%2C3.5%20C17.5%2C3.5%2018%2C6.5%2020.5%2C6.5%20C22.5%2C6.5%2023.5%2C9.5%2025.5%2C10.5%20C27%2C11%2027.5%2C14.5%2028.5%2C16.5%20C28.6%2C18.2%2027.8%2C24.8%2025.0%2C27.2%20C22.4%2C29.5%2018.8%2C30.5%2015.2%2C30.3%20C11.5%2C30.1%207.8%2C28.3%205.5%2C25.5%20C3.2%2C22.7%202.3%2C18.8%202.6%2C15.2%20C2.9%2C11.2%204.9%2C7.5%208.0%2C5.2%20C10.4%2C3.5%2013.2%2C3.6%2016%2C3.5%20Z%22%20fill%3D%22%233D2000%22%20opacity%3D%220.2%22/%3E%3Cpath%20d%3D%22M16%2C2.5%20C17.5%2C2.5%2018%2C5.5%2020.5%2C5.5%20C22.5%2C5.5%2023.5%2C8.5%2025.5%2C9.5%20C27%2C10%2027.5%2C13.5%2028.5%2C15.5%20C28.6%2C17.2%2027.8%2C23.8%2025.0%2C26.2%20C22.4%2C28.5%2018.8%2C29.5%2015.2%2C29.3%20C11.5%2C29.1%207.8%2C27.3%205.5%2C24.5%20C3.2%2C21.7%202.3%2C17.8%202.6%2C14.2%20C2.9%2C10.2%204.9%2C6.5%208.0%2C4.2%20C10.4%2C2.5%2013.2%2C2.6%2016%2C2.5%20Z%22%20fill%3D%22url%28%23doughBite%29%22/%3E%3Cpath%20d%3D%22M9%2011%20Q12%2010%2014%2013%20M13%2022%20Q16%2020%2018%2023%20M8%2018%20Q11%2019%2010%2021%22%20stroke%3D%22%2380501F%22%20stroke-width%3D%220.75%22%20fill%3D%22none%22%20opacity%3D%220.45%22%20stroke-linecap%3D%22round%22/%3E%3Cpath%20d%3D%22M9%2C7%20Q11%2C5.5%2012.5%2C7.5%20Q13%2C9.5%2010.5%2C10%20Q8.5%2C10%209%2C7%20Z%22%20fill%3D%22%232B1401%22/%3E%3Ccircle%20cx%3D%229.8%22%20cy%3D%227.2%22%20r%3D%220.4%22%20fill%3D%22%23FFE5B4%22%20opacity%3D%220.6%22/%3E%3Cpath%20d%3D%22M11%2C18%20Q13.5%2C17%2014%2C19%20Q14%2C21.5%2012%2C21.5%20Q9.5%2C21.5%2011%2C18%20Z%22%20fill%3D%22%232B1401%22/%3E%3Ccircle%20cx%3D%2211.8%22%20cy%3D%2218.2%22%20r%3D%220.4%22%20fill%3D%22%23FFE5B4%22%20opacity%3D%220.6%22/%3E%3Cpath%20d%3D%22M6%2C13%20Q7.5%2C12%208.5%2C14%20Q8%2C15.5%206.5%2C15.5%20Q5%2C15.5%206%2C13%20Z%22%20fill%3D%22%232B1401%22/%3E%3Cpath%20d%3D%22M21%2C20%20Q22.5%2C18.5%2024%2C20%20Q24%2C22%2022%2C22.5%20Q20%2C22.5%2021%2C20%20Z%22%20fill%3D%22%232B1401%22/%3E%3Ccircle%20cx%3D%2221.8%22%20cy%3D%2219.8%22%20r%3D%220.4%22%20fill%3D%22%23FFE5B4%22%20opacity%3D%220.6%22/%3E%3C/svg%3E") 16 16, auto !important;
        }

        body {
            font-family: 'DM Sans', sans-serif;
            background: var(--cream);
            height: 100vh;
            height: 100dvh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transition: background 0.3s, color 0.3s;
        }

        .hero {
            background: var(--hero-grad);
            padding: 28px 24px 20px;
            text-align: center;
            position: relative;
            overflow: visible;
            transition: background 0.3s;
        }

        .hero::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at 20% 50%, rgba(200, 150, 12, 0.15), transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(232, 184, 75, 0.1), transparent 50%);
        }

        .hero-tag {
            font-family: 'Cormorant Garamond', serif;
            font-size: 11px;
            letter-spacing: 4px;
            color: var(--gold2);
            text-transform: uppercase;
            margin-bottom: 8px;
            position: relative;
        }

        /* ===== SPELL-OUT FEATURE ===== */
        .hero-title {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            color: #FFF8EE;
            line-height: 1.2;
            position: relative;
            margin-bottom: 4px;
            display: inline-block;
            cursor: pointer;
            user-select: none;
        }

        .hero-title em {
            font-style: italic;
            color: var(--gold2);
        }

        .spell-tooltip {
            position: absolute;
            bottom: calc(100% + 10px);
            left: 50%;
            transform: translateX(-50%) scale(0.85);
            background: rgba(20, 8, 0, 0.96);
            border: 1px solid rgba(232, 184, 75, 0.5);
            border-radius: 12px;
            padding: 7px 16px;
            font-family: 'DM Sans', sans-serif;
            font-size: 13px;
            font-weight: 700;
            color: #E8B84B;
            white-space: nowrap;
            letter-spacing: 4px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.25s, transform 0.25s;
            z-index: 9999;
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
        }

        .spell-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: rgba(20, 8, 0, 0.96);
        }

        .spell-tooltip.visible {
            opacity: 1;
            transform: translateX(-50%) scale(1);
        }

        .hero-sub {
            font-size: 12px;
            color: rgba(255, 248, 238, 0.55);
            letter-spacing: 1px;
            position: relative;
        }

        .hero-controls {
            position: absolute;
            top: 12px;
            right: 12px;
            display: flex;
            gap: 6px;
            align-items: center;
            z-index: 9999;
        }

        .theme-toggle {
            display: flex;
            align-items: center;
            background: var(--toggle-bg);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 30px;
            padding: 4px 5px;
            gap: 2px;
            cursor: pointer;
        }

        .theme-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            color: rgba(255, 248, 238, 0.5);
            transition: all 0.2s;
            position: relative;
        }

        .theme-btn.active {
            background: rgba(232, 184, 75, 0.25);
            color: var(--gold2);
        }

        .theme-btn:hover {
            color: var(--gold2);
        }

        .lang-toggle {
            display: flex;
            align-items: center;
            background: var(--toggle-bg);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 30px;
            padding: 4px 10px;
            gap: 6px;
            cursor: pointer;
            position: relative;
        }

        .lang-current {
            font-family: 'DM Sans', sans-serif;
            font-size: 11px;
            font-weight: 600;
            color: var(--gold2);
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .lang-current svg {
            width: 12px;
            height: 12px;
            stroke: var(--gold2);
            fill: none;
            stroke-width: 2;
            stroke-linecap: round;
            transition: transform 0.2s;
        }

        .lang-dropdown {
            position: fixed;
            top: 62px;
            right: 12px;
            background: #2C1A00;
            border: 1px solid rgba(232, 184, 75, 0.25);
            border-radius: 14px;
            overflow: hidden;
            min-width: 160px;
            max-height: 75vh;
            overflow-y: auto;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
            opacity: 0;
            pointer-events: none;
            transform: translateY(-6px);
            transition: opacity 0.22s, transform 0.22s;
            z-index: 99999;
        }

        [data-theme="dark"] .lang-dropdown {
            position: fixed;
            top: 62px;
            right: 12px;
            background: #2C1A00;
            border: 1px solid rgba(232, 184, 75, 0.25);
            border-radius: 14px;
            overflow: hidden;
            min-width: 160px;
            max-height: 75vh;
            overflow-y: auto;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
            opacity: 0;
            pointer-events: none;
            transform: translateY(-6px);
            transition: opacity 0.22s, transform 0.22s;
            z-index: 99999;
        }

        .lang-dropdown.open {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
        }

        .lang-option {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 14px;
            font-size: 12.5px;
            font-weight: 500;
            color: rgba(245, 236, 215, 0.75);
            cursor: pointer;
            transition: all 0.15s;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .lang-option:last-child {
            border-bottom: none;
        }

        .lang-option:hover {
            background: rgba(232, 184, 75, 0.12);
            color: var(--gold2);
        }

        .lang-option.active {
            background: rgba(232, 184, 75, 0.18);
            color: var(--gold2);
            font-weight: 600;
        }

        .lang-flag {
            font-size: 16px;
        }

        .whatsapp-wrapper {
            position: absolute;
            top: 12px;
            left: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 10;
            pointer-events: none;
        }

        .whatsapp-btn {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: rgba(37, 211, 102, 0.15);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(37, 211, 102, 0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            text-decoration: none;
            pointer-events: auto;
        }

        .whatsapp-btn:hover {
            background: rgba(37, 211, 102, 0.3);
            transform: scale(1.05);
            box-shadow: 0 0 10px rgba(37, 211, 102, 0.4);
        }

        .whatsapp-btn svg {
            width: 20px;
            height: 20px;
            fill: #25D366;
        }

        .whatsapp-tooltip {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(139, 104, 64, 0.25);
            color: #5C3D1D;
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            font-family: 'DM Sans', sans-serif;
            white-space: nowrap;
            box-shadow: 0 4px 16px rgba(92, 61, 29, 0.08);
            animation: floatBubble 3s ease-in-out infinite;
            pointer-events: auto;
            position: relative;
        }

        .whatsapp-tooltip::before {
            content: '';
            position: absolute;
            left: -5px;
            top: 50%;
            transform: translateY(-50%) rotate(45deg);
            width: 8px;
            height: 8px;
            background: rgba(255, 255, 255, 0.85);
            border-left: 1px solid rgba(139, 104, 64, 0.25);
            border-bottom: 1px solid rgba(139, 104, 64, 0.25);
        }

        @keyframes floatBubble {

            0%,
            100% {
                transform: translateY(0);
            }

            50% {
                transform: translateY(-3px);
            }
        }

        .voice-toggle {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: var(--toggle-bg);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .voice-toggle:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
        }

        .voice-toggle svg {
            width: 18px;
            height: 18px;
            fill: none;
            stroke: #FFF8EE;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .voice-toggle.active {
            background: rgba(232, 184, 75, 0.25);
        }

        .cookie-strip {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            padding: 14px 16px;
            background: var(--strip-bg);
            border-bottom: 1px solid var(--border);
            scrollbar-width: none;
            transition: background 0.3s, border-color 0.3s;
        }

        .cookie-strip::-webkit-scrollbar {
            display: none;
        }

        .cookie-chip {
            flex-shrink: 0;
            background: var(--chip-bg);
            border: 1px solid var(--border);
            border-radius: 40px;
            padding: 7px 13px;
            font-size: 11.5px;
            font-weight: 500;
            color: var(--chip-color);
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .cookie-chip:hover {
            background: var(--brown);
            color: white;
            border-color: var(--brown);
            transform: translateY(-1px);
        }

        [data-theme="dark"] .cookie-chip:hover {
            background: var(--gold);
            color: #1A0D00;
            border-color: var(--gold);
        }

        .mood-banner {
            background: var(--mood-bg);
            border-bottom: 1px solid var(--border);
            padding: 12px 16px;
            text-align: center;
            transition: background 0.3s, border-color 0.3s;
        }

        .mood-label {
            font-family: 'Cormorant Garamond', serif;
            font-size: 13px;
            color: var(--muted);
            margin-bottom: 8px;
            letter-spacing: 1px;
        }

        .mood-btns {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 6px;
        }

        .mood-btn {
            background: var(--mood-btn-bg);
            border: 1px solid var(--border);
            border-radius: 30px;
            padding: 6px 13px;
            font-size: 11.5px;
            cursor: pointer;
            color: var(--mood-btn-color);
            transition: all 0.2s;
            font-family: 'DM Sans', sans-serif;
            font-weight: 500;
        }

        .mood-btn:hover {
            background: var(--brown2);
            color: white;
            border-color: var(--brown2);
        }

        [data-theme="dark"] .mood-btn:hover {
            background: var(--gold);
            color: #1A0D00;
            border-color: var(--gold);
        }

        .chat-area {
            flex: 1;
            overflow-y: auto;
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 13px;
            background: var(--chat-bg);
            scrollbar-width: thin;
            scrollbar-color: var(--border) transparent;
            transition: background 0.3s;
        }

        .chat-area::-webkit-scrollbar {
            width: 4px;
        }

        .chat-area::-webkit-scrollbar-thumb {
            background: var(--border);
            border-radius: 4px;
        }

        .msg {
            display: flex;
            gap: 10px;
            align-items: flex-end;
            animation: fadeUp 0.3s ease;
        }

        @keyframes fadeUp {
            from {
                opacity: 0;
                transform: translateY(8px);
            }

            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .msg.user {
            flex-direction: row-reverse;
        }

        .avatar {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
        }

        .avatar.bot {
            width: 50px;
            height: 50px;
            background: #ffffff url('logo.png') no-repeat center;
            background-size: contain;
            border: 1px solid var(--border);
        }

        .avatar.user {
            background: var(--gold);
            color: white;
            font-size: 12px;
        }

        [data-theme="dark"] .avatar.bot {
            background-color: #2A1A05;
        }

        .bubble {
            max-width: 80%;
            padding: 11px 15px;
            border-radius: 18px;
            font-size: 13.5px;
            line-height: 1.65;
            transition: background 0.3s, border-color 0.3s;
        }

        .bubble.bot {
            background: var(--bubble-bot);
            border: 1px solid var(--border);
            color: var(--text);
            border-bottom-left-radius: 4px;
        }

        .bubble.user {
            background: var(--bubble-user);
            color: white;
            border-bottom-right-radius: 4px;
        }

        .bubble strong {
            font-weight: 600;
        }

        .bubble.bot strong {
            color: var(--brown);
        }

        .bubble.user strong {
            color: var(--gold2);
        }

        .cookie-card {
            background: var(--chip-bg);
            border: 1px solid var(--border);
            border-radius: 16px;
            overflow: hidden;
            margin-top: 8px;
            transition: background 0.3s, border-color 0.3s;
        }

        .cookie-card-img {
            width: 100%;
            height: 130px;
            object-fit: cover;
            display: block;
        }

        .cookie-card-img-placeholder {
            width: 100%;
            height: 130px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
        }

        .cookie-card-body {
            padding: 12px 14px;
        }

        .cookie-card-name {
            font-family: 'Playfair Display', serif;
            font-size: 15px;
            color: var(--brown);
            margin-bottom: 4px;
        }

        .cookie-card-review {
            font-size: 12px;
            color: var(--muted);
            line-height: 1.5;
            margin-bottom: 10px;
        }

        .nutrition-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
        }

        .nut-item {
            background: var(--warm);
            border-radius: 8px;
            padding: 7px 6px;
            text-align: center;
            transition: background 0.3s;
        }

        .nut-val {
            font-size: 13px;
            font-weight: 600;
            color: var(--brown);
            font-family: 'Playfair Display', serif;
        }

        .nut-key {
            font-size: 10px;
            color: var(--muted);
            margin-top: 1px;
        }

        .stars {
            color: var(--gold);
            font-size: 13px;
            margin-bottom: 4px;
        }

        .badge-natural {
            display: inline-block;
            background: #E8F5E1;
            color: #2E6B1A;
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 20px;
            margin-top: 8px;
            border: 1px solid #BDE0A8;
            font-weight: 500;
        }

        [data-theme="dark"] .badge-natural {
            background: #1A2E12;
            color: #7DC85A;
            border-color: #2E5A1A;
        }

        .input-row {
            display: flex;
            padding: 12px 14px;
            background: var(--input-bg);
            border-top: 1px solid var(--border);
            align-items: center;
            gap: 8px;
            transition: background 0.3s, border-color 0.3s;
        }

        .chat-input {
            flex: 1;
            border: 1.5px solid var(--border);
            border-radius: 30px;
            padding: 10px 16px;
            font-size: 13.5px;
            color: var(--text);
            font-family: 'DM Sans', sans-serif;
            outline: none;
            background: var(--input-field);
            transition: border-color 0.2s, background 0.3s, color 0.3s;
        }

        .chat-input:focus {
            border-color: var(--gold);
        }

        .chat-input::placeholder {
            color: var(--muted);
        }

        .send-btn {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: var(--brown);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
        }

        .send-btn:hover {
            background: var(--brown2);
            transform: scale(1.05);
        }

        .send-btn svg {
            width: 18px;
            height: 18px;
            fill: none;
            stroke: var(--gold2);
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        [data-theme="dark"] .send-btn {
            background: var(--gold);
        }

        [data-theme="dark"] .send-btn svg {
            stroke: #1A0D00;
        }

        .mic-btn {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: var(--brown);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
        }

        .mic-btn:hover {
            background: var(--brown2);
            transform: scale(1.05);
        }

        .mic-btn svg {
            width: 18px;
            height: 18px;
            fill: none;
            stroke: var(--gold2);
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        [data-theme="dark"] .mic-btn {
            background: var(--gold2);
        }

        [data-theme="dark"] .mic-btn svg {
            stroke: #1A0D00;
        }

        .mic-btn.listening {
            background: #D9381E !important;
            box-shadow: 0 0 0 0 rgba(217, 56, 30, 0.7);
            animation: pulse-mic 1.2s infinite;
        }

        .mic-btn.listening svg {
            stroke: white !important;
        }

        @keyframes pulse-mic {
            0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(217, 56, 30, 0.7);
            }

            70% {
                transform: scale(1.08);
                box-shadow: 0 0 0 10px rgba(217, 56, 30, 0);
            }

            100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(217, 56, 30, 0);
            }
        }

        .typing {
            display: flex;
            gap: 4px;
            align-items: center;
            padding: 8px 0;
        }

        .dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: var(--gold);
            animation: bounce 1.2s infinite;
        }

        .dot:nth-child(2) {
            animation-delay: .2s;
        }

        .dot:nth-child(3) {
            animation-delay: .4s;
        }

        @keyframes bounce {

            0%,
            60%,
            100% {
                transform: translateY(0);
            }

            30% {
                transform: translateY(-6px);
            }
        }

        .footer-note {
            text-align: center;
            padding: 9px;
            font-size: 11px;
            color: var(--muted);
            background: var(--footer-bg);
            border-top: 1px solid var(--border);
            letter-spacing: 0.5px;
            transition: background 0.3s, border-color 0.3s;
        }

        .lang-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(232, 184, 75, 0.15);
            border: 1px solid rgba(232, 184, 75, 0.3);
            border-radius: 20px;
            padding: 3px 9px;
            font-size: 10px;
            color: var(--gold2);
            margin-bottom: 6px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .back-to-top {
            position: fixed;
            bottom: 80px;
            right: 16px;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: var(--brown);
            border: 1px solid var(--border);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transform: translateY(10px);
            transition: opacity 0.25s, transform 0.25s;
            z-index: 50;
        }

        .back-to-top.visible {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
        }

        .back-to-top:hover {
            background: var(--brown2);
            transform: translateY(-2px);
        }

        .back-to-top svg {
            width: 16px;
            height: 16px;
            stroke: var(--gold2);
            fill: none;
            stroke-width: 2.5;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        [data-theme="dark"] .back-to-top {
            background: var(--gold);
            border-color: transparent;
        }

        [data-theme="dark"] .back-to-top svg {
            stroke: #1A0D00;
        }

        .history-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(3px);
            z-index: 200;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s;
        }

        .history-overlay.open {
            opacity: 1;
            pointer-events: auto;
        }

        .history-panel {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            width: 82%;
            max-width: 320px;
            background: var(--cream);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 201;
        }

        .history-overlay.open .history-panel {
            transform: translateX(0);
        }

        .history-header {
            background: var(--hero-grad);
            padding: 18px 16px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .history-title {
            font-family: 'Playfair Display', serif;
            font-size: 16px;
            color: #FFF8EE;
        }

        .history-close {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.12);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .history-close svg {
            width: 14px;
            height: 14px;
            stroke: #FFF8EE;
            fill: none;
            stroke-width: 2.5;
            stroke-linecap: round;
        }

        .history-actions {
            display: flex;
            gap: 8px;
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
        }

        .history-btn {
            flex: 1;
            padding: 8px 0;
            border-radius: 20px;
            border: 1px solid var(--border);
            background: var(--chip-bg);
            color: var(--brown2);
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: 'DM Sans', sans-serif;
        }

        .history-btn:hover {
            background: var(--brown);
            color: white;
            border-color: var(--brown);
        }

        .history-btn.danger:hover {
            background: #C0392B;
            color: white;
            border-color: #C0392B;
        }

        [data-theme="dark"] .history-btn:hover {
            background: var(--gold);
            color: #1A0D00;
        }

        .history-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            scrollbar-width: thin;
            scrollbar-color: var(--border) transparent;
        }

        .history-session {
            background: var(--bubble-bot);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 10px 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .history-session:hover {
            border-color: var(--gold);
            background: var(--warm);
        }

        .history-session-date {
            font-size: 10px;
            color: var(--muted);
            margin-bottom: 4px;
            letter-spacing: 0.3px;
        }

        .history-session-preview {
            font-size: 12px;
            color: var(--text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .history-empty {
            text-align: center;
            padding: 40px 20px;
            color: var(--muted);
            font-size: 13px;
        }

        .history-empty-icon {
            font-size: 36px;
            margin-bottom: 10px;
        }

        .hist-btn {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: var(--chip-bg);
            border: 1px solid var(--border);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
        }

        .hist-btn:hover {
            background: var(--brown);
            border-color: var(--brown);
        }

        .hist-btn:hover svg {
            stroke: var(--gold2);
        }

        .hist-btn svg {
            width: 17px;
            height: 17px;
            stroke: var(--brown2);
            fill: none;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            transition: stroke 0.2s;
        }

        [data-theme="dark"] .hist-btn {
            background: var(--chip-bg);
        }

        [data-theme="dark"] .hist-btn svg {
            stroke: var(--gold2);
        }

        .gift-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 300;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s;
            display: flex;
            align-items: flex-end;
        }

        .gift-overlay.open {
            opacity: 1;
            pointer-events: auto;
        }

        .gift-panel {
            width: 100%;
            max-height: 88vh;
            background: var(--cream);
            border-radius: 24px 24px 0 0;
            display: flex;
            flex-direction: column;
            transform: translateY(100%);
            transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
            overflow: hidden;
        }

        .gift-overlay.open .gift-panel {
            transform: translateY(0);
        }

        .gift-handle {
            width: 36px;
            height: 4px;
            background: var(--border);
            border-radius: 2px;
            margin: 12px auto 0;
        }

        .gift-header {
            padding: 14px 18px 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border);
        }

        .gift-header-title {
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            color: var(--brown);
        }

        .gift-header-title span {
            color: var(--gold);
        }

        .gift-close {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: var(--warm);
            border: 1px solid var(--border);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .gift-close svg {
            width: 14px;
            height: 14px;
            stroke: var(--brown2);
            fill: none;
            stroke-width: 2.5;
            stroke-linecap: round;
        }

        .gift-body {
            flex: 1;
            overflow-y: auto;
            padding: 14px 16px;
        }

        .gift-section-label {
            font-family: 'Cormorant Garamond', serif;
            font-size: 12px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: var(--muted);
            margin-bottom: 10px;
        }

        .gift-cookie-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 18px;
        }

        .gift-cookie-tile {
            background: var(--chip-bg);
            border: 2px solid var(--border);
            border-radius: 14px;
            padding: 10px 10px 8px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
            position: relative;
        }

        .gift-cookie-tile:hover {
            border-color: var(--gold2);
            background: var(--warm);
        }

        .gift-cookie-tile.selected {
            border-color: var(--gold);
            background: rgba(200, 150, 12, 0.08);
        }

        .gift-cookie-tile .tile-emoji {
            font-size: 26px;
            display: block;
            margin-bottom: 4px;
        }

        .gift-cookie-tile .tile-name {
            font-size: 11px;
            font-weight: 600;
            color: var(--brown2);
        }

        .gift-cookie-tile .tile-count {
            position: absolute;
            top: -6px;
            right: -6px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: var(--gold);
            color: white;
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: scale(0.5);
            transition: all 0.2s;
        }

        .gift-cookie-tile.selected .tile-count {
            opacity: 1;
            transform: scale(1);
        }

        .gift-tile-controls {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 6px;
        }

        .gift-tile-btn {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 1px solid var(--border);
            background: var(--warm);
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--brown2);
            font-weight: 700;
            transition: all 0.15s;
        }

        .gift-tile-btn:hover {
            background: var(--gold);
            color: white;
            border-color: var(--gold);
        }

        .gift-tile-qty {
            font-size: 13px;
            font-weight: 600;
            color: var(--brown);
            min-width: 18px;
            text-align: center;
        }

        .gift-sizes {
            display: flex;
            gap: 8px;
            margin-bottom: 18px;
        }

        .gift-size-btn {
            flex: 1;
            padding: 10px 4px;
            border: 2px solid var(--border);
            border-radius: 12px;
            background: var(--chip-bg);
            cursor: pointer;
            text-align: center;
            transition: all 0.2s;
            font-family: 'DM Sans', sans-serif;
        }

        .gift-size-btn:hover {
            border-color: var(--gold2);
        }

        .gift-size-btn.selected {
            border-color: var(--gold);
            background: rgba(200, 150, 12, 0.08);
        }

        .gift-size-emoji {
            font-size: 20px;
            display: block;
            margin-bottom: 3px;
        }

        .gift-size-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--brown2);
            display: block;
        }

        .gift-size-qty {
            font-size: 10px;
            color: var(--muted);
            display: block;
        }

        .gift-msg-input {
            width: 100%;
            border: 1.5px solid var(--border);
            border-radius: 12px;
            padding: 10px 14px;
            font-size: 13px;
            font-family: 'DM Sans', sans-serif;
            color: var(--text);
            background: var(--input-field);
            resize: none;
            outline: none;
            margin-bottom: 18px;
            transition: border-color 0.2s;
        }

        .gift-msg-input:focus {
            border-color: var(--gold);
        }

        .gift-summary {
            background: var(--warm);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 12px 14px;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .gift-summary-left {
            font-size: 12.5px;
            color: var(--text);
        }

        .gift-summary-left strong {
            color: var(--brown);
            font-size: 14px;
        }

        .gift-summary-count {
            font-size: 11px;
            color: var(--muted);
        }

        .gift-footer {
            padding: 12px 16px 20px;
            border-top: 1px solid var(--border);
            display: flex;
            gap: 8px;
        }

        .gift-wa-btn {
            flex: 1;
            padding: 13px;
            background: #25D366;
            color: white;
            border: none;
            border-radius: 14px;
            font-size: 13.5px;
            font-weight: 600;
            font-family: 'DM Sans', sans-serif;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .gift-wa-btn:hover {
            background: #1DA851;
            transform: translateY(-1px);
        }

        .gift-reset-btn {
            padding: 13px 16px;
            background: var(--chip-bg);
            color: var(--muted);
            border: 1px solid var(--border);
            border-radius: 14px;
            font-size: 13px;
            font-weight: 500;
            font-family: 'DM Sans', sans-serif;
            cursor: pointer;
            transition: all 0.2s;
        }

        .gift-reset-btn:hover {
            border-color: var(--brown2);
            color: var(--brown2);
        }

        .gift-trigger-chip {
            flex-shrink: 0;
            background: linear-gradient(135deg, #C8960C, #E8B84B);
            border: none;
            border-radius: 40px;
            padding: 7px 15px;
            font-size: 11.5px;
            font-weight: 700;
            color: #3D2000;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(200, 150, 12, 0.35);
        }

        .gift-trigger-chip:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 14px rgba(200, 150, 12, 0.5);
        }

        .card-share-bar {
            display: flex;
            gap: 6px;
            padding: 10px 14px 12px;
            border-top: 1px solid var(--border);
            background: var(--warm);
        }

        .card-share-btn {
            flex: 1;
            padding: 8px 0;
            border-radius: 20px;
            border: none;
            font-size: 11.5px;
            font-weight: 600;
            font-family: 'DM Sans', sans-serif;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }

        .card-btn-download {
            background: var(--brown);
            color: var(--gold2);
        }

        .card-btn-download:hover {
            background: var(--brown2);
            transform: translateY(-1px);
        }

        [data-theme="dark"] .card-btn-download {
            background: var(--gold);
            color: #1A0D00;
        }

        .card-btn-share {
            background: var(--chip-bg);
            border: 1px solid var(--border) !important;
            color: var(--brown2);
        }

        .card-btn-share:hover {
            border-color: var(--gold) !important;
            color: var(--brown);
        }

        .card-btn-share.copied {
            background: #E8F5E1;
            color: #2E6B1A;
            border-color: #BDE0A8 !important;
        }

        .mm-toast {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: var(--brown);
            color: var(--gold2);
            font-size: 12.5px;
            font-weight: 600;
            padding: 10px 20px;
            border-radius: 30px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s;
            z-index: 999;
            white-space: nowrap;
        }

        .mm-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        [data-theme="dark"] .mm-toast {
            background: var(--gold);
            color: #1A0D00;
        }

        #cardRenderZone {
            position: fixed;
            top: -9999px;
            left: -9999px;
            width: 400px;
            background: #FDF8F2;
            font-family: 'DM Sans', sans-serif;
            padding: 0;
        }

        .morsels-tabs {
            display: inline-flex;
            background: rgba(0, 0, 0, 0.22);
            border-radius: 40px;
            padding: 3px;
            margin: 12px auto 0;
            border: 1px solid rgba(255, 255, 255, 0.12);
            position: relative;
            z-index: 10;
        }

        [data-theme="dark"] .morsels-tabs {
            background: rgba(255, 255, 255, 0.08);
        }

        .morsels-tab-btn {
            background: transparent;
            border: none;
            color: rgba(255, 248, 238, 0.65);
            font-family: 'DM Sans', sans-serif;
            font-weight: 700;
            font-size: 11px;
            padding: 7px 18px;
            border-radius: 40px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .morsels-tab-btn.active {
            background: var(--gold2);
            color: #3D2000;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }

        .boutique-area {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: none;
            flex-direction: column;
            gap: 16px;
            background: var(--chat-bg);
            scrollbar-width: thin;
            scrollbar-color: var(--border) transparent;
        }

        .boutique-area::-webkit-scrollbar {
            width: 4px;
        }

        .boutique-area::-webkit-scrollbar-thumb {
            background: var(--border);
            border-radius: 4px;
        }

        .boutique-carousel {
            width: 100%;
            overflow: hidden;
            border-radius: 16px;
            position: relative;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
            background: linear-gradient(135deg, var(--warm) 0%, var(--cream) 100%);
            border: 1px solid var(--border);
        }

        .carousel-track {
            display: flex;
            transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .carousel-slide {
            min-width: 100%;
            padding: 18px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .carousel-text {
            flex: 1;
        }

        .carousel-tag {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: var(--gold);
            font-weight: 700;
            margin-bottom: 4px;
        }

        .carousel-title {
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            color: var(--brown);
            margin-bottom: 6px;
        }

        .carousel-sub {
            font-size: 11.5px;
            color: var(--muted);
            line-height: 1.4;
        }

        .carousel-img {
            width: 76px;
            height: 76px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--gold);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
        }

        .carousel-dots {
            position: absolute;
            bottom: 6px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 5px;
        }

        .carousel-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--border);
            cursor: pointer;
            transition: all 0.2s;
        }

        .carousel-dot.active {
            background: var(--gold);
            width: 12px;
            border-radius: 3px;
        }

        .search-row {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .search-input-wrapper {
            flex: 1;
            position: relative;
        }

        .search-input-wrapper svg {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 15px;
            height: 15px;
            stroke: var(--muted);
            fill: none;
            stroke-width: 2.5;
        }

        .search-input {
            width: 100%;
            border: 1.5px solid var(--border);
            border-radius: 30px;
            padding: 8px 14px 8px 34px;
            font-size: 13px;
            color: var(--text);
            background: var(--input-field);
            outline: none;
            transition: all 0.25s;
        }

        .search-input:focus {
            border-color: var(--gold);
            box-shadow: 0 0 0 3px rgba(200, 150, 12, 0.15);
        }

        .fav-indicator {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: var(--chip-bg);
            border: 1px solid var(--border);
            cursor: pointer;
            flex-shrink: 0;
            transition: all 0.2s;
        }

        .fav-indicator:hover {
            border-color: var(--gold);
            transform: scale(1.05);
        }

        .fav-indicator svg {
            width: 16px;
            height: 16px;
            fill: #D9381E;
            stroke: #D9381E;
            stroke-width: 2;
        }

        .fav-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #D9381E;
            color: white;
            font-size: 8.5px;
            font-weight: 700;
            width: 17px;
            height: 17px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--chip-bg);
            transition: transform 0.2s ease;
        }

        .fav-badge.bounce {
            animation: badgeBounce 0.4s ease;
        }

        @keyframes badgeBounce {

            0%,
            100% {
                transform: scale(1);
            }

            50% {
                transform: scale(1.4);
            }
        }

        .boutique-filters {
            display: flex;
            gap: 6px;
            overflow-x: auto;
            scrollbar-width: none;
            padding-bottom: 2px;
        }

        .boutique-filters::-webkit-scrollbar {
            display: none;
        }

        .boutique-filter-chip {
            flex-shrink: 0;
            background: var(--chip-bg);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 4px 11px;
            font-size: 11px;
            font-weight: 600;
            color: var(--chip-color);
            cursor: pointer;
            transition: all 0.2s;
        }

        .boutique-filter-chip.active {
            background: var(--brown);
            color: white;
            border-color: var(--brown);
        }

        [data-theme="dark"] .boutique-filter-chip.active {
            background: var(--gold);
            color: #1A0D00;
            border-color: var(--gold);
        }

        .tag-cloud {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            padding: 2px 4px;
        }

        .tag-cloud-chip {
            background: var(--warm);
            border: 1px solid transparent;
            border-radius: 8px;
            padding: 3px 8px;
            font-size: 10px;
            color: var(--brown2);
            cursor: pointer;
            transition: all 0.15s;
            font-weight: 500;
        }

        .tag-cloud-chip.active {
            border-color: var(--gold);
            background: var(--chip-bg);
            color: var(--gold);
            font-weight: 600;
        }

        .boutique-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(136px, 1fr));
            gap: 10px;
        }

        .grid-card {
            background: var(--chip-bg);
            border: 1px solid var(--border);
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.02);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            position: relative;
            display: flex;
            flex-direction: column;
        }

        .grid-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
        }

        .grid-card-img-wrapper {
            position: relative;
            width: 100%;
            height: 94px;
            overflow: hidden;
            background: var(--warm);
        }

        .grid-card-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
        }

        .grid-card:hover .grid-card-img {
            transform: scale(1.06);
        }

        .grid-card-img-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
        }

        .grid-card-heart {
            position: absolute;
            top: 6px;
            right: 6px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.85);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
            transition: all 0.2s;
            z-index: 5;
        }

        .grid-card-heart:hover {
            transform: scale(1.1);
            background: #ffffff;
        }

        .grid-card-heart svg {
            width: 12px;
            height: 12px;
            fill: none;
            stroke: #D9381E;
            stroke-width: 2.5;
            transition: all 0.25s;
        }

        .grid-card-heart.active svg {
            fill: #D9381E;
            animation: heartBeat 0.4s ease;
        }

        @keyframes heartBeat {

            0%,
            100% {
                transform: scale(1);
            }

            25% {
                transform: scale(1.3);
            }

            50% {
                transform: scale(0.85);
            }

            75% {
                transform: scale(1.15);
            }
        }

        .grid-card-price-badge {
            position: absolute;
            bottom: 6px;
            left: 6px;
            background: rgba(61, 32, 0, 0.78);
            color: var(--gold2);
            font-size: 9.5px;
            font-weight: 700;
            padding: 2.5px 6px;
            border-radius: 5px;
            backdrop-filter: blur(4px);
        }

        .grid-card-body {
            padding: 10px;
            display: flex;
            flex-direction: column;
            flex: 1;
        }

        .grid-card-name {
            font-family: 'Playfair Display', serif;
            font-size: 13.5px;
            color: var(--brown);
            font-weight: 700;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .grid-card-stars {
            color: var(--gold);
            font-size: 10px;
            margin-bottom: 4px;
        }

        .grid-card-review {
            font-size: 10.5px;
            color: var(--muted);
            line-height: 1.4;
            margin-bottom: 8px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            height: 29px;
        }

        .grid-card-footer {
            display: flex;
            gap: 4px;
            margin-top: auto;
        }

        .grid-card-btn {
            flex: 1;
            padding: 6px 0;
            font-size: 9px;
            font-weight: 700;
            border-radius: 15px;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
            font-family: 'DM Sans', sans-serif;
            text-transform: uppercase;
        }

        .grid-btn-details {
            background: var(--warm);
            color: var(--brown2);
            border: 1px solid var(--border);
        }

        .grid-btn-details:hover {
            background: var(--chip-bg);
            border-color: var(--gold);
        }

        .grid-btn-cart {
            background: var(--brown);
            color: var(--gold2);
        }

        .grid-btn-cart:hover {
            background: var(--brown2);
            transform: translateY(-1px);
        }

        [data-theme="dark"] .grid-btn-cart {
            background: var(--gold);
            color: #1A0D00;
        }

        .load-more-container {
            display: flex;
            justify-content: center;
            margin: 6px 0 12px;
        }

        .load-more-btn {
            background: var(--chip-bg);
            border: 1px solid var(--border);
            color: var(--brown2);
            font-family: 'DM Sans', sans-serif;
            font-weight: 700;
            font-size: 11px;
            padding: 8px 18px;
            border-radius: 30px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .load-more-btn:hover {
            border-color: var(--gold);
            background: var(--warm);
        }

        .cookie-spinner {
            width: 12px;
            height: 12px;
            border: 2px solid var(--muted);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: none;
        }

        @keyframes spin {
            to {
                transform: rotate(360deg);
            }
        }

        .cart-trigger-btn {
            width: 38px;
            height: 38px;
            border-radius: 50%;
            background: var(--toggle-bg);
            border: 1px solid rgba(255, 255, 255, 0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            position: relative;
        }

        .cart-trigger-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.05);
        }

        .cart-trigger-btn svg {
            width: 16px;
            height: 16px;
            fill: none;
            stroke: #FFF8EE;
            stroke-width: 2.2;
        }

        .cart-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            background: #D9381E;
            color: white;
            font-size: 8.5px;
            font-weight: 700;
            width: 17px;
            height: 17px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid rgba(0, 0, 0, 0.1);
        }

        .cart-drawer-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(3px);
            z-index: 500;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s;
        }

        .cart-drawer-overlay.open {
            opacity: 1;
            pointer-events: auto;
        }

        .cart-drawer {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 82%;
            max-width: 320px;
            background: var(--cream);
            border-left: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 501;
        }

        .cart-drawer-overlay.open .cart-drawer {
            transform: translateX(0);
        }

        .cart-header {
            background: var(--hero-grad);
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .cart-title {
            font-family: 'Playfair Display', serif;
            font-size: 16px;
            color: #FFF8EE;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .cart-close-btn {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.12);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .cart-close-btn svg {
            width: 14px;
            height: 14px;
            stroke: #FFF8EE;
            fill: none;
            stroke-width: 2.5;
        }

        .cart-body {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .cart-item {
            display: flex;
            gap: 8px;
            align-items: center;
            background: var(--bubble-bot);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 6px 8px;
        }

        .cart-item-emoji {
            font-size: 20px;
        }

        .cart-item-info {
            flex: 1;
            min-width: 0;
        }

        .cart-item-name {
            font-size: 11.5px;
            font-weight: 600;
            color: var(--brown);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .cart-item-price {
            font-size: 10px;
            color: var(--muted);
            margin-top: 1px;
        }

        .cart-item-controls {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .cart-qty-btn {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 1px solid var(--border);
            background: var(--warm);
            cursor: pointer;
            font-size: 11px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--brown2);
            font-weight: 700;
        }

        .cart-qty-btn:hover {
            background: var(--gold);
            color: white;
            border-color: var(--gold);
        }

        .cart-item-qty {
            font-size: 11.5px;
            font-weight: 600;
            min-width: 14px;
            text-align: center;
        }

        .cart-item-remove {
            background: transparent;
            border: none;
            cursor: pointer;
            color: #D9381E;
            padding: 3px;
            display: flex;
            align-items: center;
        }

        .cart-item-remove svg {
            width: 12px;
            height: 12px;
            stroke: currentColor;
            fill: none;
            stroke-width: 2.5;
        }

        .cart-coupon-section {
            border-top: 1px solid var(--border);
            padding-top: 10px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .coupon-row {
            display: flex;
            gap: 5px;
        }

        .coupon-input {
            flex: 1;
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 5px 10px;
            font-size: 11px;
            outline: none;
            background: var(--input-field);
            color: var(--text);
        }

        .coupon-btn {
            background: var(--brown);
            color: var(--gold2);
            border: none;
            border-radius: 20px;
            padding: 5px 12px;
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
        }

        .coupon-feedback {
            font-size: 9.5px;
            font-weight: 600;
        }

        .coupon-feedback.success {
            color: #2E6B1A;
        }

        .coupon-feedback.error {
            color: #D9381E;
        }

        .cart-gift-wrap {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--warm);
            border-radius: 8px;
            padding: 6px 8px;
            font-size: 11px;
            font-weight: 600;
            color: var(--brown2);
        }

        .cart-gift-wrap input {
            cursor: pointer;
        }

        .cart-summary-block {
            border-top: 1px solid var(--border);
            padding-top: 10px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            font-size: 11.5px;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            color: var(--muted);
        }

        .summary-row.total {
            font-size: 13.5px;
            font-weight: 700;
            color: var(--brown);
            border-top: 1.5px dashed var(--border);
            padding-top: 5px;
            margin-top: 2px;
        }

        .cart-footer {
            padding: 10px 12px 18px;
            border-top: 1px solid var(--border);
        }

        .cart-checkout-btn {
            width: 100%;
            padding: 10px;
            background: #25D366;
            color: white;
            border: none;
            border-radius: 30px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            text-transform: uppercase;
            font-family: 'DM Sans', sans-serif;
        }

        .cart-checkout-btn:hover {
            background: #1DA851;
        }

        .cart-empty {
            text-align: center;
            padding: 40px 10px;
            color: var(--muted);
            font-size: 12px;
        }

        .cart-empty-icon {
            font-size: 32px;
            margin-bottom: 6px;
        }

        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 600;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px;
        }

        .modal-overlay.open {
            opacity: 1;
            pointer-events: auto;
        }

        .qv-modal {
            background: var(--cream);
            border: 1px solid var(--border);
            border-radius: 20px;
            width: 100%;
            max-width: 440px;
            max-height: 82vh;
            overflow-y: auto;
            box-shadow: 0 10px 35px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            position: relative;
            animation: modalScale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes modalScale {
            from {
                transform: scale(0.92);
                opacity: 0;
            }

            to {
                transform: scale(1);
                opacity: 1;
            }
        }

        .qv-close-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid var(--border);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }

        .qv-close-btn svg {
            width: 12px;
            height: 12px;
            stroke: #3D2000;
            fill: none;
            stroke-width: 2.5;
        }

        .qv-hero-img {
            width: 100%;
            height: 140px;
            object-fit: cover;
        }

        .qv-hero-placeholder {
            width: 100%;
            height: 140px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 54px;
        }

        .qv-body {
            padding: 16px;
        }

        .qv-name-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
        }

        .qv-name {
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            color: var(--brown);
            font-weight: 700;
        }

        .qv-price {
            font-size: 14px;
            font-weight: 700;
            color: var(--gold);
        }

        .qv-review {
            font-size: 11.5px;
            color: var(--muted);
            line-height: 1.5;
            margin-bottom: 12px;
        }

        .qv-tabs {
            display: flex;
            border-bottom: 1px solid var(--border);
            margin-bottom: 12px;
        }

        .qv-tab {
            flex: 1;
            padding: 6px 0;
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            font-family: 'DM Sans', sans-serif;
            font-size: 10.5px;
            font-weight: 700;
            color: var(--muted);
            cursor: pointer;
            text-align: center;
            text-transform: uppercase;
        }

        .qv-tab.active {
            color: var(--gold);
            border-bottom-color: var(--gold);
        }

        .qv-tab-content {
            display: none;
        }

        .qv-tab-content.active {
            display: block;
        }

        .nut-row-qv {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 0;
            border-bottom: 1px solid var(--border);
            font-size: 11px;
        }

        .nut-row-qv:last-child {
            border-bottom: none;
        }

        .nut-qv-label {
            color: var(--muted);
        }

        .nut-qv-val {
            font-weight: 600;
            color: var(--brown);
        }

        .qv-share-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            margin-bottom: 12px;
        }

        .qv-share-btn {
            background: var(--warm);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 6px 3px;
            font-size: 10px;
            font-weight: 600;
            color: var(--brown2);
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 3px;
            transition: all 0.2s;
        }

        .qv-share-btn:hover {
            background: var(--chip-bg);
            border-color: var(--gold);
        }

        .qv-share-btn svg {
            width: 14px;
            height: 14px;
            stroke: currentColor;
            fill: none;
            stroke-width: 2.2;
        }

        .qv-qr-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            background: white;
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 10px;
            margin-top: 8px;
            color: #3D2000;
        }

        .qv-qr-canvas {
            width: 90px;
            height: 90px;
            margin-bottom: 6px;
        }

        .qv-qr-text {
            font-size: 9px;
            color: #8B6840;
            font-weight: 600;
        }

        .qv-reviews-list {
            max-height: 120px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-bottom: 12px;
            padding-right: 4px;
        }

        .qv-review-item {
            background: var(--warm);
            border-radius: 8px;
            padding: 6px 8px;
        }

        .qv-review-item-header {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            margin-bottom: 2px;
        }

        .qv-review-author {
            font-weight: 700;
            color: var(--brown);
        }

        .qv-review-stars {
            color: var(--gold);
        }

        .qv-review-text {
            font-size: 11px;
            color: var(--text);
            line-height: 1.3;
        }

        .qv-add-review-form {
            border-top: 1px solid var(--border);
            padding-top: 10px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .qv-form-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--brown);
        }

        .qv-form-stars-picker {
            display: flex;
            gap: 4px;
            font-size: 16px;
            color: var(--border);
            cursor: pointer;
        }

        .qv-form-stars-picker span.active {
            color: var(--gold);
        }

        .qv-form-input {
            width: 100%;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 6px 8px;
            font-size: 11px;
            background: var(--input-field);
            color: var(--text);
            outline: none;
        }

        .qv-form-textarea {
            resize: none;
            height: 38px;
        }

        .qv-form-submit {
            background: var(--brown);
            color: var(--gold2);
            border: none;
            border-radius: 20px;
            padding: 6px 12px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
            text-transform: uppercase;
        }

        [data-theme="dark"] .qv-form-submit {
            background: var(--gold);
            color: #1A0D00;
        }

        .qv-action-bar {
            display: flex;
            gap: 6px;
            margin-top: 12px;
        }

        .qv-action-btn {
            flex: 1;
            padding: 9px;
            font-size: 11px;
            font-weight: 700;
            border-radius: 30px;
            border: none;
            cursor: pointer;
            text-align: center;
            text-transform: uppercase;
            font-family: 'DM Sans', sans-serif;
        }

        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-top: 10px;
        }

        .analytics-card {
            background: var(--warm);
            border-radius: 10px;
            padding: 10px 8px;
            text-align: center;
            border: 1px solid var(--border);
        }

        .analytics-val {
            font-family: 'Playfair Display', serif;
            font-size: 18px;
            font-weight: 700;
            color: var(--gold);
            margin-bottom: 2px;
        }

        .analytics-lbl {
            font-size: 9px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        @media print {
            body {
                background: white !important;
                color: black !important;
                font-size: 12pt !important;
            }

            .hero,
            .cookie-strip,
            .mood-banner,
            .input-row,
            .footer-note,
            .back-to-top,
            .history-overlay,
            .gift-overlay,
            .cart-trigger-btn,
            .cart-drawer-overlay,
            .modal-overlay:not(#quickViewModal),
            .qv-close-btn,
            .qv-action-bar,
            .qv-tabs,
            .qv-add-review-form,
            .qv-share-grid {
                display: none !important;
            }

            #quickViewModal {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                max-height: 100% !important;
                box-shadow: none !important;
                background: white !important;
                border: none !important;
            }

            .qv-body {
                padding: 0 !important;
            }

            .qv-tab-content {
                display: block !important;
            }

            .qv-reviews-list,
            .qv-qr-area {
                display: flex !important;
            }
        }

        @media (max-width: 768px) {
            .hero {
                padding: 10px 12px 10px !important;
            }
            .hero-tag {
                display: none !important;
            }
            .hero-title {
                font-size: 18px !important;
                margin-bottom: 2px !important;
            }
            .hero-sub {
                font-size: 10.5px !important;
                margin-bottom: 6px !important;
            }
            .controls-row {
                padding: 0 4px 6px !important;
                gap: 5px !important;
            }
            .control-btn, .lang-toggle {
                height: 28px !important;
                font-size: 11px !important;
                padding: 2px 8px !important;
            }
            .morsels-tabs {
                gap: 6px !important;
                margin-top: 4px !important;
            }
            .morsels-tab-btn {
                padding: 5px 12px !important;
                font-size: 11.5px !important;
                border-radius: 16px !important;
            }
            .cookie-strip {
                padding: 5px 8px !important;
                gap: 5px !important;
                overflow-x: auto !important;
                flex-wrap: nowrap !important;
            }
            .cookie-chip, .gift-trigger-chip {
                padding: 4px 8px !important;
                font-size: 11px !important;
                flex-shrink: 0 !important;
                white-space: nowrap !important;
            }
            .mood-banner {
                padding: 5px 10px !important;
                margin: 0 !important;
            }
            .mood-label {
                font-size: 9.5px !important;
                margin-bottom: 3px !important;
            }
            .mood-btns {
                display: flex !important;
                overflow-x: auto !important;
                flex-wrap: nowrap !important;
                gap: 4px !important;
                padding-bottom: 2px !important;
            }
            .mood-btn {
                padding: 3px 7px !important;
                font-size: 10px !important;
                flex-shrink: 0 !important;
                white-space: nowrap !important;
            }
            .chat-area {
                padding: 10px 10px 6px !important;
                gap: 10px !important;
            }
            .bubble {
                font-size: 12.5px !important;
                padding: 8px 12px !important;
                max-width: 90% !important;
                line-height: 1.45 !important;
            }
            .input-row {
                padding: 8px 10px !important;
                gap: 6px !important;
            }
            .chat-input {
                padding: 8px 10px !important;
                font-size: 12px !important;
            }
            .send-btn, .mic-btn, .hist-btn {
                width: 34px !important;
                height: 34px !important;
                min-width: 34px !important;
            }
            .footer-note {
                font-size: 8.5px !important;
                padding: 3px 6px !important;
            }
        }
    </style>
</head>

