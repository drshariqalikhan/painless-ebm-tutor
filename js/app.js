class EbmTutorApp {
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.currentSession = null;
    this.activeStep = 0;
    this.libraryPapers = [];
    this.selectedPill = null;
    this.activeModel = 'Gemini 3.5 Flash-Lite';

    this.init();
  }

  getOrCreateDeviceId() {
    let id = localStorage.getItem('ebm_device_id');
    if (!id) {
      id = 'dev_' + Date.now() + '_' + Math.floor(Math.random() * 999999);
      localStorage.setItem('ebm_device_id', id);
    }
    return id;
  }

  async init() {
    await initAppConfig();
    await this.loadPracticeLibrary();

    // Bind local PDF file upload
    const fileInput = document.getElementById('pdf-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleCustomFileUpload(e));
    }
  }

  // 1. Practice Library Handling
  async loadPracticeLibrary() {
    try {
      const { data, error } = await supabaseClient.from('practice_library').select('*');
      this.libraryPapers = data || [];
      this.renderLibrary(this.libraryPapers);

      const btnOpen = document.getElementById('btn-open-library');
      if (btnOpen) {
        btnOpen.addEventListener('click', () => {
          document.getElementById('modal-library').classList.add('is-active');
        });
      }
    } catch (e) {
      console.warn('Could not load library from Supabase:', e);
    }
  }

  filterLibrary(specialty) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('is-active', 'is-info'));
    if (window.event && window.event.target) {
      window.event.target.classList.add('is-active', 'is-info');
    }

    if (specialty === 'all') {
      this.renderLibrary(this.libraryPapers);
    } else {
      const filtered = this.libraryPapers.filter(p => p.specialty === specialty);
      this.renderLibrary(filtered);
    }
  }

  renderLibrary(papers) {
    const list = document.getElementById('library-list');
    if (!list) return;

    if (papers.length === 0) {
      list.innerHTML = `<div class="column is-12 has-text-centered has-text-grey py-5">No papers currently in this section. Upload your own PDF to start.</div>`;
      return;
    }

    list.innerHTML = papers.map(p => `
      <div class="column is-6">
        <div class="box has-background-dark p-4">
          <span class="tag is-info is-light is-small mb-1">${p.specialty.toUpperCase()}</span>
          <span class="tag is-dark is-small mb-1">${p.difficulty}</span>
          <h4 class="has-text-white is-size-6 has-text-weight-bold mb-1">${p.title}</h4>
          <p class="has-text-grey is-size-7 mb-2">${p.citation}</p>
          <p class="has-text-warning is-size-7 mb-3">
            <i class="fa-solid fa-bullseye mr-1"></i>Focus: ${p.pedagogical_focus}
          </p>
          <button class="button is-small is-info is-fullwidth" onclick="app.startPaperAppraisal('${p.id}')">
            Appraise This Paper
          </button>
        </div>
      </div>
    `).join('');
  }

  closeLibraryModal() {
    document.getElementById('modal-library').classList.remove('is-active');
  }

  // 2. Start Appraisal on a Library Paper
  async startPaperAppraisal(paperId) {
    const paper = this.libraryPapers.find(p => p.id === paperId);
    if (!paper) return;

    this.closeLibraryModal();
    document.getElementById('active-paper-badge').textContent = paper.title;

    // Get public URL from Supabase Storage
    const { data } = supabaseClient.storage.from('study-papers').getPublicUrl(paper.pdf_storage_path);
    await pdfViewer.loadPDF(data.publicUrl);

    await this.initSessionOnBackend(paper.id, null, paper.title);
  }

  // 3. User Uploads Their Own PDF
  async handleCustomFileUpload(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a valid PDF file.');
      return;
    }

    const title = file.name.replace(/\.pdf$/i, '');
    document.getElementById('active-paper-badge').textContent = title;

    // Render local file directly in PDF.js via object URL
    const fileUrl = URL.createObjectURL(file);
    await pdfViewer.loadPDF(fileUrl);

    await this.initSessionOnBackend(null, null, title);
  }

  // Backend Session Initializer
  async initSessionOnBackend(paperId, customPdfUrl, title) {
    const btn = document.getElementById('btn-send');
    if (btn) btn.classList.add('is-loading');

    try {
      const { data: res } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
        body: {
          action: 'start_session',
          participant_id: null, // Tester/Dev mode
          paper_id: paperId,
          custom_pdf_url: customPdfUrl,
          paper_title: title
        }
      });

      if (res && res.session) {
        this.currentSession = res.session;
        this.activeStep = 0;
        this.updateChecklistUI(0, 'Study Design & Directness');

        if (res.model_used) {
          this.activeModel = res.model_used;
        }

        const messagesDiv = document.getElementById('chat-messages');
        messagesDiv.innerHTML = '';
        this.addMessageToChat('tutor', res.opening_message, null, this.activeModel);
      }
    } catch (err) {
      console.error('Error starting session:', err);
    } finally {
      if (btn) btn.classList.remove('is-loading');
    }
  }

  // 4. Chat Bubble Rendering with Active Model Stamping
  addMessageToChat(sender, text, evidence = null, modelUsed = null) {
    const messagesDiv = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;

    let headerHtml = '';
    if (sender === 'tutor') {
      const displayModel = modelUsed || this.activeModel || 'Gemini 3.5 Flash-Lite';
      
      // Update the global header badge
      const modelLabelEl = document.getElementById('active-model-name');
      if (modelLabelEl) modelLabelEl.textContent = displayModel;

      headerHtml = `
        <div class="is-flex is-justify-content-space-between is-align-items-center mb-1">
          <span class="is-size-7 has-text-weight-bold has-text-info">
            <i class="fa-solid fa-user-doctor mr-1"></i>AI Attending Tutor
          </span>
          <span class="tag is-black is-rounded" style="font-size: 0.65rem; opacity: 0.85;">
            <i class="fa-solid fa-microchip mr-1"></i>${displayModel}
          </span>
        </div>
      `;
    }

    let evidenceHtml = '';
    if (evidence && evidence.quote) {
      evidenceHtml = `
        <div class="evidence-card mt-2">
          <p class="is-size-7 has-text-info has-text-weight-bold">
            <i class="fa-solid fa-quote-left mr-1"></i> Evidence (Page ${evidence.page || 'Doc'}):
          </p>
          <p class="is-size-7 has-text-white-ter is-italic mt-1">"${evidence.quote}"</p>
          <button class="button is-small is-info is-outlined is-rounded mt-2" onclick="pdfViewer.jumpToPageAndHighlight(${evidence.page || 1}, '${evidence.quote.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-location-crosshairs mr-1"></i> View on Page ${evidence.page || 1}
          </button>
        </div>
      `;
    }

    bubble.innerHTML = `${headerHtml}<div>${text.replace(/\n/g, '<br>')}</div>${evidenceHtml}`;
    messagesDiv.appendChild(bubble);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  selectPill(pillText) {
    this.selectedPill = pillText;
    const input = document.getElementById('chat-input');
    input.value = `[${pillText}] `;
    input.focus();
  }

  async handleStudentSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !this.currentSession) return;

    input.value = '';
    this.addMessageToChat('student', text);

    const btn = document.getElementById('btn-send');
    btn.classList.add('is-loading');

    try {
      const { data } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
        body: {
          action: 'chat_turn',
          session_id: this.currentSession.id,
          student_message: text,
          selected_pill: this.selectedPill
        }
      });

      this.selectedPill = null;
      btn.classList.remove('is-loading');

      if (data && data.tutor_response) {
        if (data.model_used) {
          this.activeModel = data.model_used;
        }

        this.addMessageToChat('tutor', data.tutor_response, data.evidence, data.model_used);
        this.updateChecklistUI(data.current_step);

        if (data.is_completed) {
          this.showCompetencyScorecard(data.competency_badge);
        }
      }
    } catch (err) {
      btn.classList.remove('is-loading');
      this.addMessageToChat('tutor', 'Network connection issue. Please retry.');
    }
  }

  updateChecklistUI(stepIndex, titleOverride = null) {
    const titles = [
      'Study Design & Directness',
      'Random Assignment',
      'Allocation Concealment',
      'Baseline Characteristics',
      'Blinding',
      'Intention-to-Treat & Dropouts',
      'Results Magnitude (RRR/NNT)',
      'Applicability & Score'
    ];

    document.getElementById('step-badge').textContent = `Step ${stepIndex} / 7`;
    document.getElementById('step-title').textContent = titleOverride || titles[stepIndex] || 'In Progress';
    document.getElementById('checklist-progress').value = stepIndex;
  }

  showCompetencyScorecard(badge) {
    document.getElementById('badge-title').textContent = badge || 'Methodology Detective';
    document.getElementById('modal-scorecard').classList.add('is-active');
  }

  switchMobileView(view) {
    document.querySelectorAll('#mobile-tabs li').forEach(li => li.classList.remove('is-active'));
    document.getElementById(`tab-btn-${view}`).classList.add('is-active');

    if (view === 'pdf') {
      document.getElementById('pdf-pane').classList.remove('is-hidden-mobile');
      document.getElementById('chat-pane').classList.add('is-hidden-mobile');
    } else {
      document.getElementById('chat-pane').classList.remove('is-hidden-mobile');
      document.getElementById('pdf-pane').classList.add('is-hidden-mobile');
    }
  }
}

const app = new EbmTutorApp();