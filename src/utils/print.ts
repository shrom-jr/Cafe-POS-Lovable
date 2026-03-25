// Module-level store — ThermalReceiptLayout registers the text on each render
let _receiptText: string | null = null;

export function setReceiptText(text: string) {
  _receiptText = text;
}

export function isReceiptTextReady(): boolean {
  return !!_receiptText;
}

export function triggerPrint(_mode: 'receipt' | 'invoice') {
  console.log('PRINT VERSION: TEXT_V2');

  if (!_receiptText) {
    console.warn('triggerPrint: no receipt text available yet');
    return;
  }

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

  if (!win) {
    alert('Please allow popups to print receipt');
    window.dispatchEvent(new Event('print-blocked'));
    return;
  }

  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    setTimeout(() => win.close(), 500);
  }, 350);
}
