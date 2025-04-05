const fileInput = document.getElementById('logFile');
const tableBody = document.querySelector('#dropsTable tbody');
const searchView = document.getElementById('searchView');
const searchInput = document.getElementById('search');
let currentSortKey = null;
let currentSortDirection = 'asc';
let currentData = [];
const imageCache = {};
const opponentImageMap = {};
let nextImageId = 1;

fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const parsed = parseDropData(text);
      currentData = parsed;
      applySortAndFilter();
      searchView.classList.remove('hidden');
    });

    function parseDropData(text) {
      const lines = text.split('\n');
      const drops = [];
      let currentOpponent = '';
      let currentStrategy = '';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        const headerMatch = line.match(/^(.+?)\s+(S\/A)-(Tec|Pow) drops$/i) || line.match(/^(.+?)\s+(B\/C\/D) drops$/i);
        if (headerMatch) {
          currentOpponent = headerMatch[1].trim();
          currentStrategy = headerMatch[2].toUpperCase();
          if (currentStrategy === 'S/A') {
            currentStrategy += ' ' + headerMatch[3].toUpperCase();
          }
          if (!(currentOpponent in opponentImageMap)) {
            opponentImageMap[currentOpponent] = nextImageId++;
          }
        } else if (line.startsWith('=>')) {
          const cardMatch = line.match(/=> #(\d+) (.+)/);
          const rateLine = lines[i + 1]?.trim();
          const rateMatch = rateLine.match(/^Rate:\s+(\d+\/2048)/);

          if (cardMatch && rateMatch) {
            const id = cardMatch[1];
            const card = cardMatch[2];
            const rate = rateMatch[1];
            const imageId = opponentImageMap[currentOpponent] || 0;
            drops.push({ id, card, rate, opponent: currentOpponent, strategy: currentStrategy, imageId });
          }
        }
      }
      return drops;
    }

    function renderTable(data) {
      tableBody.innerHTML = '';
      data.forEach((drop, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'even' : 'odd';
        const imgSrc = `./img/${drop.imageId}.png`;
        row.innerHTML = `
          <td>${drop.id}</td>
          <td>${drop.card}</td>
          <td>${drop.rate}</td>
          <td class="opponent-cell">
            <img src="${imgSrc}" alt="Opponent Icon">
            ${drop.opponent}
          </td>
          <td>${drop.strategy}</td>
        `;
        tableBody.appendChild(row);
      });
    }

    searchInput.addEventListener('input', () => {
      applySortAndFilter();
    });

    document.querySelectorAll('#dropsTable th').forEach(header => {
      header.addEventListener('click', () => {
        const key = header.getAttribute('data-key');
        if (currentSortKey === key) {
          currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortKey = key;
          currentSortDirection = 'asc';
        }
        document.querySelectorAll('#dropsTable th').forEach(h => {
          h.classList.remove('sorted-asc', 'sorted-desc');
        });
        header.classList.add(`sorted-${currentSortDirection}`);
        applySortAndFilter();
      });
    });

    function applySortAndFilter() {
      const filter = searchInput.value.toLowerCase();
      let filtered = currentData.filter(drop =>
        drop.card.toLowerCase().includes(filter)
      );
      if (currentSortKey) {
        filtered.sort((a, b) => {
          let aVal = a[currentSortKey];
          let bVal = b[currentSortKey];
          if (currentSortKey === 'rate') {
            aVal = parseInt(aVal.split('/')[0]);
            bVal = parseInt(bVal.split('/')[0]);
          }
          if (aVal < bVal) return currentSortDirection === 'asc' ? -1 : 1;
          if (aVal > bVal) return currentSortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
      renderTable(filtered);
    }

    function changeRandomFavicon() {
      const randomNum = Math.floor(Math.random() * 39) + 1;
      const faviconURL = `img/${randomNum}.png`;
    
      let link = document.querySelector("link[rel~='icon']");
      
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
    
      link.href = faviconURL;
    }

    changeRandomFavicon();
    