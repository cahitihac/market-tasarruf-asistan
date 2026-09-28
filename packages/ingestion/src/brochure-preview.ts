import { prisma } from '@market/database';

function svgPreview(filename: string, pageNumber: number, mediaType: string) {
  const escaped = filename.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <rect width="900" height="1200" fill="#fbfbf9"/>
    <rect x="48" y="48" width="804" height="1104" fill="#fff" stroke="#aab7b0" stroke-width="3"/>
    <text x="90" y="140" font-family="Arial, sans-serif" font-size="42" fill="#202523">Brochure page preview</text>
    <text x="90" y="215" font-family="Arial, sans-serif" font-size="28" fill="#68716d">${escaped}</text>
    <text x="90" y="270" font-family="Arial, sans-serif" font-size="28" fill="#68716d">Page ${pageNumber}</text>
    <text x="90" y="325" font-family="Arial, sans-serif" font-size="22" fill="#68716d">${mediaType}</text>
    <text x="90" y="1060" font-family="Arial, sans-serif" font-size="20" fill="#68716d">No extraction bounding boxes are available.</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function ensureBrochurePagePreviews(brochureId: string) {
  const brochure = await prisma.brochure.findUniqueOrThrow({ where: { id: brochureId },
    include: { pages: { orderBy: { pageNumber: 'asc' } } } });
  let created = 0;
  let skipped = 0;
  for (const page of brochure.pages) {
    if (page.imageRef && page.previewGeneratedAt && page.contentHash) {
      skipped++;
      continue;
    }
    await prisma.brochurePage.update({ where: { id: page.id }, data: {
      imageRef: svgPreview(brochure.originalFilename ?? brochure.sourceIdentifier, page.pageNumber, brochure.mediaType),
      previewFormat: 'svg',
      previewWidth: 900,
      previewHeight: 1200,
      previewGeneratedAt: new Date(),
      rawMetadata: { ...(page.rawMetadata as Record<string, unknown>), previewRenderer: 'phase11-svg-local' },
    } });
    created++;
  }
  return { brochureId, created, skipped };
}
