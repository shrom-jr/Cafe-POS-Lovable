export function triggerPrint(mode: 'receipt' | 'invoice') {
  document.body.setAttribute('data-print', mode);
  const cleanup = () => {
    document.body.removeAttribute('data-print');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => window.print(), 80);
}
