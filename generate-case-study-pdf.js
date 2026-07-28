const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

async function main() {
  const root = __dirname;
  const mdPath = path.join(root, 'CASE_STUDY_PANASONIC_MEA.md');
  const cssPath = path.join(root, 'case-study-pdf.css');
  const outPdf = path.join(root, 'CASE_STUDY_PANASONIC_MEA.pdf');
  const outHtml = path.join(root, 'CASE_STUDY_PANASONIC_MEA.print.html');

  let md = fs.readFileSync(mdPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  md = md.replace(
    /\.\/assets\/(login-screen|dashboard|switch-property|apartment-statement|apartments-list|reports-ledger|reports-monthly|expenses-list|expense-split|recurring-templates)\.png/g,
    './assets/pdf/$1.png'
  );

  const { marked } = require('marked');
  const puppeteer = require('puppeteer');

  let body = marked.parse(md);

  // Force each feature section (4.x) onto a new page
  body = body.replace(/<h3>4\.\d+[^<]*<\/h3>/g, (heading, index) => {
  const isFirst = heading.includes('4.1 ');
  return isFirst ? heading : `<div class="page-break"></div>${heading}`;
  });

  // Wrap screenshot images so they never split across pages
  body = body.replace(
    /<div class="screenshot-block"[^>]*>(<img[^>]+>)<\/div>/g,
    '<figure class="screenshot-figure">$1</figure>'
  );

  const extraCss = `
    .page-break { page-break-before: always; break-before: page; height: 0; margin: 0; }
    .screenshot-figure {
      page-break-inside: avoid !important;
      break-inside: avoid-page !important;
      text-align: center;
      margin: 12px auto 16px;
      padding: 0;
    }
    .screenshot-figure img {
      display: block;
      max-width: 36% !important;
      max-height: 220px !important;
      width: auto !important;
      height: auto !important;
      margin: 0 auto !important;
      object-fit: contain;
      page-break-inside: avoid !important;
      break-inside: avoid-page !important;
    }
    h3 { page-break-after: avoid; break-after: avoid; margin-top: 0; }
  `;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Case Study - Villa Manager Pro</title>
  <style>${css}${extraCss}</style>
</head>
<body>${body}</body>
</html>`;

  fs.writeFileSync(outHtml, html);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto(pathToFileURL(outHtml).href, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outPdf,
    format: 'A4',
    printBackground: true,
    margin: { top: '18mm', bottom: '20mm', left: '14mm', right: '14mm' },
    preferCSSPageSize: true,
  });

  await browser.close();
  console.log('PDF generated:', outPdf);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
