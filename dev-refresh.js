// Local preview convenience: reload when authored page files change.
if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
  const watchedFiles = ['index.html', 'styles.css', 'app.js'];
  let snapshot = null;
  let checking = false;

  async function readSnapshot() {
    const contents = await Promise.all(watchedFiles.map(async file => {
      const response = await fetch(`${file}?preview=${Date.now()}`, { cache: 'no-store' });
      return response.ok ? response.text() : '';
    }));
    return contents.join('\n---preview-file---\n');
  }

  async function checkForChanges() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const next = await readSnapshot();
      if (snapshot !== null && next !== snapshot) location.reload();
      snapshot = next;
    } catch {
      // The preview server may be restarting; try again on the next interval.
    } finally {
      checking = false;
    }
  }

  void checkForChanges();
  setInterval(checkForChanges, 1500);
}
