/* Apple 健康 / CSV 导入：把明细实际保存并显示在运动、计划与日历中。 */
(() => {
  const watch = document.querySelector('[data-open="watch"]');
  if (!watch) return;
  const dialog = document.querySelector('#modal');
  const content = document.querySelector('#modalContent');

  const dateOnly = value => (value || '').slice(0, 10);
  const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]);

  function parseCsv(text) {
    const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(Boolean);
    const columns = (lines.shift() || '').split(',').map(item => item.trim());
    const at = name => columns.indexOf(name);
    const value = (items, name) => at(name) < 0 ? '' : (items[at(name)] || '').trim();
    const data = { workouts: [], cycles: [] };
    lines.forEach(line => {
      const items = line.split(',');
      const type = value(items, 'record_type');
      if (type === 'workout') data.workouts.push({
        date: dateOnly(value(items, 'start_date')),
        activity: value(items, 'activity').replace('HKWorkoutActivityType', '') || '运动',
        duration: value(items, 'duration_minutes'),
        energy: value(items, 'energy_kcal'),
        distance: value(items, 'distance_km')
      });
      if (type === 'menstrual_flow') data.cycles.push({
        date: dateOnly(value(items, 'start_date')),
        value: value(items, 'cycle_value') || '经期'
      });
    });
    return data;
  }

  function readHealth() {
    try { return JSON.parse(localStorage.getItem('calmImportedHealth') || '{"workouts":[],"cycles":[]}'); }
    catch { return { workouts: [], cycles: [] }; }
  }

  function renderImportedRecords() {
    const data = readHealth();
    const newest = [...data.workouts].sort((a,b) => b.date.localeCompare(a.date));
    document.querySelectorAll('.health-imported-block').forEach(node => node.remove());
    if (!newest.length && !data.cycles.length) return;

    const workoutView = document.querySelector('[data-view="workout"]');
    const workoutAnchor = workoutView?.querySelector('.record');
    if (workoutAnchor) {
      const rows = newest.slice(0, 5).map(item => `<div class="record card"><div class="record-badge">${item.activity.includes('Swimming') || item.activity.includes('游泳') ? '泳' : '动'}</div><div><b>${escape(item.activity)}</b><p>${escape(item.date)} · ${escape(item.duration || '—')} 分钟${item.energy ? ' · '+escape(item.energy)+' kcal' : ''}</p></div><span>✓</span></div>`).join('');
      workoutAnchor.insertAdjacentHTML('beforebegin', `<section class="health-imported-block"><div class="section-head"><h3>已导入训练</h3><small>${newest.length} 条</small></div>${rows}</section>`);
    }

    const planView = document.querySelector('[data-view="plan"]');
    const calendar = planView?.querySelector('.calendar');
    if (calendar) {
      const latestCycle = [...data.cycles].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 4);
      const latestWorkouts = newest.slice(0, 4);
      const rows = [
        ...latestCycle.map(item => `<p>🩸 <b>${escape(item.date)}</b> · 经期记录</p>`),
        ...latestWorkouts.map(item => `<p>${item.activity.includes('Swimming') ? '🏊' : '🏋️'} <b>${escape(item.date)}</b> · ${escape(item.activity)}${item.duration ? ' · '+escape(item.duration)+' 分钟' : ''}</p>`)
      ].join('');
      calendar.insertAdjacentHTML('afterend', `<div class="card health-imported-block imported-history"><div class="section-head"><h3>已导入健康记录</h3><small>运动 ${data.workouts.length} · 经期 ${data.cycles.length}</small></div>${rows}</div>`);
    }
    window.dispatchEvent(new Event('health-imported'));
  }

  window.renderImportedHealth = renderImportedRecords;
  renderImportedRecords();

  const open = () => {
    content.innerHTML = `<h3>导入健康与运动数据</h3><p class="health-help">选择已生成的 <b>健康工作台_运动周期精简版.csv</b>。导入后会显示在「运动」和「计划日历」。</p><label class="health-picker">选择健康数据文件<input id="healthImportFile" type="file" accept="*/*"></label><p id="healthFileName" class="health-name">尚未选择文件</p><button id="healthImportBtn" class="save" type="button" disabled>导入并显示记录</button>`;
    if (!dialog.open) dialog.showModal();
    const fileInput = document.querySelector('#healthImportFile');
    const name = document.querySelector('#healthFileName');
    const button = document.querySelector('#healthImportBtn');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0]; name.textContent = file ? `已选择：${file.name}` : '尚未选择文件'; button.disabled = !file;
    });
    button.addEventListener('click', async () => {
      const file = fileInput.files[0]; if (!file) return;
      button.disabled = true; button.textContent = '正在导入记录…';
      try {
        if (!file.name.toLowerCase().endsWith('.csv')) throw new Error('csv-only');
        const data = parseCsv(await file.text());
        if (!data.workouts.length && !data.cycles.length) throw new Error('empty');
        localStorage.setItem('calmImportedHealth', JSON.stringify(data));
        localStorage.setItem('appleHealthImport', JSON.stringify({ importedAt:new Date().toISOString(), fileName:file.name, workouts:data.workouts.length, menstrual:data.cycles.length }));
        renderImportedRecords(); dialog.close();
        const toast = document.querySelector('#toast'); toast.textContent = `已导入并显示：${data.workouts.length} 条运动、${data.cycles.length} 条经期记录`;
        toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 4000);
      } catch (error) {
        button.disabled = false; button.textContent = '重新尝试导入';
        name.textContent = error.message === 'empty' ? '没有读到有效记录，请选择“健康工作台_运动周期精简版.csv”。' : '请选用已生成的 CSV 精简版文件。';
      }
    });
  };
  watch.addEventListener('click', event => { event.stopImmediatePropagation(); open(); }, true);
})();
