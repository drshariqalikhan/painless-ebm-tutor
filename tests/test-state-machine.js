QUnit.module('Frontend State Machine & UI Tests', function (hooks) {
  
  hooks.beforeEach(function () {
    // Reset inputs before each test
    document.getElementById('chat-input').value = '';
  });

  QUnit.test('Device ID generator creates and persists a unique identifier', function (assert) {
    localStorage.removeItem('ebm_device_id');
    const freshApp = new EbmTutorApp();
    const id1 = freshApp.deviceId;
    
    assert.ok(id1, 'Device ID is generated');
    assert.true(id1.startsWith('dev_'), 'Device ID uses the dev_ prefix');

    const id2 = freshApp.getOrCreateDeviceId();
    assert.equal(id1, id2, 'Device ID persists in localStorage across calls');
  });

  QUnit.test('Quick-action stance pills pre-fill input box correctly', function (assert) {
    const testApp = new EbmTutorApp();
    const input = document.getElementById('chat-input');
    
    testApp.selectPill('Adequate / Low Risk');
    
    assert.equal(input.value, '[Adequate / Low Risk] ', 'Input correctly pre-fills with bracketed pill stance');
    assert.equal(testApp.selectedPill, 'Adequate / Low Risk', 'App internal state tracks the selected pill');
  });

  QUnit.test('Checklist UI updater correctly maps steps to titles and progress', function (assert) {
    const testApp = new EbmTutorApp();
    
    // Test Step 2 (Allocation Concealment)
    testApp.updateChecklistUI(2);
    
    const badgeText = document.getElementById('step-badge').textContent;
    const titleText = document.getElementById('step-title').textContent;
    const progressVal = document.getElementById('checklist-progress').value;

    assert.equal(badgeText, 'Step 2 / 7', 'Step badge correctly displays index');
    assert.equal(titleText, 'Allocation Concealment', 'Step title maps correctly from array');
    assert.equal(progressVal, '2', 'Progress bar value matches step index');
  });

  QUnit.test('Mobile view switcher toggles visibility classes correctly', function (assert) {
    const testApp = new EbmTutorApp();
    
    // Switch to chat view on mobile
    testApp.switchMobileView('chat');
    
    const pdfPaneClass = document.getElementById('pdf-pane').className;
    const chatPaneClass = document.getElementById('chat-pane').className;

    assert.true(pdfPaneClass.includes('is-hidden-mobile'), 'PDF pane hides on mobile when chat is active');
    assert.false(chatPaneClass.includes('is-hidden-mobile'), 'Chat pane shows on mobile when active');
  });

});