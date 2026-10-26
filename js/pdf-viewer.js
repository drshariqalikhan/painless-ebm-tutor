// Configure PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class PDFViewerController {
  constructor() {
    this.pdfDoc = null;
    this.pageNum = 1;
    this.scale = 1.2;
    this.canvas = document.getElementById('pdf-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.textLayerDiv = document.getElementById('pdf-text-layer');
    this.canvasWrapper = document.getElementById('pdf-canvas-wrapper');
    this.pageContainer = document.getElementById('pdf-page-container');

    this.bindControls();
  }

  bindControls() {
    document.getElementById('pdf-prev').addEventListener('click', () => this.changePage(-1));
    document.getElementById('pdf-next').addEventListener('click', () => this.changePage(1));
    document.getElementById('pdf-zoom-in').addEventListener('click', () => this.zoom(0.15));
    document.getElementById('pdf-zoom-out').addEventListener('click', () => this.zoom(-0.15));
  }

  async loadPDF(url) {
    document.getElementById('pdf-loading-overlay').style.display = 'block';
    this.pageContainer.style.display = 'none';

    try {
      this.pdfDoc = await pdfjsLib.getDocument(url).promise;
      document.getElementById('pdf-page-count').textContent = this.pdfDoc.numPages;
      document.getElementById('pdf-loading-overlay').style.display = 'none';
      this.pageContainer.style.display = 'block';
      this.pageNum = 1;
      await this.renderPage(this.pageNum);
    } catch (err) {
      console.error('Error loading PDF:', err);
      alert('Could not render PDF. Ensure CORS is enabled on Supabase storage.');
    }
  }

  async renderPage(num) {
    if (!this.pdfDoc) return;
    const page = await this.pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale: this.scale });

    this.canvas.height = viewport.height;
    this.canvas.width = viewport.width;

    const renderContext = {
      canvasContext: this.ctx,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    // Render Text Layer for search/selection
    this.textLayerDiv.innerHTML = '';
    this.textLayerDiv.style.height = `${viewport.height}px`;
    this.textLayerDiv.style.width = `${viewport.width}px`;

    const textContent = await page.getTextContent();
    pdfjsLib.renderTextLayer({
      textContent: textContent,
      container: this.textLayerDiv,
      viewport: viewport,
      textDivs: []
    });

    document.getElementById('pdf-page-num').textContent = num;
  }

  changePage(delta) {
    if (!this.pdfDoc) return;
    const newPage = this.pageNum + delta;
    if (newPage >= 1 && newPage <= this.pdfDoc.numPages) {
      this.pageNum = newPage;
      this.renderPage(this.pageNum);
    }
  }

  zoom(delta) {
    this.scale = Math.min(Math.max(0.7, this.scale + delta), 2.2);
    this.renderPage(this.pageNum);
  }

  // Jumps to page cited by AI Tutor and scrolls into view
  async jumpToPageAndHighlight(pageNumber, quote) {
    if (!this.pdfDoc || pageNumber < 1 || pageNumber > this.pdfDoc.numPages) return;
    this.pageNum = pageNumber;
    await this.renderPage(this.pageNum);
    this.canvasWrapper.scrollTop = 0;
  }
}

const pdfViewer = new PDFViewerController();