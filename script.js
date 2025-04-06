const fileInput = document.getElementById('logFile');
    const tableBody = document.querySelector('#dropsTable tbody');
    const searchView = document.getElementById('searchView');
    const searchInput = document.getElementById('search');
    const minRateInput = document.getElementById('minRate');
    const maxRateInput = document.getElementById('maxRate');
    const filterOpponent = document.getElementById('filterOpponent');
    const filterStrategy = document.getElementById('filterStrategy');

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
      populateFilters(parsed);
      applySortAndFilter();
      searchView.classList.remove('hidden');
    });

    function populateFilters(data) {
      const opponents = [...new Set(data.map(d => d.opponent))];
      const strategies = [...new Set(data.map(d => d.strategy))].sort();

      filterOpponent.innerHTML = '<option value="">All Opponents</option>' + opponents.map(o => `<option>${o}</option>`).join('');
      filterStrategy.innerHTML = '<option value="">All Strategies</option>' + strategies.map(s => `<option>${s}</option>`).join('');
    }

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
        const imgSrc = `img/${drop.imageId}.png`;
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

    [searchInput, minRateInput, maxRateInput, filterOpponent, filterStrategy].forEach(el => {
      el.addEventListener('input', applySortAndFilter);
    });

    function applySortAndFilter() {
      const textFilter = searchInput.value.toLowerCase();
      const minRate = parseInt(minRateInput.value) || 1;
      const maxRate = parseInt(maxRateInput.value) || 2048;
      const opponentVal = filterOpponent.value;
      const strategyVal = filterStrategy.value;

      let filtered = currentData.filter(drop => {
        const cardMatch = drop.card.toLowerCase().includes(textFilter);
        const rateValue = parseInt(drop.rate.split('/')[0]);
        const rateMatch = rateValue >= minRate && rateValue <= maxRate;
        const opponentMatch = opponentVal ? drop.opponent === opponentVal : true;
        const strategyMatch = strategyVal ? drop.strategy === strategyVal : true;
        return cardMatch && rateMatch && opponentMatch && strategyMatch;
      });

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