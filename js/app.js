class EbmTutorApp {
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.currentSession = null;
    this.activeStep = 0;
    this.libraryPapers = [];
    this.selectedPill = null;
    this.activeModel = 'Gemini 3.5 Flash-Lite';
    this.coinBalance = 50;
    this.currentCategories = [
      { id: 1, name: 'Drug Treatments & Simple Interventions', std: 'CONSORT / Dans' },
      { id: 2, name: 'Complex Interventions', std: 'MRC Framework' },
      { id: 3, name: 'Diagnostic & Screening Tests', std: 'STARD / QUADAS-2' },
      { id: 4, name: 'Systematic Reviews & Meta-Analyses', std: 'PRISMA / AMSTAR-2' },
      { id: 5, name: 'Clinical Practice Guidelines', std: 'AGREE II' },
      { id: 6, name: 'Economic Analyses (Costs & QALYs)', std: 'CHEERS Checklist' },
      { id: 7, name: 'Qualitative Research', std: 'CASP / COREQ' },
      { id: 8, name: 'Questionnaire & Survey Research', std: 'CROSS / CHERRIES' },
      { id: 9, name: 'Quality Improvement (QI) Case Studies', std: 'SQUIRE 2.0' }
    ];
    this.pendingUploadFile = null;

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
    await this.fetchWalletBalance();
    await this.loadPracticeLibrary();

    // Bind custom PDF upload input
    const fileInput = document.getElementById('pdf-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleCustomFileUpload(e));
    }
  }

  // ================= WALLET & COIN MANAGEMENT =================
  async fetchWalletBalance() {
    try {
      const { data } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
        body: { action: 'get_wallet', device_id: this.deviceId }
      });
      if (data && data.balance !== undefined) {
        this.updateCoinDisplay(data.balance);
      }
    } catch (e) {
      console.warn('Could not fetch wallet balance:', e);
    }
  }

  updateCoinDisplay(newBalance) {
    this.coinBalance = newBalance;
    const badge = document.getElementById('user-coin-balance');
    if (badge) badge.textContent = newBalance;
  }

  openBuyCoinsModal() {
    document.getElementById('modal-buy-coins').classList.add('is-active');
  }

  closeBuyCoinsModal() {
    document.getElementById('modal-buy-coins').classList.remove('is-active');
  }

  simulatePurchase(amount, price) {
    alert(`Stripe integration placeholder:\nSuccessfully purchased ${amount} coins for ${price}!`);
    this.updateCoinDisplay(this.coinBalance + amount);
    this.closeBuyCoinsModal();
  }

  // ================= PRACTICE LIBRARY =================
  async loadPracticeLibrary() {
    try {
      const { data } = await supabaseClient.from('practice_library').select('*');
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
          <span class="tag is-info is-light is-small mb-1">${(p.category_name || p.specialty).toUpperCase()}</span>
          <span class="tag is-dark is-small mb-1">${p.difficulty}</span>
          <h4 class="has-text-white is-size-6 has-text-weight-bold mb-1">${p.title}</h4>
          <p class="has-text-grey is-size-7 mb-2">${p.citation}</p>
          <button class="button is-small is-info is-fullwidth mt-3" onclick="app.startLibraryPaperAppraisal('${p.id}')">
            Appraise This Paper (Free 🪙)
          </button>
        </div>
      </div>
    `).join('');
  }

  closeLibraryModal() {
    document.getElementById('modal-library').classList.remove('is-active');
  }

  async startLibraryPaperAppraisal(paperId) {
    const paper = this.libraryPapers.find(p => p.id === paperId);
    if (!paper) return;

    this.closeLibraryModal();
    document.getElementById('active-paper-badge').textContent = paper.title;

    const { data } = supabaseClient.storage.from('study-papers').getPublicUrl(paper.pdf_storage_path);
    await pdfViewer.loadPDF(data.publicUrl);

    await this.initSessionOnBackend(paper.id, null, paper.title, paper.category_id || 1);
  }

  // ================= CUSTOM PDF UPLOAD & COIN GATE =================
  async handleCustomFileUpload(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a valid PDF file.');
      return;
    }

    // Check 50-coin custom upload fee
    if (this.coinBalance < 50) {
      this.openBuyCoinsModal();
      alert('You need 50 EBM Coins to upload and appraise a custom research paper. Practice Library papers remain completely free!');
      event.target.value = ''; // reset file input
      return;
    }

    this.pendingUploadFile = file;
    const title = file.name.replace(/\.pdf$/i, '');
    document.getElementById('active-paper-badge').textContent = title;

    // Deduct coins via Edge Function / RPC
    try {
      const { data } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
        body: { action: 'deduct_coins_for_upload', device_id: this.deviceId }
      });

      if (!data || !data.success) {
        alert('Insufficient EBM Coins for custom upload.');
        this.openBuyCoinsModal();
        return;
      }

      this.updateCoinDisplay(data.balance);
    } catch (err) {
      alert('Coin transaction failed. Please check network.');
      return;
    }

    // Render local file in PDF.js
    const fileUrl = URL.createObjectURL(file);
    await pdfViewer.loadPDF(fileUrl);

    // Trigger AI Classification Modal
    this.openClassificationModal(title);
    event.target.value = '';
  }

  // ================= SOCRATIC CLASSIFICATION DEBATE =================
  openClassificationModal(paperTitle) {
    const modal = document.getElementById('modal-classification');
    const grid = document.getElementById('category-selection-grid');
    
    // Simulate AI pre-scan inference (e.g. category 1 for therapy RCT)
    const inferredId = 1; 
    const rec = this.currentCategories.find(c => c.id === inferredId);
    document.getElementById('suggested-category-name').textContent = `${rec.id}. ${rec.name} (${rec.std})`;

    grid.innerHTML = this.currentCategories.map(cat => `
      <button class="button is-dark is-small mb-2 mr-2" style="justify-content: flex-start; height: auto; padding: 8px 12px;" onclick="app.selectCategoryAndStart(${cat.id}, '${paperTitle}')">
        <span class="has-text-info mr-2"><b>[${cat.id}]</b></span> 
        <span class="has-text-white">${cat.name}</span> &nbsp;<span class="has-text-grey">(${cat.std})</span>
      </button>
    `).join('');

    modal.classList.add('is-active');
  }

  async selectCategoryAndStart(categoryId, title) {
    document.getElementById('modal-classification').classList.remove('is-active');
    await this.initSessionOnBackend(null, null, title, categoryId);
  }

  // Backend Session Initializer
  async initSessionOnBackend(paperId, customPdfUrl, title, categoryId) {
    const btn = document.getElementById('btn-send');
    if (btn) btn.classList.add('is-loading');

    try {
      const { data: res } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
        body: {
          action: 'start_session',
          participant_id: null, // Tester mode
          paper_id: paperId,
          custom_pdf_url: customPdfUrl,
          paper_title: title,
          category_id: categoryId,
          device_id: this.deviceId
        }
      });

      if (res && res.session) {
        this.currentSession = res.session;
        this.activeStep = 0;
        this.updateChecklistUI(0, res.framework_name || 'Study Design & Directness', res.checklist);

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

  // ================= CHAT TURN & SOCRATIC DIALOGUE =================
  addMessageToChat(sender, text, evidence = null, modelUsed = null) {
    const messagesDiv = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;

    let headerHtml = '';
    if (sender === 'tutor') {
      const displayModel = modelUsed || this.activeModel || 'Gemini 3.5 Flash-Lite';
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
          <button class="button is-small is-info is-outlined is-rounded mt-2" onclick="app.jumpToEvidence(${evidence.page || 1}, '${evidence.quote.replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-location-crosshairs mr-1"></i> View on Page ${evidence.page || 1}
          </button>
        </div>
      `;
    }

    bubble.innerHTML = `${headerHtml}<div>${text.replace(/\n/g, '<br>')}</div>${evidenceHtml}`;
    messagesDiv.appendChild(bubble);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  jumpToEvidence(page, quote) {
    // Context-aware auto-switching for mobile devices
    if (window.innerWidth <= 768) {
      this.switchMobileView('pdf');
    } else {
      this.switchLeftTab('pdf');
    }
    pdfViewer.jumpToPageAndHighlight(page, quote);
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
          selected_pill: this.selectedPill,
          device_id: this.deviceId
        }
      });

      this.selectedPill = null;
      btn.classList.remove('is-loading');

      if (data && data.success === false && data.error === 'insufficient_coins') {
        this.openBuyCoinsModal();
        alert('You have run out of EBM Coins! Please top up to continue your chat session.');
        return;
      }

      if (data && data.balance !== undefined) {
        this.updateCoinDisplay(data.balance);
      }

      if (data && data.tutor_response) {
        if (data.model_used) {
          this.activeModel = data.model_used;
        }

        this.addMessageToChat('tutor', data.tutor_response, data.evidence, data.model_used);
        this.updateChecklistUI(data.current_step, data.step_title);

        if (data.is_completed) {
          this.showCompetencyScorecard(data.competency_badge);
        }
      }
    } catch (err) {
      btn.classList.remove('is-loading');
      this.addMessageToChat('tutor', 'Network connection issue. Please retry.');
    }
  }

  // ================= UI TAB & VIEW CONTROLLERS =================
  switchLeftTab(tab) {
    document.querySelectorAll('#left-pane-tabs li').forEach(li => li.classList.remove('is-active'));
    document.getElementById(`left-tab-${tab}`).classList.add('is-active');

    if (tab === 'pdf') {
      document.getElementById('tab-content-pdf').style.display = 'flex';
      document.getElementById('tab-content-framework').style.display = 'none';
    } else {
      document.getElementById('tab-content-pdf').style.display = 'none';
      document.getElementById('tab-content-framework').style.display = 'block';
    }
  }

  switchMobileView(view) {
    document.querySelectorAll('#mobile-tabs li').forEach(li => li.classList.remove('is-active'));
    document.getElementById(`tab-btn-${view}`).classList.add('is-active');

    const pdfPane = document.getElementById('pdf-pane');
    const chatPane = document.getElementById('chat-pane');

    if (view === 'pdf') {
      pdfPane.classList.remove('is-hidden-mobile');
      chatPane.classList.add('is-hidden-mobile');
      this.switchLeftTab('pdf');
    } else if (view === 'framework') {
      pdfPane.classList.remove('is-hidden-mobile');
      chatPane.classList.add('is-hidden-mobile');
      this.switchLeftTab('framework');
    } else {
      chatPane.classList.remove('is-hidden-mobile');
      pdfPane.classList.add('is-hidden-mobile');
    }
  }

  updateChecklistUI(stepIndex, titleOverride = null, checklist = null) {
    document.getElementById('step-badge').textContent = `Step ${stepIndex} / 7`;
    if (titleOverride) {
      document.getElementById('step-title').textContent = titleOverride;
    }
    document.getElementById('checklist-progress').value = stepIndex;

    // Render interactive framework checklist tab list
    const stepsList = document.getElementById('framework-steps-list');
    if (!stepsList) return;

    const steps = checklist || [
      { index: 0, title: 'Study Design & Directness' },
      { index: 1, title: 'Random Assignment' },
      { index: 2, title: 'Allocation Concealment' },
      { index: 3, title: 'Baseline Characteristics' },
      { index: 4, title: 'Blinding (Masking)' },
      { index: 5, title: 'Intention-to-Treat & Follow-up' },
      { index: 6, title: 'Results Magnitude & Precision' },
      { index: 7, title: 'Applicability & Final Score' }
    ];

    stepsList.innerHTML = steps.map(s => {
      let statusClass = 'is-pending-step';
      let icon = '<i class="fa-regular fa-circle mr-2 has-text-grey"></i>';
      if (s.index < stepIndex) {
        statusClass = 'is-completed-step';
        icon = '<i class="fa-solid fa-circle-check mr-2 has-text-success"></i>';
      } else if (s.index === stepIndex) {
        statusClass = 'is-active-step';
        icon = '<i class="fa-solid fa-circle-play mr-2 has-text-info fa-beat"></i>';
      }

      return `
        <div class="framework-step-card ${statusClass}">
          <div class="is-flex is-align-items-center">
            ${icon}
            <span class="has-text-weight-bold has-text-white is-size-7">Step ${s.index}: ${s.title}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  showCompetencyScorecard(badge) {
    document.getElementById('badge-title').textContent = badge || 'Methodology Detective';
    document.getElementById('modal-scorecard').classList.add('is-active');
  }
}

const app = new EbmTutorApp();