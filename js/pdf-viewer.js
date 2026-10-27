// Configure official Mozilla PDF.js Worker via CDN
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

  // Load PDF from a public URL or local object URL
  async loadPDF(url) {
    document.getElementById('pdf-loading-overlay').style.display = 'block';
    this.pageContainer.style.display = 'none';

    try {
      const loadingTask = pdfjsLib.getDocument(url);
      this.pdfDoc = await loadingTask.promise;

      document.getElementById('pdf-page-count').textContent = this.pdfDoc.numPages;
      document.getElementById('pdf-loading-overlay').style.display = 'none';
      this.pageContainer.style.display = 'block';

      this.pageNum = 1;
      await this.renderPage(this.pageNum);
    } catch (err) {
      console.error('Error loading PDF document:', err);
      alert('Could not render PDF. Ensure CORS rules allow fetching this document.');
    }
  }

  // Render specific page with mobile auto-scaling
  async renderPage(num) {
    if (!this.pdfDoc) return;

    const page = await this.pdfDoc.getPage(num);

    // Dynamic Mobile Optimization: Fit-to-width on small screens (<= 768px)
    let currentScale = this.scale;
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    
    if (window.innerWidth <= 768) {
      // Account for padding wrapper (~30px total)
      const availableWidth = window.innerWidth - 30;
      currentScale = availableWidth / unscaledViewport.width;
    }

    const viewport = page.getViewport({ scale: currentScale });

    this.canvas.height = viewport.height;
    this.canvas.width = viewport.width;

    const renderContext = {
      canvasContext: this.ctx,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    // Build PDF text layer for text selection & highlighting
    if (this.textLayerDiv) {
      this.textLayerDiv.innerHTML = '';
      this.textLayerDiv.style.height = `${viewport.height}px`;
      this.textLayerDiv.style.width = `${viewport.width}px`;

      try {
        const textContent = await page.getTextContent();
        pdfjsLib.renderTextLayer({
          textContent: textContent,
          container: this.textLayerDiv,
          viewport: viewport,
          textDivs: []
        });
      } catch (textErr) {
        console.warn('Text layer rendering skipped:', textErr);
      }
    }

    document.getElementById('pdf-page-num').textContent = num;
  }

  changePage(delta) {
    if (!this.pdfDoc) return;
    const newPage = this.pageNum + delta;
    if (newPage >= 1 && newPage <= this.pdfDoc.numPages) {
      this.pageNum = newPage;
      this.renderPage(this.pageNum);
      this.canvasWrapper.scrollTop = 0;
    }
  }

  zoom(delta) {
    if (window.innerWidth <= 768) return; // Lock fixed fit-to-width on mobile
    this.scale = Math.min(Math.max(0.7, this.scale + delta), 2.2);
    this.renderPage(this.pageNum);
  }

  // Bridge Method: Jump to cited page and highlight matching text
  async jumpToPageAndHighlight(pageNumber, quote) {
    if (!this.pdfDoc) return;
    
    if (pageNumber >= 1 && pageNumber <= this.pdfDoc.numPages) {
      this.pageNum = pageNumber;
      await this.renderPage(this.pageNum);
      this.canvasWrapper.scrollTop = 0;
    }

    // Attempt to highlight text in the rendered text layer
    if (quote && this.textLayerDiv) {
      setTimeout(() => {
        const query = quote.toLowerCase().trim().substring(0, 30); // match first 30 chars
        const textSpans = this.textLayerDiv.querySelectorAll('span');
        
        let foundFirst = false;
        textSpans.forEach(span => {
          const text = span.textContent.toLowerCase();
          if (text.includes(query) || query.includes(text)) {
            span.classList.add('highlight');
            if (!foundFirst) {
              span.scrollIntoView({ behavior: 'smooth', block: 'center' });
              foundFirst = true;
            }
          }
        });
      }, 400); // 400ms delay to allow text layer DOM paint
    }
  }
}

const pdfViewer = new PDFViewerController();