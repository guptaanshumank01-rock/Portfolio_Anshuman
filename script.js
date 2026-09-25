/**
 * Anshuman Gupta — Portfolio & Professional Connection Scheduler
 */

(function () {
  'use strict';

  // --- Smooth Scroll & Intersection Observers ---
  function initNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const hash = link.getAttribute('href');
        if (hash === '#' || hash === '') return;
        const target = document.querySelector(hash);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('show');
            }
          });
        },
        { threshold: 0.12 }
      );

      document
        .querySelectorAll('.project, .about-grid, .contact h2, .work-cta-card, .profile-card, .connect-form-container')
        .forEach(el => {
          el.classList.add('reveal');
          observer.observe(el);
        });
    }
  }

  // --- Timezone & Date Helpers ---
  function getUserTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch (e) {
      return 'UTC';
    }
  }

  function getTomorrowFormatted() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    // If weekend, push to next Monday
    const day = d.getDay();
    if (day === 6) d.setDate(d.getDate() + 2); // Saturday -> Monday
    else if (day === 0) d.setDate(d.getDate() + 1); // Sunday -> Monday

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return 'Selected Date';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        return d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (e) {}
    return dateStr;
  }

  // --- Dual Live Clock for Schedule Page ---
  function initDualClock() {
    const userClockEl = document.getElementById('userLocalClock');
    const userZoneEl = document.getElementById('userLocalZone');
    const hostClockEl = document.getElementById('hostIstClock');

    if (!userClockEl && !hostClockEl) return;

    const userTz = getUserTimezone();
    if (userZoneEl) {
      userZoneEl.textContent = userTz;
    }

    function updateClocks() {
      const now = new Date();

      if (userClockEl) {
        try {
          userClockEl.textContent = now.toLocaleTimeString('en-US', {
            timeZone: userTz,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        } catch (e) {
          userClockEl.textContent = now.toLocaleTimeString();
        }
      }

      if (hostClockEl) {
        try {
          hostClockEl.textContent = now.toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
        } catch (e) {
          hostClockEl.textContent = now.toLocaleTimeString();
        }
      }
    }

    updateClocks();
    setInterval(updateClocks, 1000);
  }

  // --- Calendar & ICS Generation ---
  function createIcsFile(meeting) {
    const startTimeStr = meeting.date.replace(/-/g, '') + 'T' + meeting.timeIso + '00Z';
    const endTimeStr = meeting.date.replace(/-/g, '') + 'T' + meeting.timeEndIso + '00Z';

    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Anshuman Gupta//Professional Meeting Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:meeting-${meeting.id}-${Date.now()}@anshuman.dev`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startTimeStr}`,
      `DTEND:${endTimeStr}`,
      `SUMMARY:${meeting.title}`,
      `DESCRIPTION:${meeting.description.replace(/\n/g, '\\n')}`,
      `LOCATION:${meeting.platform} (Link will be shared via email)`,
      'STATUS:CONFIRMED',
      'ORGANIZER;CN="Anshuman Gupta":mailto:hello@anshuman.dev',
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN="${meeting.name}":mailto:${meeting.email}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    return URL.createObjectURL(blob);
  }

  function getGoogleCalendarUrl(meeting) {
    const startTimeStr = meeting.date.replace(/-/g, '') + 'T' + meeting.timeIso + '00Z';
    const endTimeStr = meeting.date.replace(/-/g, '') + 'T' + meeting.timeEndIso + '00Z';
    const details = `${meeting.description}\n\nHost: Anshuman Gupta (hello@anshuman.dev)\nAttendee: ${meeting.name} (${meeting.email})\nReference ID: ${meeting.id}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      meeting.title
    )}&dates=${startTimeStr}/${endTimeStr}&details=${encodeURIComponent(
      details
    )}&location=${encodeURIComponent(meeting.platform + ' / Virtual')}`;
  }

  // --- Right-Side Slide-Over Drawer Manager ---
  const drawerContainer = document.getElementById('meetingDrawerContainer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const floatingPeekNote = document.getElementById('floatingPeekNote');
  const floatingPeekClose = document.getElementById('floatingPeekClose');

  function openDrawer(preselectedPurpose) {
    if (!drawerContainer) return;
    drawerContainer.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    if (floatingPeekNote) {
      floatingPeekNote.classList.add('hide');
    }

    if (preselectedPurpose) {
      const drawerForm = document.getElementById('drawerMeetingForm');
      if (drawerForm) {
        const chip = drawerForm.querySelector(`[data-purpose="${preselectedPurpose}"]`);
        if (chip) chip.click();
      }
    }
  }

  function closeDrawer() {
    if (!drawerContainer) return;
    drawerContainer.classList.remove('is-open');
    document.body.style.overflow = '';
    sessionStorage.setItem('portfolio_drawer_dismissed', 'true');
  }

  function initMeetingDrawer() {
    if (!drawerContainer) return;

    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', closeDrawer);
    }

    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', closeDrawer);
    }

    // Attach click triggers to all .open-meeting-drawer buttons across the website
    document.querySelectorAll('.open-meeting-drawer').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const purpose = btn.getAttribute('data-purpose');
        openDrawer(purpose);
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawerContainer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    // Floating Peek note close
    if (floatingPeekClose && floatingPeekNote) {
      floatingPeekClose.addEventListener('click', () => {
        floatingPeekNote.classList.add('hide');
        sessionStorage.setItem('portfolio_peek_closed', 'true');
      });
    }

    // Auto-open behavior on website opening (as requested: "which open with website opening in right side")
    const hasOpened = sessionStorage.getItem('portfolio_drawer_auto_opened');
    const isSchedulePage = window.location.pathname.includes('connect') || window.location.pathname.includes('schedule');
    const urlParams = new URLSearchParams(window.location.search);
    const forceOpen = urlParams.get('meet') === '1' || urlParams.get('connect') === '1';

    // On index page, slide open on load after brief delay if not previously dismissed in this session (or if forced via URL)
    if (!hasOpened || forceOpen) {
      sessionStorage.setItem('portfolio_drawer_auto_opened', 'true');
      setTimeout(() => {
        // If user hasn't opened anything yet and is on home or requested
        if (!isSchedulePage || forceOpen) {
          openDrawer();
        }
      }, 700);
    }
  }

  // --- Form Controller (Unified for Drawer Form & Page Form) ---
  function setupMeetingForm(formId, isDrawer = false) {
    const form = document.getElementById(formId);
    if (!form) return;

    const prefix = isDrawer ? 'drawer_' : 'page_';
    const tomorrow = getTomorrowFormatted();

    // Elements inside this form
    const dateInput = form.querySelector(`[name="meeting_date"]`);
    const timezoneSelect = form.querySelector(`[name="timezone"]`);
    const purposeChips = form.querySelectorAll('.purpose-chip');
    const durationChips = form.querySelectorAll('.duration-chip');
    const platformSelect = form.querySelector(`[name="platform"]`);
    const timeSlotBtns = form.querySelectorAll('.time-slot-btn');
    const nameInput = form.querySelector(`[name="full_name"]`);
    const emailInput = form.querySelector(`[name="work_email"]`);
    const companyInput = form.querySelector(`[name="company"]`);
    const roleInput = form.querySelector(`[name="role"]`);
    const agendaInput = form.querySelector(`[name="agenda"]`);
    const linksInput = form.querySelector(`[name="links"]`);
    const submitBtn = form.querySelector('button[type="submit"]');

    // Live preview elements
    const previewType = form.querySelector('.preview-val-type');
    const previewDate = form.querySelector('.preview-val-date');
    const previewTime = form.querySelector('.preview-val-time');
    const previewTz = form.querySelector('.preview-val-tz');
    const previewPlatform = form.querySelector('.preview-platform-badge');

    // Success State elements
    const successContainer = isDrawer
      ? document.getElementById('drawerSuccessState')
      : document.getElementById('pageSuccessState');

    // State object for this form
    let state = {
      purpose: 'Project Discovery & Demo',
      duration: '30 min',
      platform: 'Google Meet',
      date: tomorrow,
      timeSlot: '02:00 PM',
      timezone: getUserTimezone(),
      name: '',
      email: '',
      company: '',
      role: '',
      agenda: '',
      links: ''
    };

    // Set min date and initial date value
    if (dateInput) {
      dateInput.min = tomorrow;
      dateInput.value = tomorrow;
    }

    // Set detected timezone
    if (timezoneSelect) {
      const userTz = getUserTimezone();
      let found = false;
      for (let opt of timezoneSelect.options) {
        if (opt.value === userTz) {
          opt.selected = true;
          found = true;
          break;
        }
      }
      if (!found) {
        // Add current timezone as first option if not listed
        const customOpt = new Option(`${userTz} (Local)`, userTz, true, true);
        timezoneSelect.prepend(customOpt);
      }
      state.timezone = timezoneSelect.value;
    }

    // Function to update preview card
    function updatePreview() {
      if (previewType) {
        previewType.textContent = `${state.duration} · ${state.purpose}`;
      }
      if (previewDate) {
        previewDate.textContent = formatDisplayDate(state.date);
      }
      if (previewTime) {
        previewTime.textContent = state.timeSlot;
      }
      if (previewTz) {
        previewTz.textContent = `(${state.timezone})`;
      }
      if (previewPlatform) {
        previewPlatform.textContent = state.platform;
      }
    }

    // Purpose chip listeners
    purposeChips.forEach(chip => {
      chip.addEventListener('click', () => {
        purposeChips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        state.purpose = chip.getAttribute('data-purpose-label') || chip.textContent.trim();
        updatePreview();
      });
    });

    // Duration chip listeners
    durationChips.forEach(chip => {
      chip.addEventListener('click', () => {
        durationChips.forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        state.duration = chip.getAttribute('data-duration') || chip.textContent.trim();
        updatePreview();
      });
    });

    // Platform change
    if (platformSelect) {
      platformSelect.addEventListener('change', () => {
        state.platform = platformSelect.value;
        updatePreview();
      });
    }

    // Date change
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        state.date = dateInput.value;
        updatePreview();
      });
    }

    // Time slot button listeners
    timeSlotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        timeSlotBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.timeSlot = btn.getAttribute('data-time') || btn.textContent.trim();
        updatePreview();
      });
    });

    // Timezone change
    if (timezoneSelect) {
      timezoneSelect.addEventListener('change', () => {
        state.timezone = timezoneSelect.value;
        updatePreview();
      });
    }

    // Initial preview update
    updatePreview();

    // Form Submission
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const nameVal = nameInput ? nameInput.value.trim() : '';
      const emailVal = emailInput ? emailInput.value.trim() : '';
      const companyVal = companyInput ? companyInput.value.trim() : '';
      const roleVal = roleInput ? roleInput.value.trim() : '';
      const agendaVal = agendaInput ? agendaInput.value.trim() : '';
      const linksVal = linksInput ? linksInput.value.trim() : '';

      // Validation
      let isValid = true;

      if (!nameVal || nameVal.length < 2) {
        if (nameInput) nameInput.classList.add('is-invalid');
        isValid = false;
      } else {
        if (nameInput) nameInput.classList.remove('is-invalid');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailVal || !emailRegex.test(emailVal)) {
        if (emailInput) emailInput.classList.add('is-invalid');
        isValid = false;
      } else {
        if (emailInput) emailInput.classList.remove('is-invalid');
      }

      if (!state.date) {
        if (dateInput) dateInput.classList.add('is-invalid');
        isValid = false;
      } else {
        if (dateInput) dateInput.classList.remove('is-invalid');
      }

      if (!isValid) {
        return;
      }

      // Show loading on submit button
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Scheduling Meeting...</span> <span class="btn-spinner">⏳</span>`;
      }

      // Create meeting record
      const meetingId = 'AG-MEET-' + Math.floor(1000 + Math.random() * 9000);

      // Convert timeslot to ISO format for calendar
      // e.g. "02:00 PM" -> "14:00"
      let hour = 14;
      let minute = 0;
      if (state.timeSlot.includes('10:00 AM')) { hour = 10; minute = 0; }
      else if (state.timeSlot.includes('11:30 AM')) { hour = 11; minute = 30; }
      else if (state.timeSlot.includes('02:00 PM')) { hour = 14; minute = 0; }
      else if (state.timeSlot.includes('03:30 PM')) { hour = 15; minute = 30; }
      else if (state.timeSlot.includes('05:00 PM')) { hour = 17; minute = 0; }
      else if (state.timeSlot.includes('07:00 PM')) { hour = 19; minute = 0; }

      const durMin = parseInt(state.duration) || 30;
      const endHour = hour + Math.floor((minute + durMin) / 60);
      const endMinute = (minute + durMin) % 60;

      const timeIso = `${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}`;
      const timeEndIso = `${String(endHour).padStart(2, '0')}${String(endMinute).padStart(2, '0')}`;

      const meetingData = {
        id: meetingId,
        name: nameVal,
        email: emailVal,
        company: companyVal || 'Independent / Individual',
        role: roleVal || 'Collaborator',
        purpose: state.purpose,
        duration: state.duration,
        platform: state.platform,
        date: state.date,
        timeSlot: state.timeSlot,
        timezone: state.timezone,
        timeIso: timeIso,
        timeEndIso: timeEndIso,
        title: `Meeting: ${nameVal} & Anshuman Gupta (${state.purpose})`,
        description: `Professional meeting with Anshuman Gupta.\nTopic: ${state.purpose}\nAgenda/Notes: ${agendaVal || 'General discovery & discussion'}\nReference Links: ${linksVal || 'None provided'}`,
        timestamp: new Date().toISOString()
      };

      // Save to localStorage
      try {
        const history = JSON.parse(localStorage.getItem('anshuman_portfolio_meetings') || '[]');
        history.push(meetingData);
        localStorage.setItem('anshuman_portfolio_meetings', JSON.stringify(history));
      } catch (e) {}

      // Simulate swift API processing
      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Confirm & Schedule Meeting</span> <span class="btn-arrow">↗</span>`;
        }

        // Render success state
        if (successContainer) {
          form.style.display = 'none';
          successContainer.classList.add('show');

          // Populate success details
          const idEl = successContainer.querySelector('.success-ref-id');
          const titleEl = successContainer.querySelector('.success-val-title');
          const whenEl = successContainer.querySelector('.success-val-when');
          const hostEl = successContainer.querySelector('.success-val-host');
          const platformEl = successContainer.querySelector('.success-val-platform');
          const attendeeEl = successContainer.querySelector('.success-val-attendee');
          const googleBtn = successContainer.querySelector('.btn-add-google');
          const icsBtn = successContainer.querySelector('.btn-download-ics');
          const copyBtn = successContainer.querySelector('.btn-copy-summary');
          const resetBtn = successContainer.querySelector('.btn-reset-meeting');

          if (idEl) idEl.textContent = '#' + meetingId;
          if (titleEl) titleEl.textContent = `${meetingData.duration} · ${meetingData.purpose}`;
          if (whenEl) whenEl.textContent = `${formatDisplayDate(meetingData.date)} @ ${meetingData.timeSlot} (${meetingData.timezone})`;
          if (hostEl) hostEl.textContent = 'Anshuman Gupta (hello@anshuman.dev)';
          if (platformEl) platformEl.textContent = `${meetingData.platform} (Video Link provided in invite)`;
          if (attendeeEl) attendeeEl.textContent = `${meetingData.name} <${meetingData.email}>`;

          // Google Calendar link
          if (googleBtn) {
            googleBtn.href = getGoogleCalendarUrl(meetingData);
            googleBtn.target = '_blank';
          }

          // ICS download
          if (icsBtn) {
            const icsUrl = createIcsFile(meetingData);
            icsBtn.href = icsUrl;
            icsBtn.download = `Anshuman-Gupta-Meeting-${meetingId}.ics`;
          }

          // Copy Summary
          if (copyBtn) {
            copyBtn.onclick = () => {
              const summaryText = `Meeting Confirmed with Anshuman Gupta\nID: #${meetingId}\nPurpose: ${meetingData.purpose} (${meetingData.duration})\nWhen: ${formatDisplayDate(meetingData.date)} @ ${meetingData.timeSlot} (${meetingData.timezone})\nPlatform: ${meetingData.platform}\nAttendee: ${meetingData.name} (${meetingData.email})`;
              navigator.clipboard.writeText(summaryText).then(() => {
                const orig = copyBtn.innerHTML;
                copyBtn.innerHTML = `<span>✓ Details Copied to Clipboard!</span>`;
                setTimeout(() => { copyBtn.innerHTML = orig; }, 2500);
              });
            };
          }

          // Reset meeting form
          if (resetBtn) {
            resetBtn.onclick = () => {
              form.reset();
              if (dateInput) {
                dateInput.value = tomorrow;
                state.date = tomorrow;
              }
              form.style.display = 'block';
              successContainer.classList.remove('show');
              updatePreview();
            };
          }
        }
      }, 700);
    });
  }

  // --- Initialize on DOMContentLoaded ---
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initMeetingDrawer();
    initDualClock();
    setupMeetingForm('drawerMeetingForm', true);
    setupMeetingForm('pageMeetingForm', false);
  });
})();
