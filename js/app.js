class EbmTutorApp {
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.currentSession = null;
    this.activeStep = 0;
    this.libraryPapers = [];
    this.selectedPill = null;
    this.activeModel = 'Gemini 3.5 Flash-Lite';
    this.coinBalance = 50;
    this.logCount = 0;

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

    // Also pipe to browser console
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
      alert('You need 50 EBM Coins to upload and appraise a custom research paper.');
      event.target.value = '';
      return;
    }

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
      return;
    }

    const fileUrl = URL.createObjectURL(file);
    await pdfViewer.loadPDF(fileUrl);
    this.openClassificationModal(title);
    event.target.value = '';
  }

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

        if (res.model_used) this.activeModel = res.model_used;
        this.logEvent('Session', `Session created successfully (ID: ${res.session.id}).`, 'success');

        const messagesDiv = document.getElementById('chat-messages');
        messagesDiv.innerHTML = '';
        this.addMessageToChat('tutor', res.opening_message, null, this.activeModel);
      }
    } catch (err) {
      this.logEvent('Session', `Failed to initialize session: ${err.message}`, 'error');
    } finally {
      if (btn) btn.classList.remove('is-loading');
    }
  }

  async handleStudentSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !this.currentSession) return;

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
        if (data.model_used) this.activeModel = data.model_used;
        this.logEvent('AI', `AI Tutor responded using model: ${this.activeModel}`, 'success');

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
      this.addMessageToChat('tutor', 'Network connection issue or AI timeout. Please retry.');
    }
  }

  // (Retain rest of existing modal/tab helper functions below...)
  closeLibraryModal() { document.getElementById('modal-library').classList.remove('is-active'); }
  openBuyCoinsModal() { document.getElementById('modal-buy-coins').classList.add('is-active'); }
  closeBuyCoinsModal() { document.getElementById('modal-buy-coins').classList.remove('is-active'); }
  simulatePurchase(amount, price) {
    alert(`Stripe purchase placeholder: +${amount} coins for ${price}`);
    this.updateCoinDisplay(this.coinBalance + amount);
    this.closeBuyCoinsModal();
    this.logEvent('Wallet', `User simulated purchasing ${amount} coins.`, 'success');
  }
  selectPill(pillText) {
    this.selectedPill = pillText;
    const input = document.getElementById('chat-input');
    input.value = `[${pillText}] `;
    input.focus();
  }
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
    if (titleOverride) document.getElementById('step-title').textContent = titleOverride;
    document.getElementById('checklist-progress').value = stepIndex;
    const stepsList = document.getElementById('framework-steps-list');
    if (!stepsList) return;
    const steps = checklist || [];
    stepsList.innerHTML = steps.map(s => {
      let icon = '<i class="fa-regular fa-circle mr-2 has-text-grey"></i>';
      if (s.index < stepIndex) icon = '<i class="fa-solid fa-circle-check mr-2 has-text-success"></i>';
      else if (s.index === stepIndex) icon = '<i class="fa-solid fa-circle-play mr-2 has-text-info"></i>';
      return `<div class="framework-step-card"><div class="is-flex is-align-items-center">${icon}<span class="has-text-weight-bold has-text-white is-size-7">Step ${s.index}: ${s.title}</span></div></div>`;
    }).join('');
  }
  showCompetencyScorecard(badge) {
    document.getElementById('badge-title').textContent = badge || 'Methodology Detective';
    document.getElementById('modal-scorecard').classList.add('is-active');
  }
  filterLibrary(spec) { /* handled in render */ }
  renderLibrary(papers) {
    const list = document.getElementById('library-list');
    if (!list) return;
    list.innerHTML = papers.map(p => `
      <div class="column is-6">
        <div class="box has-background-dark p-4">
          <span class="tag is-info is-light is-small mb-1">${(p.category_name || p.specialty).toUpperCase()}</span>
          <h4 class="has-text-white is-size-6 has-text-weight-bold mb-1">${p.title}</h4>
          <p class="has-text-grey is-size-7 mb-2">${p.citation}</p>
          <button class="button is-small is-info is-fullwidth mt-3" onclick="app.startLibraryPaperAppraisal('${p.id}')">Appraise This Paper</button>
        </div>
      </div>
    `).join('');
  }
}

const app = new EbmTutorApp();