        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEihzmYZOaXJyHnY1XbEBZ75yRVBoyxKIM2J2W6IQrm4QMqAxakEcCVAXck4QoIdX1fg/exec'; 

        let liveQueue = [], historyQueue = [], selectedToken = null, isUpdating = false;

        // Mobile Panel Open/Close Function
        function toggleSidebar() {
            document.getElementById('navSidebar').classList.toggle('active');
            document.getElementById('navOverlay').classList.toggle('active');
        }

        function formatTime12h(timeStr) {
            if (!timeStr) return "";
            try {
                let parts = timeStr.toString().split(':');
                if (parts.length < 2) return timeStr;
                let hours = parseInt(parts[0], 10);
                let minutes = parts[1].substring(0, 2);
                let modifier = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                return `${hours}:${minutes} ${modifier}`;
            } catch(e) { return timeStr; }
        }

        function updateClock() {
            const now = new Date();
            document.getElementById('liveClock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        setInterval(updateClock, 1000); updateClock();

        function switchTab(tab) {
            document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            
            if(tab === 'live') {
                document.getElementById('liveSection').classList.add('active');
                document.querySelectorAll('.nav-item')[0].classList.add('active'); 
                document.getElementById('pageTitle').innerText = "Live Queue";
            } else {
                document.getElementById('historySection').classList.add('active');
                document.querySelectorAll('.nav-item')[1].classList.add('active'); 
                document.getElementById('pageTitle').innerText = "History";
            }

            // Mobile view me tab click karne par panel band ho jaye
            if(window.innerWidth <= 850) {
                document.getElementById('navSidebar').classList.remove('active');
                document.getElementById('navOverlay').classList.remove('active');
            }
        }

        async function fetchData() {
            if(isUpdating) return;
            try {
                const res = await fetch(SCRIPT_URL + "?action=getDashboardData");
                const data = await res.json();
                liveQueue = data.live;
                historyQueue = data.history;
                render();
            } catch (e) { console.log("Fetching..."); }
        }
        setInterval(fetchData, 10000); fetchData();

        function render() {
            const liveTable = document.getElementById('liveTableBody');
            const liveMobile = document.getElementById('liveMobileBody');
            liveTable.innerHTML = ''; liveMobile.innerHTML = '';

            liveQueue.forEach(app => {
                let formattedTime = formatTime12h(app.time); 
                let stylistName = app.stylist ? app.stylist : "Any"; 
                
                const htmlTable = `<tr><td class="token-col">${app.token}</td><td><b>${app.name}</b><br><small>${app.phone}</small></td><td>${app.service}<br><small style="color:#b5952f; font-weight:600;">✂️ ${stylistName}</small></td><td>${formattedTime}</td><td><button class="btn-done btn-sm" onclick="openModal('${app.token}')">✓ Done</button></td></tr>`;
                
                const htmlMobile = `<div class="appointment-card"><div class="card-left"><div class="mobile-token"><span>Token</span><strong>${app.token.replace('#','')}</strong></div><div class="client-info"><div class="client-name">${app.name}</div><div style="font-size:14px; color:#555;">📞 ${app.phone}</div><div style="font-size:14px; font-weight:600;">${app.service} | ${formattedTime}</div><div style="font-size:13px; color:#b5952f; margin-top:3px; font-weight:600;">✂️ Stylist: ${stylistName}</div></div></div><button class="btn-done btn-lg" onclick="openModal('${app.token}')">✓ Done</button></div>`;
                
                liveTable.innerHTML += htmlTable; liveMobile.innerHTML += htmlMobile;
            });

            const histTable = document.getElementById('historyTableBody');
            const histMobile = document.getElementById('historyMobileBody');
            histTable.innerHTML = ''; histMobile.innerHTML = '';
            
            historyQueue.forEach(app => {
                let formattedTime = formatTime12h(app.time); 
                let stylistName = app.stylist ? app.stylist : "Any";
                
                histTable.innerHTML += `<tr><td class="token-col" style="color:#888;">${app.token}</td><td><b>${app.name}</b></td><td>${app.service}<br><small style="color:#888;">✂️ Stylist: ${stylistName}</small></td><td>${formattedTime}</td><td><span style="color:green; font-weight:600;">✓ Completed</span></td></tr>`;
                
                histMobile.innerHTML += `<div class="appointment-card" style="background:#fff; border-left:4px solid #28a745; opacity:0.9;"><div class="card-left"><div class="mobile-token" style="background:#eee; color:#666; border:none;"><strong>${app.token.replace('#','')}</strong></div><div class="client-info"><div class="client-name" style="color:#333;">${app.name}</div><div style="font-size:14px;">${app.service} | ${formattedTime}</div><div style="font-size:13px; color:#666; margin-top:4px;">✂️ Stylist: ${stylistName}</div></div></div><div style="color:#28a745; font-size:14px; font-weight:bold; padding-right:10px;">✓ Done</div></div>`;
            });
        }

        function openModal(token) { selectedToken = token; isUpdating = true; document.getElementById('confirmModal').classList.add('active'); }
        function closeModal() { isUpdating = false; document.getElementById('confirmModal').classList.remove('active'); }

        async function processDone() {
            const tokenClean = selectedToken.replace('#', '');
            closeModal();
            fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'markDone', token: tokenClean }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
            
            const movedItem = liveQueue.find(a => a.token === selectedToken);
            if (movedItem) {
                movedItem.status = 'Completed';
                historyQueue.unshift(movedItem); 
            }
            liveQueue = liveQueue.filter(a => a.token !== selectedToken);
            
            render();
            isUpdating = false;
        }