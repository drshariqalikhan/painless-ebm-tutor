class EbmTutorApp {
  constructor() {
    this.participant = null;
    this.deviceId = this.getOrCreateDeviceId();
    this.currentSession = null;
    this.activeStep = 0;
    this.libraryPapers = [];
    this.selectedPill = null;

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
    // 1. Load credentials dynamically from /api/config
    await initAppConfig();

    // 2. Check saved participant token
    const savedCode = localStorage.getItem('ebm_participant_code');
    if (savedCode) {
      document.getElementById('input-access-code').value = savedCode;
      await this.submitAccessCode();
    }
  }

  // 1. Participant Access Verification
  async submitAccessCode() {
    const code = document.getElementById('input-access-code').value.trim();
    const errEl = document.getElementById('access-error');
    if (!code) return;

    try {
      const { data, error } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
        body: { action: 'verify_access', participant_code: code, device_id: this.deviceId }
      });

      if (error || !data.success) {
        errEl.textContent = data?.error || 'Verification failed.';
        errEl.classList.remove('is-hidden');
        return;
      }

      this.participant = data.participant;
      localStorage.setItem('ebm_participant_code', code);
      document.getElementById('modal-access').classList.remove('is-active');
      document.getElementById('user-badge').textContent = `Group ${this.participant.group_assignment} (${code})`;

      await this.loadPracticeLibrary();
    } catch (err) {
      errEl.textContent = 'Server error verifying access token.';
      errEl.classList.remove('is-hidden');
    }
  }

  // 2. Practice Library & Filtering
  async loadPracticeLibrary() {
    const { data } = await supabaseClient.from('practice_library').select('*');
    this.libraryPapers = data || [];
    this.renderLibrary(this.libraryPapers);
    document.getElementById('btn-open-library').addEventListener('click', () => {
      document.getElementById('modal-library').classList.add('is-active');
    });
  }

  filterLibrary(specialty) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('is-active', 'is-info'));
    event.target.classList.add('is-active', 'is-info');

    if (specialty === 'all') {
      this.renderLibrary(this.libraryPapers);
    } else {
      const filtered = this.libraryPapers.filter(p => p.specialty === specialty);
      this.renderLibrary(filtered);
    }
  }

  renderLibrary(papers) {
    const list = document.getElementById('library-list');
    list.innerHTML = papers.map(p => `
      <div class="column is-6">
        <div class="box has-background-dark p-4">
          <span class="tag is-info is-light is-small mb-1">${p.specialty.toUpperCase()}</span>
          <span class="tag is-dark is-small mb-1">${p.difficulty}</span>
          <h4 class="has-text-white is-size-6 has-text-weight-bold mb-1">${p.title}</h4>
          <p class="has-text-grey is-size-7 mb-2">${p.citation}</p>
          <p class="has-text-warning is-size-7 mb-3"><i class="fa-solid fa-bullseye mr-1"></i>Focus: ${p.pedagogical_focus}</p>
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

  // 3. Start Socratic Appraisal Session
  async startPaperAppraisal(paperId) {
    const paper = this.libraryPapers.find(p => p.id === paperId);
    if (!paper) return;

    this.closeLibraryModal();
    document.getElementById('active-paper-badge').textContent = paper.title;

    // Get public URL of PDF from Supabase storage
    const { data } = supabaseClient.storage.from('study-papers').getPublicUrl(paper.pdf_storage_path);
    await pdfViewer.loadPDF(data.publicUrl);

    // Call Edge Function to create session
    const { data: res } = await supabaseClient.functions.invoke(CONFIG.EDGE_FUNCTION_NAME, {
      body: {
        action: 'start_session',
        participant_id: this.participant.id,
        paper_id: paper.id,
        paper_title: paper.title
      }
    });

    if (res && res.session) {
      this.currentSession = res.session;
      this.activeStep = 0;
      this.updateChecklistUI(0, 'Study Design & Directness');

      const messagesDiv = document.getElementById('chat-messages');
      messagesDiv.innerHTML = '';
      this.addMessageToChat('tutor', res.opening_message);
    }
  }

  // 4. Chat Management & Socratic Dialogue
  addMessageToChat(sender, text, evidence = null) {
    const messagesDiv = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;

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

    bubble.innerHTML = `<div>${text.replace(/\n/g, '<br>')}</div>${evidenceHtml}`;
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
        this.addMessageToChat('tutor', data.tutor_response, data.evidence);
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