
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

    