/* 支持 Apple 健康 export.zip / export.xml，以及常见运动 CSV 文件。 */
(() => {
  const watch = document.querySelector('[data-open="watch"]');
  if (!watch) return;
  const dialog = document.querySelector('#modal');
  const content = document.querySelector('#modalContent');

  function summarizeCsv(csv) {
    const rows = csv.trim().split(/\r?\n/).filter(Boolean);
    const body = rows.length > 1 ? rows.slice(1) : [];
    const normalized = csv.toLowerCase();
    return {
      workouts: body.length,
      swimming: (normalized.match(/游泳|swimming|swim/g) || []).length,
      menstrual: (normalized.match(/经期|月经|menstrual|period/g) || []).length
    };
  }

  const open = () => {
    content.innerHTML = `<h3>导入健康与运动数据</h3>
      <p class="health-help">可选择 Apple 健康导出的 <b>export.zip / export.xml</b>，也可直接选择你已有的 <b>CSV 表格</b>（运动或身体数据）。</p>
      <label class="health-picker">选择健康数据文件<input id="healthImportFile" type="file" accept=".zip,.xml,.csv,application/zip,text/xml,application/xml,text/csv"></label>
      <p id="healthFileName" class="health-name">尚未选择文件</p>
      <button id="healthImportBtn" class="save" type="button" disabled>导入到健康工作台</button>`;
    if (!dialog.open) dialog.showModal();

    const fileInput = document.querySelector('#healthImportFile');
    const name = document.querySelector('#healthFileName');
    const button = document.querySelector('#healthImportBtn');
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      name.textContent = file ? `已选择：${file.name}` : '尚未选择文件';
      button.disabled = !file;
    });

    button.addEventListener('click', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      button.disabled = true;
      button.textContent = '正在读取数据…';
      try {
        const lowerName = file.name.toLowerCase();
        let records;
        if (lowerName.endsWith('.csv')) {
          records = summarizeCsv(await file.text());
        } else {
          let xml = '';
          if (lowerName.endsWith('.zip')) {
            if (!window.JSZip) throw new Error('zip-reader-unavailable');
            const zip = await window.JSZip.loadAsync(file);
            const entry = Object.values(zip.files).find(item => /export\.xml$/i.test(item.name));
            if (!entry) throw new Error('xml-not-found');
            xml = await entry.async('text');
          } else if (lowerName.endsWith('.xml')) {
            xml = await file.text();
          } else {
            throw new Error('unsupported-file');
          }
          records = {
            workouts: (xml.match(/<Workout\b/g) || []).length,
            swimming: (xml.match(/HKWorkoutActivityTypeSwimming/g) || []).length,
            menstrual: (xml.match(/HKCategoryTypeIdentifierMenstrualFlow/g) || []).length
          };
        }
        localStorage.setItem('appleHealthImport', JSON.stringify({
          importedAt: new Date().toISOString(), fileName: file.name, ...records
        }));
        dialog.close();
        const toast = document.querySelector('#toast');
        toast.textContent = `读取完成：${records.workouts} 条记录（游泳 ${records.swimming} 条、周期 ${records.menstrual} 条）`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3600);
      } catch (error) {
        button.disabled = false;
        button.textContent = '重新尝试导入';
        name.textContent = error.message === 'xml-not-found'
          ? '文件中未找到 export.xml，请确认选择的是健康 App 导出包。'
          : '无法读取该文件，请选择 CSV、export.zip 或 export.xml。';
      }
    });
  };

  watch.addEventListener('click', event => {
    event.stopImmediatePropagation();
    open();
  }, true);
})();
