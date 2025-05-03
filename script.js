const fileInput = document.getElementById('logFile');
const tableBody = document.querySelector('#dropsTable tbody');
const searchView = document.getElementById('searchView');
const searchInput = document.getElementById('search');
const minRateInput = document.getElementById('minRate');
const maxRateInput = document.getElementById('maxRate');
const filterOpponent = document.getElementById('filterOpponent');
const filterStrategy = document.getElementById('filterStrategy');
const typeFilterContainer = document.getElementById('typeCheckboxes');
const toggleTypeDropdown = document.getElementById('toggleTypeDropdown');
const typeArrow = document.getElementById('typeArrow');

let currentSortKey = null;
let currentSortDirection = 'asc';
let currentData = [];
let originalData = [];
let typeMapping = {};
const opponentImageMap = {};
let nextImageId = 1;

const cardTypes = [
  "Dragon",
  "Spellcaster",
  "Zombie",
  "Warrior",
  "Beast-Warrior",
  "Beast",
  "Winged Beast",
  "Fiend",
  "Fairy",
  "Insect",
  "Dinosaur",
  "Reptile",
  "Fish",
  "Sea Serpent",
  "Machine",
  "Thunder",
  "Aqua",
  "Pyro",
  "Rock",
  "Plant",
  "Magic",
  "Trap",
  "Ritual",
  "Equip"
];

function debounce(fn, delay = 200) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

async function loadTypeMapping() {
  const res = await fetch('assets/types.json');
  typeMapping = await res.json();
}

function parseDropData(text) {
  const lines = text.split('\n');
  const drops = [];
  let currentOpponent = '', currentStrategy = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headerMatch = line.match(/^(.+?)\s+(S\/A)-(Tec|Pow) drops$/i) || line.match(/^(.+?)\s+(B\/C\/D) drops$/i);

    if (headerMatch) {
      currentOpponent = headerMatch[1].trim();
      currentStrategy = headerMatch[2].toUpperCase();
      if (currentStrategy === 'S/A') currentStrategy += ' ' + headerMatch[3].toUpperCase();
      if (!(currentOpponent in opponentImageMap)) opponentImageMap[currentOpponent] = nextImageId++;
    } else if (line.startsWith('=>')) {
      const cardMatch = line.match(/=> #(\d+) (.+)/);
      const rateLine = lines[i + 1]?.trim();
      const rateMatch = rateLine?.match(/^Rate:\s+(\d+\/2048)/);

      if (cardMatch && rateMatch) {
        const id = cardMatch[1], card = cardMatch[2], rate = rateMatch[1];
        const imageId = opponentImageMap[currentOpponent] || 0;
        const typeIndex = typeMapping[id] ?? -1;
        drops.push({ id, card, rate, opponent: currentOpponent, strategy: currentStrategy, imageId, typeIndex });
      }
    }
  }

  return drops;
}

function populateFilters(data) {
  const opponents = [...new Set(data.map(d => d.opponent))];
  const strategies = [...new Set(data.map(d => d.strategy))].sort();

  filterOpponent.innerHTML = `
    <option value="">All Opponents</option>
    ${opponents.map(op => `<option>${op}</option>`).join('')}
  `;

  filterStrategy.innerHTML = '';
  strategies.forEach(strat => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = strat;
    checkbox.checked = true;
    checkbox.addEventListener('change', applySortAndFilter);
    label.append(checkbox, document.createTextNode(strat));
    filterStrategy.appendChild(label);
  });
}

function populateTypeFilter() {
  typeFilterContainer.innerHTML = '';

  const controls = document.createElement('div');
  controls.className = 'type-controls';

  const selectAll = document.createElement('button');
  selectAll.textContent = 'Select All';
  selectAll.type = 'button';
  selectAll.addEventListener('click', () => {
    typeFilterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
    applySortAndFilter();
  });

  const deselectAll = document.createElement('button');
  deselectAll.textContent = 'Deselect All';
  deselectAll.type = 'button';
  deselectAll.addEventListener('click', () => {
    typeFilterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    applySortAndFilter();
  });

  controls.appendChild(selectAll);
  controls.appendChild(deselectAll);
  typeFilterContainer.appendChild(controls);

  cardTypes.forEach((type, idx) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = idx;
    checkbox.checked = true;
    checkbox.addEventListener('change', applySortAndFilter);
    label.append(checkbox, document.createTextNode(type));
    typeFilterContainer.appendChild(label);
  });

  typeFilterContainer.classList.add('hidden');
  typeArrow.textContent = '▼';
}


function renderTable(data) {
  const limit = (data.length > 500) ? 500 : data.length;
  const visibleData = data.slice(0, limit);
  document.getElementById('cardCount').textContent = `Showing ${visibleData.length} cards of ${data.length}`;

  let html = '';
  for (let i = 0; i < visibleData.length; i++) {
    const drop = visibleData[i];
    const rateValue = parseInt(drop.rate.split('/')[0], 10);
    const percentage = ((rateValue / 2048) * 100).toFixed(2);
    const imgSrc = `assets/opponent/${drop.imageId}.png`;
    const typeName = cardTypes[drop.typeIndex] || 'Unknown';
    const typeImgSrc = `assets/types/${typeName}.png`;
    const rowClass = i % 2 === 0 ? 'even' : 'odd';

    html += `
      <tr class="${rowClass}">
        <td>${drop.card}</td>
        <td><img src="${typeImgSrc}" alt="${typeName}" class="type-icon" /> ${typeName}</td>
        <td>${drop.rate} <strong>(${percentage}%)</strong></td>
        <td class="opponent-cell"><img src="${imgSrc}" alt="Opponent Icon">${drop.opponent}</td>
        <td>${drop.strategy}</td>
      </tr>`;
  }

  tableBody.innerHTML = html;
}

function applySortAndFilter() {
  const textFilter = searchInput.value.toLowerCase();
  const minRate = parseInt(minRateInput.value, 10) || 1;
  const maxRate = parseInt(maxRateInput.value, 10) || 2048;
  const opponentVal = filterOpponent.value;
  const checkedStrats = [...filterStrategy.querySelectorAll('input:checked')].map(cb => cb.value);
  const checkedTypes = [...typeFilterContainer.querySelectorAll('input:checked')].map(cb => +cb.value);

  let filtered = currentData.filter(drop => {
    const rateNum = parseInt(drop.rate.split('/')[0], 10);
    return drop.card.toLowerCase().includes(textFilter) &&
      rateNum >= minRate && rateNum <= maxRate &&
      (opponentVal ? drop.opponent === opponentVal : true) &&
      checkedStrats.includes(drop.strategy) &&
      checkedTypes.includes(drop.typeIndex);
  });

  if (currentSortKey) {
    filtered.sort((a, b) => {
      let aVal = a[currentSortKey];
      let bVal = b[currentSortKey];
  
      if (currentSortKey === 'rate') {
        aVal = parseInt(aVal.split('/')[0], 10);
        bVal = parseInt(bVal.split('/')[0], 10);
      } else if (currentSortKey === 'type') {
        aVal = cardTypes[a.typeIndex] || '';
        bVal = cardTypes[b.typeIndex] || '';
      }
  
      if (currentSortKey !== 'rate') {
        aVal = aVal.toString().toLowerCase();
        bVal = bVal.toString().toLowerCase();
      }
  
      if (aVal < bVal) return currentSortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return currentSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }  

  renderTable(filtered);
}


fileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  await loadTypeMapping();
  const text = await file.text();
  currentData = parseDropData(text);
  originalData = [...currentData];
  populateFilters(currentData);
  applySortAndFilter();
  searchView.classList.remove('hidden');
});

document.getElementById('loadVanilla').addEventListener('click', async () => {
  await loadTypeMapping();
  const res = await fetch('assets/vanilla.log');
  const text = await res.text();
  currentData = parseDropData(text);
  originalData = [...currentData];
  populateFilters(currentData);
  applySortAndFilter();
  searchView.classList.remove('hidden');
});

document.getElementById('resetApp').addEventListener('click', () => {
  currentData = [];
  tableBody.innerHTML = '';

  fileInput.value = '';
  searchInput.value = '';
  minRateInput.value = '';
  maxRateInput.value = '';
  filterOpponent.value = '';
  filterStrategy.innerHTML = '';

  typeFilterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);

  currentSortKey = null;
  currentSortDirection = 'asc';
  document.querySelectorAll('#dropsTable th').forEach(h =>
    h.classList.remove('sorted-asc', 'sorted-desc')
  );

  searchView.classList.add('hidden');
});

const debouncedFilter = debounce(applySortAndFilter, 50);
[searchInput, minRateInput, maxRateInput, filterOpponent].forEach(el =>
  el.addEventListener('input', debouncedFilter)
);

document.querySelectorAll('#dropsTable th').forEach(header => {
  header.addEventListener('click', () => {
    const key = header.dataset.key;
    const isSameKey = currentSortKey === key;

    if (!isSameKey) {
      currentSortKey = key;
      currentSortDirection = 'asc';
    } else if (currentSortDirection === 'asc') {
      currentSortDirection = 'desc';
    } else if (currentSortDirection === 'desc') {
      currentSortKey = null;
      currentSortDirection = 'asc';
    }

    // Remove all sort indicators
    document.querySelectorAll('#dropsTable th').forEach(h =>
      h.classList.remove('sorted-asc', 'sorted-desc')
    );

    if (currentSortKey) {
      header.classList.add(`sorted-${currentSortDirection}`);
    }

    applySortAndFilter();
  });
});

toggleTypeDropdown.addEventListener('click', e => {
  e.stopPropagation();
  const isHidden = typeFilterContainer.classList.toggle('hidden');
  typeArrow.textContent = isHidden ? '▼' : '▲';
});

document.addEventListener('click', e => {
  if (!typeFilterContainer.contains(e.target) && !toggleTypeDropdown.contains(e.target)) {
    if (!typeFilterContainer.classList.contains('hidden')) {
      typeFilterContainer.classList.add('hidden');
      typeArrow.textContent = '▼';
    }
  }
});

window.addEventListener('DOMContentLoaded', populateTypeFilter);
