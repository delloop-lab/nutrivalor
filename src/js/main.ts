export function renderKitchenCalculator() {
  const container = document.getElementById('kitchenCalculatorContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="calculator-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem;"> 
      <!-- Weight Converter -->
      <div class="calculator-card">
        <h3 class="calculator-title">Weight Converter</h3>
        <div class="form-group">
          <label for="weightAmount">Amount</label>
          <input type="number" id="weightAmount" value="1">
        </div>
        <div class="form-group">
          <label for="weightFrom">From</label>
          <select id="weightFrom"></select>
        </div>
        <div class="form-group">
          <label for="weightTo">To</label>
          <select id="weightTo"></select>
        </div>
        <div class="calculator-result" id="weightResult" style="font-size:2.2rem;font-weight:700;color:#1e293b;text-align:center;margin-bottom:1.2rem;margin-top:0;font-family:inherit;"></div>
      </div>
      <!-- Volume Converter -->
      <div class="calculator-card">
        <h3 class="calculator-title">Volume Converter</h3>
        <div class="form-group">
          <label for="volumeAmount">Amount</label>
          <input type="number" id="volumeAmount" value="1">
        </div>
        <div class="form-group">
          <label for="volumeFrom">From</label>
          <select id="volumeFrom"></select>
        </div>
        <div class="form-group">
          <label for="volumeTo">To</label>
          <select id="volumeTo"></select>
        </div>
        <div class="calculator-result" id="volumeResult" style="font-size:2.2rem;font-weight:700;color:#1e293b;text-align:center;margin-bottom:1.2rem;margin-top:0;font-family:inherit;"></div>
      </div>
      <!-- Length Converter -->
      <div class="calculator-card">
        <h3 class="calculator-title">Length Converter</h3>
        <div class="form-group">
          <label for="lengthAmount">Amount</label>
          <input type="number" id="lengthAmount" value="1">
        </div>
        <div class="form-group">
          <label for="lengthFrom">From</label>
          <select id="lengthFrom"></select>
        </div>
        <div class="form-group">
          <label for="lengthTo">To</label>
          <select id="lengthTo"></select>
        </div>
        <div class="calculator-result" id="lengthResult" style="font-size:2.2rem;font-weight:700;color:#1e293b;text-align:center;margin-bottom:1.2rem;margin-top:0;font-family:inherit;"></div>
      </div>
      <!-- Temperature Converter -->
      <div class="calculator-card">
        <h3 class="calculator-title">Temperature Converter</h3>
        <div class="form-group">
          <label for="tempAmount">Amount</label>
          <input type="number" id="tempAmount" value="0">
        </div>
        <div class="form-group">
          <label for="tempFrom">From</label>
          <select id="tempFrom">
            <option value="C">°C</option>
            <option value="F">°F</option>
            <option value="K">K</option>
          </select>
        </div>
        <div class="form-group">
          <label for="tempTo">To</label>
          <select id="tempTo">
            <option value="C">°C</option>
            <option value="F">°F</option>
            <option value="K">K</option>
          </select>
        </div>
        <div class="calculator-result" id="tempResult" style="font-size:2.2rem;font-weight:700;color:#1e293b;text-align:center;margin-bottom:1.2rem;margin-top:0;font-family:inherit;"></div>
      </div>
    </div>
  `;

  // Conversion logic
  const weightUnits = { g: 1, kg: 1000, lb: 453.6, oz: 28.35, stone: 6350 };
  const volumeUnits = {
    'ml': 1, 'l': 1000, 'tsp (UK)': 5, 'tsp (US)': 4.92892,
    'tbsp (UK)': 15, 'tbsp (US)': 14.7868,
    'cup (UK)': 284, 'cup (US)': 240,
    'fl oz (UK)': 28.4131, 'fl oz (US)': 29.5735
  };
  const lengthUnits = { mm: 1, cm: 10, m: 1000, in: 25.4, ft: 304.8 };

  function populateSelect(select, unitObj) {
    Object.keys(unitObj).forEach(unit => {
      const opt = document.createElement('option');
      opt.value = unit;
      opt.textContent = unit;
      select.appendChild(opt);
    });
  }

  function setupConverter(amountId, fromId, toId, resultId, units) {
    const amount = document.getElementById(amountId) as HTMLInputElement;
    const from = document.getElementById(fromId) as HTMLSelectElement;
    const to = document.getElementById(toId) as HTMLSelectElement;
    const result = document.getElementById(resultId);
    function convert() {
      const amt = parseFloat(amount.value) || 1;
      const fromVal = units[from.value];
      const toVal = units[to.value];
      if (isNaN(amt) || !fromVal || !toVal) {
        result.textContent = '';
        return;
      }
      if (from.value === to.value && (amt === 1 || amount.value === '' || amount.value === '1')) {
        result.textContent = '';
        return;
      }
      const out = (amt * fromVal / toVal).toFixed(2);
      result.textContent = `${amt} ${from.value} = ${out} ${to.value}`;
    }
    amount.addEventListener('input', convert);
    from.addEventListener('change', convert);
    to.addEventListener('change', convert);
    convert();
  }

  function convertTemp() {
    const amt = parseFloat((document.getElementById('tempAmount') as HTMLInputElement).value);
    const from = (document.getElementById('tempFrom') as HTMLSelectElement).value;
    const to = (document.getElementById('tempTo') as HTMLSelectElement).value;
    let resultVal = amt;
    let show = true;
    if (from === to) {
      resultVal = amt;
      // Only show if value is not default
      if (amt === 0 || isNaN(amt)) show = false;
    } else if (from === 'C') {
      resultVal = to === 'F' ? (amt * 9/5 + 32)
             : to === 'K' ? (amt + 273.15) : amt;
    } else if (from === 'F') {
      resultVal = to === 'C' ? ((amt - 32) * 5/9)
             : to === 'K' ? ((amt - 32) * 5/9 + 273.15) : amt;
    } else if (from === 'K') {
      resultVal = to === 'C' ? (amt - 273.15)
             : to === 'F' ? ((amt - 273.15) * 9/5 + 32) : amt;
    }
    const result = document.getElementById('tempResult');
    if (!show) {
      result.textContent = '';
      return;
    }
    result.textContent = `${amt}°${from} = ${resultVal.toFixed(2)}°${to}`;
  }

  // Setup
  populateSelect(document.getElementById('weightFrom'), weightUnits);
  populateSelect(document.getElementById('weightTo'), weightUnits);
  populateSelect(document.getElementById('volumeFrom'), volumeUnits);
  populateSelect(document.getElementById('volumeTo'), volumeUnits);
  populateSelect(document.getElementById('lengthFrom'), lengthUnits);
  populateSelect(document.getElementById('lengthTo'), lengthUnits);

  setupConverter('weightAmount', 'weightFrom', 'weightTo', 'weightResult', weightUnits);
  setupConverter('volumeAmount', 'volumeFrom', 'volumeTo', 'volumeResult', volumeUnits);
  setupConverter('lengthAmount', 'lengthFrom', 'lengthTo', 'lengthResult', lengthUnits);

  document.getElementById('tempAmount').addEventListener('input', convertTemp);
  document.getElementById('tempFrom').addEventListener('change', convertTemp);
  document.getElementById('tempTo').addEventListener('change', convertTemp);
  convertTemp();
} 