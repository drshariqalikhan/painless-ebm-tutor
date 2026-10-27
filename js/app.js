class EbmTutorApp {
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.currentSession = null;
    this.activeStep = 0;
    this.libraryPapers = [];
    this.selectedPill = null;
    this.activeModel = 'Gemini 3.5 Flash-Lite';
    this.coinBalance = 0;
    this.logCount = 0;
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

  // ================= LIVE DEBUG LOGGER =================
  logEvent(category, message, type = 'info') {
    this.logCount++;
    const badge = document.getElementById('log-badge');
    if (badge) badge.textContent = this.logCount;

    const entries = document.getElementById('log-entries');
    if (!entries) return;

    const time = new Date().toISOString().split('T')[1].slice(0, 8);
    let colorClass = 'has-text-info';
    if (type === 'success') colorClass = 'has-text-success';
    if (type === 'warning') colorClass = 'has-text-warning';
    if (type === 'error') colorClass = 'has-text-danger has-text-weight-bold';

    const row = document.createElement('div');
    row.className = `${colorClass} mb-1`;
    row.innerHTML = `[${time}] [${category}] ${message}`;
    entries.appendChild(row);
    entries.scrollTop = entries.scrollHeight;

    if (type === 'error') console.error(`[${category}] ${message}`);
    else console.log(`[${category}] ${message}`);
  }

  toggleLogDrawer() {
    const drawer = document.getElementById('debug-drawer');
    if (drawer) {
      drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
    }
  }

  clearLogs() {
    const entries = document.getElementById('log-entries');
    if (entries) entries.innerHTML = '';
    this.logCount = 0;
    const badge = document.getElementById('log-badge');
    if (badge) badge.textContent = '0';
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
    this.logEvent('App', `Initializing application runtime. Device ID: ${this.deviceId}`);
    await initAppConfig();
    await this.fetchWalletBalance();
    await this.loadPracticeLibrary();

    const fileInput = document.getElementById('pdf-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleCustomFileUpload(e));
    }
  }

  // ================= WALLET & COIN MANAGEMENT =================
  async fetchWalletBalance() {
    this.logEvent('Wallet', `Querying coin balance for device: ${this.deviceId}`);
    try {
      const { data, error } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
        body: { action: 'get_wallet', device_id: this.deviceId }
      });
      if (error) throw error;

      if (data && data.balance !== undefined) {
        this.updateCoinDisplay(data.balance);
        this.logEvent('Wallet', `Wallet verified. Current balance: ${data.balance} 🪙`, 'success');
      }
    } catch (e) {
      this.logEvent('Wallet', `Failed to fetch wallet balance: ${e.message}`, 'error');
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

  // FIXED: Sync simulated purchase to Supabase DB so Edge Function sees it!
  async simulatePurchase(amount, price) {
    alert(`Stripe integration placeholder:\nSuccessfully purchased ${amount} coins for ${price}!`);
    const newBalance = this.coinBalance + amount;
    this.updateCoinDisplay(newBalance);
    this.closeBuyCoinsModal();
    this.logEvent('Wallet', `User simulated purchasing ${amount} coins. Syncing to DB...`);

    try {
      const { error } = await supabaseClient
        .from('user_wallets')
        .update({ coin_balance: newBalance })
        .eq('device_id', this.deviceId);
        
      if (error) throw error;
      this.logEvent('Wallet', `Successfully synced new balance (${newBalance}) to database.`, 'success');
    } catch (e) {
      this.logEvent('Wallet', `Failed to sync database balance: ${e.message}`, 'error');
    }
  }

  // ================= PRACTICE LIBRARY =================
  async loadPracticeLibrary() {
    this.logEvent('Library', 'Fetching practice papers from Supabase database...');
    try {
      const { data, error } = await supabaseClient.from('practice_library').select('*');
      if (error) throw error;

      this.libraryPapers = data || [];
      this.renderLibrary(this.libraryPapers);
      this.logEvent('Library', `Successfully loaded ${this.libraryPapers.length} practice papers.`, 'success');

      const btnOpen = document.getElementById('btn-open-library');
      if (btnOpen) {
        btnOpen.addEventListener('click', () => {
          document.getElementById('modal-library').classList.add('is-active');
          this.logEvent('UI', 'Opened Practice Library modal.');
        });
      }
    } catch (e) {
      this.logEvent('Library', `Error loading practice library: ${e.message}`, 'error');
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
          <p class="has-text-warning is-size-7 mb-3">
            <i class="fa-solid fa-bullseye mr-1"></i>Focus: ${p.pedagogical_focus}
          </p>
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
    this.logEvent('Appraisal', `Selected library paper: "${paper.title}"`);

    const { data } = supabaseClient.storage.from('study-papers').getPublicUrl(paper.pdf_storage_path);
    this.logEvent('PDF', `Loading PDF stream from storage URL: ${data.publicUrl}`);
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

    this.logEvent('Upload', `User selected custom PDF file: ${file.name} (${Math.round(file.size/1024)} KB)`);

    if (this.coinBalance < 50) {
      this.openBuyCoinsModal();
      this.logEvent('Wallet', 'Upload rejected: Insufficient coin balance (< 50 coins).', 'warning');
      alert('You need 50 EBM Coins to upload and appraise a custom research paper. Practice Library papers remain completely free!');
      event.target.value = ''; // reset file input
      return;
    }

    this.pendingUploadFile = file;
    const title = file.name.replace(/\.pdf$/i, '');
    document.getElementById('active-paper-badge').textContent = title;

    try {
      this.logEvent('Wallet', 'Invoking Edge Function to deduct 50 coins for upload...');
      const { data, error } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
        body: { action: 'deduct_coins_for_upload', device_id: this.deviceId }
      });
      if (error) throw error;

      if (!data || !data.success) {
        throw new Error(data?.error || 'Coin deduction rejected.');
      }

      this.updateCoinDisplay(data.balance);
      this.logEvent('Wallet', `Deducted 50 coins successfully. Remaining balance: ${data.balance} 🪙`, 'success');
    } catch (err) {
      this.logEvent('Wallet', `Custom upload coin transaction failed: ${err.message}`, 'error');
      alert('Coin transaction failed.');
      event.target.value = '';
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    await pdfViewer.loadPDF(fileUrl);

    this.openClassificationModal(title);
    event.target.value = '';
  }

  // ================= SOCRATIC CLASSIFICATION DEBATE =================
  openClassificationModal(paperTitle) {
    const modal = document.getElementById('modal-classification');
    const grid = document.getElementById('category-selection-grid');
    
    const inferredId = 1; 
    const rec = this.currentCategories.find(c => c.id === inferredId);
    document.getElementById('suggested-category-name').textContent = `${rec.id}. ${rec.name} (${rec.std})`;

    grid.innerHTML = this.currentCategories.map(cat => `
      <button class="button is-dark is-small mb-2 mr-2" style="justify-content: flex-start; height: auto; padding: 8px 12px;" onclick="app.selectCategoryAndStart(${cat.id}, '${paperTitle.replace(/'/g, "\\'")}')">
        <span class="has-text-info mr-2"><b>[${cat.id}]</b></span> 
        <span class="has-text-white">${cat.name}</span> &nbsp;<span class="has-text-grey">(${cat.std})</span>
      </button>
    `).join('');

    modal.classList.add('is-active');
    this.logEvent('UI', 'Opened Classification Debate modal.');
  }

  async selectCategoryAndStart(categoryId, title) {
    document.getElementById('modal-classification').classList.remove('is-active');
    this.logEvent('Classification', `User selected category ID ${categoryId} for paper "${title}"`);
    await this.initSessionOnBackend(null, null, title, categoryId);
  }

  // Backend Session Initializer
  async initSessionOnBackend(paperId, customPdfUrl, title, categoryId) {
    this.logEvent('Session', `Initializing appraisal session for "${title}" (Category ID: ${categoryId})`);
    const btn = document.getElementById('btn-send');
    if (btn) btn.classList.add('is-loading');

    try {
      const { data: res, error } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
        body: {
          action: 'start_session',
          participant_id: null,
          paper_id: paperId,
          custom_pdf_url: customPdfUrl,
          paper_title: title,
          category_id: categoryId,
          device_id: this.deviceId
        }
      });
      if (error) throw error;

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
        this.logEvent('Session', `Session created successfully (ID: ${res.session.id}).`, 'success');

        // FIXED: Unlock the chat input box now that a session is ready!
        const chatInput = document.getElementById('chat-input');
        chatInput.disabled = false;
        chatInput.placeholder = "State your evaluation and rationale...";
        document.getElementById('btn-send').disabled = false;
      }
    } catch (err) {
      this.logEvent('Session', `Failed to initialize session: ${err.message}`, 'error');
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
    // Ensure it's unlocked if they clicked a pill
    if(input.disabled) return; 
    input.value = `[${pillText}] `;
    input.focus();
  }

  async handleStudentSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();

    // Prevent submission if no session exists yet
    if (!this.currentSession) {
      alert("Please select a paper from the Practice Library or upload a PDF first.");
      return;
    }
    if (!text) return;

    input.value = '';
    this.addMessageToChat('student', text);
    this.logEvent('Chat', `Student submitted response for Step ${this.activeStep}.`);

    const btn = document.getElementById('btn-send');
    btn.classList.add('is-loading');

    try {
      this.logEvent('AI', 'Sending prompt to Edge Function AI cascade (costs 2 coins)...');
      const { data, error } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
        body: {
          action: 'chat_turn',
          session_id: this.currentSession.id,
          student_message: text,
          selected_pill: this.selectedPill,
          device_id: this.deviceId
        }
      });
      if (error) throw error;

      this.selectedPill = null;
      btn.classList.remove('is-loading');

      if (data && data.success === false && data.error === 'insufficient_coins') {
        this.openBuyCoinsModal();
        this.logEvent('Wallet', 'Chat rejected: Insufficient EBM coins (< 2 coins).', 'warning');
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
          this.logEvent('Session', 'Appraisal completed successfully! Awarding competency badge.', 'success');
          this.showCompetencyScorecard(data.competency_badge);
        }
      }
    } catch (err) {
      btn.classList.remove('is-loading');
      this.logEvent('AI', `Chat turn failed: ${err.message}`, 'error');
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
    this.activeStep = stepIndex; // keep track locally
    document.getElementById('step-badge').textContent = `Step ${stepIndex} / 7`;
    if (titleOverride) {
      document.getElementById('step-title').textContent = titleOverride;
    }
    document.getElementById('checklist-progress').value = stepIndex;

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