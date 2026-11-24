(() => {
  const url = document.querySelector('meta[name="socket-url"]')?.content;
  if (!window.io || !url) return;
  window.lonjaSocket = io(url, {
    auth: async callback => {
      try {
        const res = await fetch('/proxy/socket-ticket');
        callback(res.ok ? await res.json() : {});
      } catch {
        callback({});
      }
    },
  });
})();
