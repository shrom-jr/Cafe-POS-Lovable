// Module-level store — ThermalReceiptLayout registers the text on each render
let _receiptText: string | null = null;

export function setReceiptText(text: string) {
  _receiptText = text;
}

export function triggerPrint(_mode: 'receipt' | 'invoice') {
  if (_receiptText) {
    const safe = _receiptText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11pt;
      line-height: 1.45;
      color: #000000;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    pre {
      white-space: pre;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: #000000;
    }
    @page { margin: 4mm; size: auto; }
  </style>
</head>
<body><pre>${safe}</pre></body>
</html>`;

    const win = window.open('', '_blank', 'width=420,height=700,toolbar=0,scrollbars=0,menubar=0');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      // Give the popup a moment to fully render before printing
      setTimeout(() => {
        win.print();
        setTimeout(() => win.close(), 500);
      }, 350);
      return;
    }
  }

  // Fallback: original window.print() (used when popup is blocked or text not set)
  document.body.setAttribute('data-print', 'receipt');
  const cleanup = () => {
    document.body.removeAttribute('data-print');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => window.print(), 80);
}
