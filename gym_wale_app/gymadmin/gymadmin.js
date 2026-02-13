// === Gym Admin Dashboard JavaScript ===
// Centralized BASE_URL configuration
const BASE_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:5000';

// === Profile Dropdown Menu Toggle ===
document.addEventListener('DOMContentLoaded', function() {
  const userProfileToggle = document.getElementById('userProfileToggle');
  const profileDropdownMenu = document.getElementById('profileDropdownMenu');
  
  if (userProfileToggle && profileDropdownMenu) {
    // Make user-profile container relative for absolute positioning
    const userProfileContainer = userProfileToggle.closest('.user-actions');
    if (userProfileContainer) {
      userProfileContainer.style.position = 'relative';
    }
    
    // Toggle dropdown on click
    userProfileToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // Close all other dropdowns if any
      document.querySelectorAll('.profile-dropdown-menu').forEach(dropdown => {
        if (dropdown !== profileDropdownMenu) {
          dropdown.classList.remove('open', 'show');
          dropdown.style.display = 'none';
        }
      });
      
      // Toggle this dropdown
      const isOpen = profileDropdownMenu.classList.contains('open');
      
      if (isOpen) {
        // Close it
        profileDropdownMenu.classList.remove('open', 'show');
        // Small delay to allow animation before hiding
        setTimeout(() => {
          if (!profileDropdownMenu.classList.contains('open')) {
            profileDropdownMenu.style.display = 'none';
          }
        }, 250);
      } else {
        // Open it
        profileDropdownMenu.style.display = 'block';
        // Force reflow for animation
        profileDropdownMenu.offsetHeight;
        profileDropdownMenu.classList.add('open', 'show');
      }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!profileDropdownMenu.contains(e.target) && !userProfileToggle.contains(e.target)) {
        if (profileDropdownMenu.classList.contains('open')) {
          profileDropdownMenu.classList.remove('open', 'show');
          setTimeout(() => {
            if (!profileDropdownMenu.classList.contains('open')) {
              profileDropdownMenu.style.display = 'none';
            }
          }, 250);
        }
      }
    });
    
    // Close dropdown when pressing Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && profileDropdownMenu.classList.contains('open')) {
        profileDropdownMenu.classList.remove('open', 'show');
        setTimeout(() => {
          if (!profileDropdownMenu.classList.contains('open')) {
            profileDropdownMenu.style.display = 'none';
          }
        }, 250);
      }
    });
  }
});
// === Dynamic Activities Offered Section ===
document.addEventListener('DOMContentLoaded', function() {
  // Use the same hardcoded activities as registration form for full sync
  const allPossibleActivities = [
    { name: 'Yoga', icon: 'fa-person-praying', description: 'Improve flexibility, balance, and mindfulness.' },
    { name: 'Zumba', icon: 'fa-music', description: 'Fun dance-based cardio workout.' },
    { name: 'CrossFit', icon: 'fa-dumbbell', description: 'High-intensity functional training.' },
    { name: 'Weight Training', icon: 'fa-weight-hanging', description: 'Strength and muscle building.' },
    { name: 'Cardio', icon: 'fa-heartbeat', description: 'Endurance and heart health.' },
    { name: 'Pilates', icon: 'fa-child', description: 'Core strength and flexibility.' },
    { name: 'HIIT', icon: 'fa-bolt', description: 'High-Intensity Interval Training.' },
    { name: 'Aerobics', icon: 'fa-running', description: 'Rhythmic aerobic exercise.' },
    { name: 'Martial Arts', icon: 'fa-hand-fist', description: 'Self-defense and discipline.' },
    { name: 'Spin Class', icon: 'fa-bicycle', description: 'Indoor cycling workout.' },
    { name: 'Swimming', icon: 'fa-person-swimming', description: 'Full-body low-impact exercise.' },
    { name: 'Boxing', icon: 'fa-hand-rock', description: 'Cardio and strength with boxing.' },
    { name: 'Personal Training', icon: 'fa-user-tie', description: '1-on-1 customized fitness.' },
    { name: 'Bootcamp', icon: 'fa-shoe-prints', description: 'Group-based intense training.' },
    { name: 'Stretching', icon: 'fa-arrows-up-down', description: 'Mobility and injury prevention.' }
  ];
  let selectedActivities = [];
  let currentActivities = [];

  // --- DOM Elements ---
  const activitiesList = document.getElementById('activitiesList');
  const addActivitiesBtn = document.getElementById('addActivitiesBtn');
  const addActivitiesModal = document.getElementById('addActivitiesModal');
  const closeAddActivitiesModal = document.getElementById('closeAddActivitiesModal');
  const allActivitiesGrid = document.getElementById('allActivitiesGrid');
  const saveActivitiesBtn = document.getElementById('saveActivitiesBtn');
  const cancelAddActivitiesBtn = document.getElementById('cancelAddActivitiesBtn');
  const saveActivitiesConfirmDialog = document.getElementById('saveActivitiesConfirmDialog');
  const confirmSaveActivitiesBtn = document.getElementById('confirmSaveActivitiesBtn');
  const cancelSaveActivitiesConfirmBtn = document.getElementById('cancelSaveActivitiesConfirmBtn');
  const closeSaveActivitiesConfirmDialog = document.getElementById('closeSaveActivitiesConfirmDialog');

  // --- Fetch and Render Activities ---
  async function fetchAndRenderActivities() {
    try {
      // Use global gym profile if available, otherwise fetch it
      let data = window.currentGymProfile;
      
      if (!data || Object.keys(data).length === 0) {
        const token = localStorage.getItem('gymAdminToken');
        if (!token) return;
        
        const res = await fetch('${BASE_URL}/api/gyms/profile/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        data = await res.json();
        window.currentGymProfile = data; // Store globally
      }
      
      // Handle activities data - ensure proper structure
      let activities = [];
      if (Array.isArray(data.activities)) {
        activities = data.activities.map(activity => {
          
          // Handle different activity formats
          if (typeof activity === 'string') {
            // If activity is just a string, try to parse as JSON first
            try {
              const parsedActivity = JSON.parse(activity);
              return {
                name: parsedActivity.name || '',
                icon: parsedActivity.icon || 'fa-dumbbell',
                description: parsedActivity.description || ''
              };
            } catch (parseErr) {
              console.error('Failed to parse as JSON, treating as plain string:', activity, parseErr);
              // If not JSON, find matching activity from predefined list
              const matchedActivity = allPossibleActivities.find(a => a.name === activity);
              const result = matchedActivity || { name: activity, icon: 'fa-dumbbell', description: '' };
              return result;
            }
          } else if (typeof activity === 'object' && activity !== null) {
            // Check if the object has a stringified JSON in the name field
            if (activity.name && typeof activity.name === 'string' && activity.name.startsWith('{')) {
              try {
                const parsedActivity = JSON.parse(activity.name);
                return {
                  name: parsedActivity.name || '',
                  icon: parsedActivity.icon || 'fa-dumbbell',
                  description: parsedActivity.description || ''
                };
              } catch (parseErr) {
               
                console.warn('Failed to parse JSON from name field, using original activity:', parseErr);
                // Optionally, you could set a default structure or leave as is
              }
            }
            
            // If activity is an object, ensure it has required fields
            const result = {
              name: activity.name || '',
              icon: activity.icon || 'fa-dumbbell',
              description: activity.description || ''
            };
            return result;
          }
          return null;
        }).filter(Boolean);
      } else if (typeof data.activities === 'string') {
        // Handle case where activities might be stored as a JSON string
        try {
          const parsedActivities = JSON.parse(data.activities);
          if (Array.isArray(parsedActivities)) {
            activities = parsedActivities.map(activity => {
              if (typeof activity === 'string') {
                const matchedActivity = allPossibleActivities.find(a => a.name === activity);
                return matchedActivity || { name: activity, icon: 'fa-dumbbell', description: '' };
              }
              return activity;
            });
          }
        } catch (parseErr) {
          console.error('Failed to parse activities JSON string:', parseErr);
        }
      }
      
      currentActivities = activities;
      selectedActivities = currentActivities.map(a => a.name);
      renderActivitiesList();
    } catch (err) {
      console.error('Error fetching activities:', err);
      if (activitiesList) activitiesList.innerHTML = '<div style="color:#b71c1c;">Failed to load activities.</div>';
    }
  }

  // --- Render Activities in Dashboard ---
  function renderActivitiesList() {
    if (!activitiesList) return;
        
    if (!currentActivities?.length) {
      activitiesList.innerHTML = '<div style="color:#888;font-size:1em;text-align:center;padding:20px;">No activities added yet.</div>';
      return;
    }
    
    // Filter out any invalid activities
    const validActivities = currentActivities.filter(a => typeof a?.name === 'string');
    
    if (!validActivities.length) {
      activitiesList.innerHTML = '<div style="color:#888;font-size:1em;text-align:center;padding:20px;">No valid activities found.</div>';
      return;
    }
        
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    activitiesList.innerHTML = '<div class="activities-grid">' +
      validActivities.map(a => `
        <div class="activity-badge" tabindex="0" title="${a.description || a.name}">
          <i class="fas ${a.icon || 'fa-dumbbell'} activity-icon"></i>
          <span>${a.name}</span>
        </div>
      `).join('') + '</div>';
    
    // Removed inline hover effects - now handled by CSS for better consistency
      
    // Show description on click
    Array.from(activitiesList.querySelectorAll('.activity-badge')).forEach((el, idx) => {
      el.onclick = () => {
        const activity = validActivities[idx];
        showDialog({
          title: activity.name,
          message: activity.description || 'No description available.',
          iconHtml: `<i class='fas ${activity.icon || 'fa-dumbbell'}' style='font-size:2em;color:#1976d2;'></i>`
        });
      };
    });
  }

  // --- Open Add Activities Modal ---
  if (addActivitiesBtn && addActivitiesModal) {
    addActivitiesBtn.onclick = () => {
      renderAllActivitiesGrid();
      addActivitiesModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };
  }
  if (closeAddActivitiesModal && addActivitiesModal) {
    closeAddActivitiesModal.onclick = () => {
      addActivitiesModal.style.display = 'none';
      document.body.style.overflow = '';
    };
  }
  if (cancelAddActivitiesBtn && addActivitiesModal) {
    cancelAddActivitiesBtn.onclick = () => {
      addActivitiesModal.style.display = 'none';
      document.body.style.overflow = '';
    };
  }

  // --- Render All Activities Grid in Modal ---
  function renderAllActivitiesGrid() {
    if (!allActivitiesGrid) return;
    allActivitiesGrid.innerHTML = allPossibleActivities.map(a => {
      const isSelected = selectedActivities.includes(a.name);
      return `
        <div class="activity-select-card" data-activity="${a.name}" style="background:${isSelected ? '#e3f2fd' : '#fff'};border:2px solid ${isSelected ? 'var(--primary-dark)' : '#eee'};border-radius:12px;padding:18px 8px;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:box-shadow 0.2s;position:relative;min-height:120px;">
          <i class="fas ${a.icon}" style="font-size:2em;color:var(--primary);margin-bottom:8px;"></i>
          <span style="font-size:1.08em;font-weight:600;">${a.name}</span>
          <span class="activity-desc" style="font-size:0.95em;color:#666;margin-top:4px;text-align:center;">${a.description}</span>
          <span class="activity-select-icon" style="position:absolute;top:10px;right:12px;font-size:1.3em;color:${isSelected ? 'var(--primary)' : '#bbb'};">${isSelected ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-plus-circle"></i>'}</span>
        </div>
      `;
    }).join('');
    // Add click handlers
    Array.from(allActivitiesGrid.querySelectorAll('.activity-select-card')).forEach(card => {
      card.onclick = () => {
        const name = card.getAttribute('data-activity');
        if (selectedActivities.includes(name)) {
          selectedActivities = selectedActivities.filter(n => n !== name);
        } else {
          selectedActivities.push(name);
        }
        renderAllActivitiesGrid();
      };
    });
  }

  // --- Save Activities Button (opens confirm dialog) ---
  if (saveActivitiesBtn && saveActivitiesConfirmDialog) {
    saveActivitiesBtn.onclick = () => {
      saveActivitiesConfirmDialog.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };
  }
  if (closeSaveActivitiesConfirmDialog && saveActivitiesConfirmDialog) {
    closeSaveActivitiesConfirmDialog.onclick = () => {
      saveActivitiesConfirmDialog.style.display = 'none';
      document.body.style.overflow = '';
    };
  }
  if (cancelSaveActivitiesConfirmBtn && saveActivitiesConfirmDialog) {
    cancelSaveActivitiesConfirmBtn.onclick = () => {
      saveActivitiesConfirmDialog.style.display = 'none';
      document.body.style.overflow = '';
    };
  }

  // --- Confirm Save Activities (send to backend) ---
  if (confirmSaveActivitiesBtn) {
    confirmSaveActivitiesBtn.onclick = async () => {
      // Compose selected activity objects from the hardcoded list
      const activitiesToSave = allPossibleActivities.filter(a => selectedActivities.includes(a.name));
      // Save to backend
      const token = localStorage.getItem('gymAdminToken');
      if (!token) return showDialog({ title: 'Not Authenticated', message: 'Please log in again.' });
      try {
        const res = await fetch('${BASE_URL}/api/gyms/activities', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ activities: activitiesToSave })
        });
        if (!res.ok) throw new Error('Failed to save activities');
        // Success
        saveActivitiesConfirmDialog.style.display = 'none';
        addActivitiesModal.style.display = 'none';
        document.body.style.overflow = '';
        showDialog({
          title: 'Activities Saved',
          message: 'Your activities have been updated.',
          iconHtml: '<i class="fas fa-check-circle" style="color:#43a047;font-size:2em;"></i>'
        });
        // Refresh dashboard activities
        fetchAndRenderActivities();
      } catch (err) {
        console.error('Error saving activities:', err);
        showDialog({
          title: 'Error',
          message: 'Could not save activities. Please try again.',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#b71c1c;font-size:2em;"></i>'
        });
      }
    };
  }

  // Add window resize handler for responsive behavior
  function handleResponsiveLayout() {
    const quickActionList = document.querySelector('.quick-action-list');
    const activitiesGrid = document.querySelector('.activities-grid');
    const windowWidth = window.innerWidth;
    
    if (quickActionList) {
      // Adjust quick actions grid based on container width
      const containerWidth = quickActionList.offsetWidth;
      let columns;
      
      if (windowWidth <= 480) {
        columns = 2;
      } else if (windowWidth <= 768) {
        columns = 2;
      } else if (containerWidth < 400) {
        columns = 2;
      } else {
        columns = Math.floor(containerWidth / 130); // Minimum 130px per column
        columns = Math.max(2, Math.min(5, columns)); // Between 2 and 5 columns
      }
      
      quickActionList.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    }
    
    if (activitiesGrid) {
      // Adjust activities grid based on container width
      const containerWidth = activitiesGrid.offsetWidth;
      let minSize;
      
      if (windowWidth <= 480) {
        minSize = '60px';
      } else if (windowWidth <= 768) {
        minSize = '70px';
      } else {
        minSize = '100px';
      }
      
      activitiesGrid.style.gridTemplateColumns = `repeat(auto-fit, minmax(${minSize}, 1fr))`;
    }
  }
  
  // Call on load and resize
  window.addEventListener('resize', handleResponsiveLayout);
  document.addEventListener('DOMContentLoaded', handleResponsiveLayout);
  
  // Call after activities are rendered
  const originalRenderActivitiesList = renderActivitiesList;
  renderActivitiesList = function() {
    originalRenderActivitiesList.call(this);
    setTimeout(handleResponsiveLayout, 100); // Small delay to ensure DOM is updated
  };

  // Initial render
  fetchAndRenderActivities();
});
// --- Dialog Utility (Global) ---
function showDialog({ title = '', message = '', confirmText = 'OK', cancelText = '', iconHtml = '', customFooter = '', onConfirm = null, onCancel = null }) {
  // Remove any existing dialog
  let dialog = document.getElementById('customDialogBox');
  if (dialog) dialog.remove();
  
  dialog = document.createElement('div');
  dialog.id = 'customDialogBox';
  dialog.style.position = 'fixed';
  dialog.style.top = '0';
  dialog.style.left = '0';
  dialog.style.width = '100vw';
  dialog.style.height = '100vh';
  dialog.style.background = 'rgba(0,0,0,0.35)';
  dialog.style.display = 'flex';
  dialog.style.alignItems = 'center';
  dialog.style.justifyContent = 'center';
  dialog.style.zIndex = '99999';
  dialog.style.backdropFilter = 'blur(2px)';
  
  // Prepare buttons HTML
  const buttonsHtml = customFooter ? customFooter : (cancelText ? 
    `<div style="display:flex;gap:12px;justify-content:center;">
      <button id="dialogCancelBtn" style="background:#6c757d;color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${cancelText}</button>
      <button id="dialogConfirmBtn" style="background:var(--primary);color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${confirmText}</button>
    </div>` :
    `<button id="dialogConfirmBtn" style="background:var(--primary);color:#fff;padding:10px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;font-weight:600;transition:background 0.2s ease;">${confirmText}</button>`);

  dialog.innerHTML = `
    <div style="background:#fff;max-width:450px;width:90vw;padding:30px 24px 20px 24px;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.2);text-align:center;position:relative;animation:dialogSlideIn 0.3s ease-out;">
      <div style="margin-bottom:16px;">${iconHtml || ''}</div>
      <div style="font-size:1.25em;font-weight:700;margin-bottom:12px;color:#333;">${title}</div>
      <div style="font-size:1em;color:#555;margin-bottom:24px;line-height:1.5;white-space:pre-line;">${message}</div>
      ${buttonsHtml}
    </div>
    <style>
      @keyframes dialogSlideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #dialogConfirmBtn:hover {
        background: var(--primary-dark) !important;
      }
      #dialogCancelBtn:hover {
        background: #5a6268 !important;
      }
      .mark-paid-btn-dialog:hover {
        background: #218838 !important;
      }
      .mark-all-paid-btn-dialog:hover {
        background: #218838 !important;
      }
      }
    </style>
  `;
  
  document.body.appendChild(dialog);
  document.body.style.overflow = 'hidden';
  
  // Confirm button handler
  dialog.querySelector('#dialogConfirmBtn').onclick = function() {
    dialog.remove();
    document.body.style.overflow = '';
    if (typeof onConfirm === 'function') onConfirm();
  };
  
  // Cancel button handler (if exists)
  const cancelBtn = dialog.querySelector('#dialogCancelBtn');
  if (cancelBtn) {
    cancelBtn.onclick = function() {
      dialog.remove();
      document.body.style.overflow = '';
      if (typeof onCancel === 'function') onCancel();
    };
  }
  
  // Click outside to close (only if no cancel button, otherwise user must choose)
  if (!cancelText) {
    dialog.addEventListener('mousedown', function(e) {
      if (e.target === dialog) {
        dialog.remove();
        document.body.style.overflow = '';
      }
    });
  }
}

// --- Trainer Tab Logic ---
document.addEventListener('DOMContentLoaded', function() {
  // --- Trainer Profile Image Upload Logic ---
  const uploadTrainerImageBtn = document.getElementById('uploadTrainerImageBtn');
  const trainerProfileImageInput = document.getElementById('trainerProfileImage');
  const trainerImageTag = document.getElementById('trainerImageTag');

  if (uploadTrainerImageBtn && trainerProfileImageInput) {
    uploadTrainerImageBtn.addEventListener('click', function() {
      trainerProfileImageInput.click();
    });
  }
  if (trainerProfileImageInput && trainerImageTag) {
    trainerProfileImageInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
          trainerImageTag.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        trainerImageTag.src = 'https://via.placeholder.com/96?text=Photo';
      }
    });
  }
  // Tab navigation
  const pendingBtn = document.getElementById('pendingTrainersBtn');
  const approvedBtn = document.getElementById('approvedTrainersBtn');
  const rejectedBtn = document.getElementById('rejectedTrainersBtn');
  const pendingGrid = document.getElementById('pendingTrainersGrid');
  const approvedGrid = document.getElementById('approvedTrainersGrid');
  const rejectedGrid = document.getElementById('rejectedTrainersGrid');

  // Helper: Show only the selected section and fetch correct trainers
  async function showSection(section) {
    if (!pendingGrid || !approvedGrid || !rejectedGrid) return;
    pendingGrid.style.display = section === 'pending' ? 'flex' : 'none';
    approvedGrid.style.display = section === 'approved' ? 'flex' : 'none';
    rejectedGrid.style.display = section === 'rejected' ? 'flex' : 'none';
    // Highlight the active tab button
    if (pendingBtn && approvedBtn && rejectedBtn) {
      if (section === 'pending') {
        pendingBtn.style.background = 'var(--warning)';
        pendingBtn.style.color = '#fff';
        approvedBtn.style.background = '#f0f0f0';
        approvedBtn.style.color = '#1976d2';
        rejectedBtn.style.background = '#f0f0f0';
        rejectedBtn.style.color = '#d32f2f';
      } else if (section === 'approved') {
        pendingBtn.style.background = '#f0f0f0';
        pendingBtn.style.color = '#1976d2';
        approvedBtn.style.background = 'var(--success)';
        approvedBtn.style.color = '#fff';
        rejectedBtn.style.background = '#f0f0f0';
        rejectedBtn.style.color = '#d32f2f';
      } else if (section === 'rejected') {
        pendingBtn.style.background = '#f0f0f0';
        pendingBtn.style.color = '#1976d2';
        approvedBtn.style.background = '#f0f0f0';
        approvedBtn.style.color = '#1976d2';
        rejectedBtn.style.background = 'var(--danger)';
        rejectedBtn.style.color = '#fff';
      }
    }
    // Fetch and render trainers for the selected section
    if (section === 'pending') {
      const trainers = await fetchTrainersByStatus('pending');
      renderPendingTrainers(trainers);
    } else if (section === 'approved') {
      const trainers = await fetchTrainersByStatus('approved');
      renderApprovedTrainers(trainers);
    } else if (section === 'rejected') {
      const trainers = await fetchTrainersByStatus('rejected');
      renderRejectedTrainers(trainers);
    }
  }

  // Fetch trainers by status
  async function fetchTrainersByStatus(status) {
    const token = localStorage.getItem('gymAdminToken');
    let gymId = null;
    if (window.currentGymProfile?._id) {
      gymId = window.currentGymProfile._id;
    } else if (window.currentGymProfile?.id) {
      gymId = window.currentGymProfile.id;
    } else if (typeof currentGymProfile === 'object' && currentGymProfile._id) {
      gymId = currentGymProfile._id;
    }
    if (!token || !gymId) return [];
    try {
      const res = await fetch(`${BASE_URL}/api/trainers?status=${status}&gym=${gymId}`,
        { headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch trainers');
      const trainers = await res.json();
      return Array.isArray(trainers) ? trainers.filter(t => t.gym === gymId || (t.gym && (t.gym._id === gymId || t.gym === gymId))) : [];
    } catch (err) {
      console.error('Error fetching trainers:', err);
      return [];
    }
  }

  // Render trainer cards in the pending grid
  function renderPendingTrainers(trainers) {
    if (!pendingGrid) return;
    if (!Array.isArray(trainers) || trainers.length === 0) {
      pendingGrid.innerHTML = '<div style="color:#888;text-align:center;width:100%;padding:32px 0;">No pending trainers found.</div>';
      return;
    }
    pendingGrid.innerHTML = trainers.map(createTrainerCard).join('');
  }
  // Render trainer cards in the approved grid
  function renderApprovedTrainers(trainers) {
    if (!approvedGrid) return;
    if (!Array.isArray(trainers) || trainers.length === 0) {
      approvedGrid.innerHTML = '<div style="color:#888;text-align:center;width:100%;padding:32px 0;">No approved trainers found.</div>';
      return;
    }
    approvedGrid.innerHTML = trainers.map(createTrainerCard).join('');
  }
  // Render trainer cards in the rejected grid
  function renderRejectedTrainers(trainers) {
    if (!rejectedGrid) return;
    if (!Array.isArray(trainers) || trainers.length === 0) {
      rejectedGrid.innerHTML = '<div style="color:#888;text-align:center;width:100%;padding:32px 0;">No rejected trainers found.</div>';
      return;
    }
    rejectedGrid.innerHTML = trainers.map(createTrainerCard).join('');
  }

  if (pendingBtn) pendingBtn.addEventListener('click', () => showSection('pending'));
  if (approvedBtn) approvedBtn.addEventListener('click', () => showSection('approved'));
  if (rejectedBtn) rejectedBtn.addEventListener('click', () => showSection('rejected'));
  showSection('pending');



  // Create a trainer card (basic info)
  function createTrainerCard(trainer) {
    // Support both 'photo' and 'image' (backend may send either)
    let imgSrc = 'https://via.placeholder.com/80?text=Photo';
    if (trainer.photo && typeof trainer.photo === 'string' && trainer.photo.startsWith('/')) {
      imgSrc = `${BASE_URL}${trainer.photo}`;
    } else if (trainer.image && typeof trainer.image === 'string' && trainer.image.startsWith('/')) {
      imgSrc = `${BASE_URL}${trainer.image}`;
    } else if (trainer.photo && typeof trainer.photo === 'string') {
      imgSrc = trainer.photo;
    } else if (trainer.image && typeof trainer.image === 'string') {
      imgSrc = trainer.image;
    }
    // Determine if approved
    const isApproved = (trainer.status && trainer.status.toLowerCase() === 'approved');
    return `
      <div class="trainer-card" style="background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.07);padding:18px;display:flex;flex-direction:column;align-items:center;gap:10px;min-width:220px;max-width:260px;margin:10px auto;position:relative;">
        <img src="${imgSrc}" alt="Profile" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #1976d2;">
        <div style="font-weight:600;font-size:1.1em;">${trainer.firstName || ''} ${trainer.lastName || ''}</div>
        <div style="color:#1976d2;font-size:0.98em;">${trainer.specialty || ''}</div>
        <div style="font-size:0.97em;color:#555;">${trainer.email || ''}</div>
        <div style="font-size:0.97em;color:#555;">${trainer.phone || ''}</div>
        <div style="font-size:0.95em;color:#888;">Experience: ${trainer.experience || 0} yrs</div>
        <div style="font-size:0.95em;color:#888;">Rate: ₹${trainer.rate || 0}/hr</div>
        ${isApproved ? `<span class="approved-badge" style="position:absolute;top:10px;right:10px;background:#4CAF50;color:#fff;padding:5px 14px;border-radius:16px;font-size:0.98em;font-weight:700;display:flex;align-items:center;gap:6px;"><i class='fas fa-check-circle'></i> Approved</span>` : ''}
      </div>
    `;
  }

  // Fetch and display pending trainers when tab is shown
  window.showTrainerTab = async function() {
    showSection('pending');
    const trainers = await fetchPendingTrainers();
    renderPendingTrainers(trainers);
  };


 // End Trainer Tab Logic
  const availBtns = [
    { id: 'setAllMorning', value: '7am-11am' },
    { id: 'setAllAfternoon', value: '12pm-4pm' },
    { id: 'setAllEvening', value: '5pm-9pm' }
  ];
  availBtns.forEach(btn => {
    const el = document.getElementById(btn.id);
    if (el) {
      el.addEventListener('click', function() {
        document.querySelectorAll('.day-availability').forEach(input => {
          input.value = btn.value;
        });
      });
    }
  });
  const clearBtn = document.getElementById('clearAllAvailability');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      document.querySelectorAll('.day-availability').forEach(input => {
        input.value = '';
      });
    });
  }

  // Optional: On form submit, combine all day fields into a summary string (if needed)
  const trainerForm = document.getElementById('trainerRegistrationForm');
  if (trainerForm) {
    trainerForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const textarea = document.getElementById('trainerAvailability');
      const summary = getAvailabilitySummary();
      if (textarea && !textarea.value.trim() && summary) {
        textarea.value = summary;
      }

      const formData = new FormData(trainerForm);
      appendLocations(formData, trainerForm);
      if (textarea?.value.trim()) {
        formData.set('availability', textarea.value.trim());
      }
      appendGymId(formData);
      appendProfileImage(formData);

      const submitBtn = trainerForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        showTrainerRegistrationDialog();
        resetTrainerFormUI(trainerForm, textarea);
        await submitTrainerRegistration(formData);
      } catch (err) {
        showDialog({
          title: 'Server Error',
          message: err?.message ? err.message : 'Server error. Please try again.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#d32f2f;font-size:2em;"></i>'
        });
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    function getAvailabilitySummary() {
      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      return days.map(day => {
        const val = document.querySelector('.day-availability[data-day="'+day+'"]')?.value.trim();
        return val ? `${day}: ${val}` : '';
      }).filter(Boolean).join('; ');
    }

    function appendLocations(formData, form) {
      const locations = Array.from(form.querySelectorAll('[name="locations"]:checked')).map(el => el.value);
      if (locations.length) {
        formData.delete('locations');
        locations.forEach(loc => formData.append('locations', loc));
      }
    }

    function appendGymId(formData) {
      let gymId = null;
      if (window.currentGymProfile?._id) {
        gymId = window.currentGymProfile._id;
      } else if (window.currentGymProfile?.id) {
        gymId = window.currentGymProfile.id;
      } else if (typeof currentGymProfile === 'object' && currentGymProfile._id) {
        gymId = currentGymProfile._id;
      }
      if (gymId) {
        formData.set('gym', gymId);
      }
    }

    function appendProfileImage(formData) {
      const profileImageInput = document.getElementById('trainerProfileImage');
      if (profileImageInput?.files?.[0]) {
        formData.set('profileImage', profileImageInput.files[0]);
      }
    }

    function showTrainerRegistrationDialog() {
      showDialog({
        title: 'Trainer Registration Submitted',
        message: 'Your trainer application has been submitted and is pending admin approval.',
        confirmText: 'OK',
        iconHtml: '<i class="fas fa-check-circle" style="color:#38b000;font-size:2em;"></i>',
        onConfirm: function() {
          const trainerModal = document.getElementById('trainerRegistrationModal');
          if (trainerModal) {
            trainerModal.style.display = 'none';
            document.body.style.overflow = '';
          }
        }
      });
    }

    function resetTrainerFormUI(form, textarea) {
      form.reset();
      if (textarea) textarea.value = '';
      const trainerImageTag = document.getElementById('trainerImageTag');
      if (trainerImageTag) trainerImageTag.src = 'https://via.placeholder.com/96?text=Photo';
    }

    async function submitTrainerRegistration(formData) {
      const res = await fetch('${BASE_URL}/api/trainers/register', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const data = await res.json();
        showDialog({
          title: 'Registration Error',
          message: (data && data.message) ? data.message : 'Submission failed.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#d32f2f;font-size:2em;"></i>'
        });
      }
    }
  }
});
// --- Trainer Registration Modal Logic ---
document.addEventListener('DOMContentLoaded', function() {
  // Add Trainer Quick Action Button (by class or id)
  let addTrainerBtn = document.getElementById('addTrainerBtn');
  if (!addTrainerBtn) {
    // Try to find by quick action (if you use a quick-action-list)
    addTrainerBtn = Array.from(document.querySelectorAll('.quick-action-btn')).find(btn => btn.textContent?.toLowerCase().includes('add trainer'));
  }
  const trainerModal = document.getElementById('trainerRegistrationModal');
  const closeTrainerModal = document.getElementById('closeTrainerRegistrationModal');
  // Open modal (Quick Actions: remove any inline style set on the button or card)
  if (addTrainerBtn && trainerModal) {
    // Remove inline style from the quick action button (if any)
    addTrainerBtn.removeAttribute('style');
    // Remove inline style from the parent card if it's a quick-action-card
    const quickActionCard = addTrainerBtn.closest('.quick-action-card');
    if (quickActionCard) quickActionCard.removeAttribute('style');
    addTrainerBtn.addEventListener('click', function() {
      trainerModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      // Remove any inline style from Quick Actions card and its button (if present)
      const quickActionCard = document.querySelector('.quick-action-card');
      if (quickActionCard) quickActionCard.removeAttribute('style');
      addTrainerBtn.removeAttribute('style');
    });
  }
  // Close modal
  if (closeTrainerModal && trainerModal) {
    closeTrainerModal.onclick = function() {
      trainerModal.style.display = 'none';
      document.body.style.overflow = '';
    };
  }
  // Close modal if clicking outside modal-content
  if (trainerModal) {
    trainerModal.addEventListener('mousedown', function(e) {
      if (e.target === trainerModal) {
        trainerModal.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  }
});
// --- Membership Plans Section (Dynamic, Editable, Backend Sync) ---
document.addEventListener('DOMContentLoaded', function() {
  // Membership plans state
  let plans = [
    { name: 'Basic', price: 800, discount: 0, discountMonths: 0, benefits: ['Gym Access', 'Group Classes'], note: 'Best for beginners', icon: 'fa-leaf', color: '#38b000' },
    { name: 'Standard', price: 1200, discount: 10, discountMonths: 6, benefits: ['All Basic Benefits', 'Diet Plan', 'Locker Facility'], note: 'Most Popular', icon: 'fa-star', color: '#3a86ff' },
    { name: 'Premium', price: 1800, discount: 15, discountMonths: 12, benefits: ['All Standard Benefits', 'Personal Trainer', 'Spa & Sauna'], note: 'For serious fitness', icon: 'fa-gem', color: '#8338ec' }
  ];
  // DOM refs
  const plansList = document.getElementById('plansList');
  const editPlansBtn = document.getElementById('editPlansBtn');
  const planEditorModal = document.getElementById('planEditorModal');
  const closePlanEditorModal = document.getElementById('closePlanEditorModal');
  const planEditorForm = document.getElementById('planEditorForm');
  const planEditorCards = document.getElementById('planEditorCards');
  const cancelPlanEditBtn = document.getElementById('cancelPlanEditBtn');

  // Fetch plans from backend
  async function fetchPlans() {
    try {
      const token = localStorage.getItem('gymAdminToken');
      const res = await fetch('${BASE_URL}/api/gyms/membership-plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length === 3) plans = data;
      }
    } catch (e) { 
      console.error('Error fetching plans:', e); // Log the error for debugging
    }
    renderPlans();
    updateDiscountedFees();
  }

  // Render plans in dashboard
  function renderPlans() {
    if (!plansList) return;
    plansList.innerHTML = plans.map((plan, idx) => `
      <div class="plan-card" data-plan="${plan.name}" style="background:#f6f8fc;border-radius:12px;padding:22px 16px;box-shadow:0 2px 10px ${plan.color}11;display:flex;flex-direction:column;align-items:center;">
        <i class="fas ${plan.icon}" style="font-size:2.2em;color:${plan.color};margin-bottom:8px;"></i>
        <div style="font-weight:700;font-size:1.15em;margin-bottom:6px;">${plan.name}</div>
        <div style="font-size:1.5em;font-weight:700;color:#1976d2;margin-bottom:6px;">₹${plan.price}/mo</div>
        <div style="color:${plan.color};font-weight:600;margin-bottom:8px;">${plan.discount > 0 ? `${plan.discount}% Off on ${plan.discountMonths}+ months` : 'No Discount'}</div>
        <ul style="list-style:none;padding:0;margin:0 0 10px 0;font-size:0.98em;color:#333;text-align:left;">
          ${plan.benefits.map(b => `<li><i class="fas fa-check-circle" style="color:${plan.color};margin-right:6px;"></i> ${b}</li>`).join('')}
        </ul>
        <div style="font-size:0.95em;color:#888;">${plan.note || ''}</div>
      </div>
    `).join('');
  }

  // Open Plan Editor Modal
  if (editPlansBtn && planEditorModal && planEditorCards) {
    editPlansBtn.onclick = async function() {
      await fetchPlans();
      planEditorModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      renderPlanEditorCards();
    };
  }
  function closePlanEditor() {
    planEditorModal.style.display = 'none';
    document.body.style.overflow = '';
  }
  if (closePlanEditorModal) closePlanEditorModal.onclick = closePlanEditor;
  if (cancelPlanEditBtn) cancelPlanEditBtn.onclick = closePlanEditor;
  if (planEditorModal) {
    planEditorModal.addEventListener('mousedown', function(e) {
      if (e.target === planEditorModal) closePlanEditor();
    });
  }

  // Render Plan Editor Cards
  function renderPlanEditorCards() {
    // FontAwesome icon options (add more as needed)
    const iconOptions = [
      'fa-leaf', 'fa-star', 'fa-gem', 'fa-dumbbell', 'fa-heart', 'fa-fire', 'fa-bolt', 'fa-crown', 'fa-medal', 'fa-trophy', 'fa-user-shield', 'fa-rocket', 'fa-mountain', 'fa-bicycle', 'fa-running', 'fa-swimmer', 'fa-apple-alt', 'fa-shield-alt', 'fa-thumbs-up', 'fa-check-circle'
    ];
    planEditorCards.innerHTML = '';
    plans.forEach((plan, idx) => {
      // Benefits as comma-separated string
      const benefitsStr = plan.benefits ? plan.benefits.join(', ') : '';
      // Card HTML
      const card = document.createElement('div');
      card.className = 'plan-editor-card';
      card.style = 'background:#f8f9fa;border-radius:12px;padding:18px;min-width:220px;max-width:260px;flex:1 1 220px;box-shadow:0 2px 8px rgba(0,0,0,0.04);margin-bottom:12px;';
      card.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span class="plan-icon" style="font-size:2em;color:${plan.color};cursor:pointer;" data-plan-idx="${idx}" title="Change icon or color"><i class="fas ${plan.icon}"></i></span>
          <input type="text" class="plan-name-input" data-plan-idx="${idx}" value="${plan.name}" style="font-size:1.1em;font-weight:600;border:none;background:transparent;outline:none;width:100px;">
        </div>
        <div class="icon-color-picker-wrap" id="iconColorPickerWrap${idx}" style="display:none;">
          <div class="icon-picker" style="margin-bottom:10px;">
            <label style="font-weight:500;">Icon:</label>
            <div class="icon-picker-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
              ${iconOptions.map(icon => `
                <button type="button" class="icon-picker-btn${plan.icon === icon ? ' selected' : ''}" data-plan-idx="${idx}" data-icon="${icon}" aria-label="${icon.replace('fa-', '')}" style="font-size:1.3em;padding:6px;border-radius:6px;border:${plan.icon === icon ? '2px solid #1976d2' : '1px solid #ccc'};background:${plan.icon === icon ? '#e3f2fd' : '#fff'};color:#333;outline:none;cursor:pointer;transition:all 0.15s;">
                  <i class="fas ${icon}"></i>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="color-picker" style="margin-bottom:10px;">
            <label style="font-weight:500;">Color:</label>
            <input type="color" class="plan-color-input" data-plan-idx="${idx}" value="${plan.color}" style="margin-left:10px;width:36px;height:36px;border:none;outline:none;cursor:pointer;vertical-align:middle;">
          </div>
        </div>
        <div style="margin-bottom:8px;">
          <label>Price (₹):</label>
          <input type="number" class="plan-price-input" data-plan-idx="${idx}" value="${plan.price}" min="0" style="width:80px;margin-left:8px;">
        </div>
        <div style="margin-bottom:8px;">
          <label>Discount (%):</label>
          <input type="number" class="plan-discount-input" data-plan-idx="${idx}" value="${plan.discount}" min="0" max="100" style="width:60px;margin-left:8px;">
          <label style="margin-left:10px;">For</label>
          <input type="number" class="plan-discount-months-input" data-plan-idx="${idx}" value="${plan.discountMonths}" min="0" max="24" style="width:50px;margin-left:6px;"> <span>months</span>
        </div>
        <div style="margin-bottom:8px;">
          <label>Benefits:</label>
          <input type="text" class="plan-benefits-input" data-plan-idx="${idx}" value="${benefitsStr}" placeholder="Comma separated" style="width:100%;margin-top:4px;">
        </div>
        <div style="margin-bottom:8px;">
          <label>Note:</label>
          <input type="text" class="plan-note-input" data-plan-idx="${idx}" value="${plan.note}" style="width:100%;margin-top:4px;">
        </div>
      `;
      planEditorCards.appendChild(card);
    });
    // Icon click to toggle picker
    planEditorCards.querySelectorAll('.plan-icon').forEach(iconEl => {
      iconEl.addEventListener('click', function() {
        const idx = +this.getAttribute('data-plan-idx');
        const picker = document.getElementById('iconColorPickerWrap' + idx);
        if (picker) picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
      });
    });
    // Icon picker event
    planEditorCards.querySelectorAll('.icon-picker-btn').forEach(btn => {
      btn.addEventListener('click', iconPickerBtnClickHandler);
    });

    function iconPickerBtnClickHandler() {
      const idx = +this.getAttribute('data-plan-idx');
      const icon = this.getAttribute('data-icon');
      plans[idx].icon = icon;
      renderPlanEditorCards();
      // Keep picker open after icon change
      setTimeout(() => showPlanIconColorPicker(idx), 0);
    }
    // Color picker event
    planEditorCards.querySelectorAll('.plan-color-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].color = this.value;
        renderPlanEditorCards();
        // Keep picker open after color change
        setTimeout(() => showPlanIconColorPicker(idx), 0);
      });
    });
    // Other field events (name, price, discount, etc.)
    planEditorCards.querySelectorAll('.plan-name-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].name = this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-price-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].price = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-discount-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].discount = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-discount-months-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].discountMonths = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-benefits-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].benefits = this.value.split(',').map(b => b.trim()).filter(Boolean);
      });
    });
    planEditorCards.querySelectorAll('.plan-note-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].note = this.value;
      });
    });
    // Icon picker event
    planEditorCards.querySelectorAll('.icon-picker-btn').forEach(btn => {
      btn.addEventListener('click', function() {
    // Icon picker event
    planEditorCards.querySelectorAll('.icon-picker-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = +this.getAttribute('data-plan-idx');
        const icon = this.getAttribute('data-icon');
        plans[idx].icon = icon;
        renderPlanEditorCards();
        // Keep picker open after icon change
        setTimeout(() => showPlanIconColorPicker(idx), 0);
      });
    });
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].color = this.value;
        renderPlanEditorCards();
      });
    });
    // Other field events (name, price, discount, etc.)
    planEditorCards.querySelectorAll('.plan-name-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].name = this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-price-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].price = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-discount-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].discount = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-discount-months-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].discountMonths = +this.value;
      });
    });
    planEditorCards.querySelectorAll('.plan-benefits-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].benefits = this.value.split(',').map(b => b.trim()).filter(Boolean);
      });
    });
    planEditorCards.querySelectorAll('.plan-note-input').forEach(input => {
      input.addEventListener('input', function() {
        const idx = +this.getAttribute('data-plan-idx');
        plans[idx].note = this.value;
      });
    });
}

// Helper function to keep the icon/color picker open after re-render
function showPlanIconColorPicker(idx) {
  const picker = document.getElementById('iconColorPickerWrap' + idx);
  if (picker) picker.style.display = 'block';
}
  // Save Plans to Backend
  if (planEditorForm) {
    planEditorForm.onsubmit = async function(e) {
      e.preventDefault();
      // Collect values (from plans state, which now includes icon/color)
      const newPlans = plans.map((plan, idx) => ({
        ...plan
      }));
      // Save to backend
      try {
        const token = localStorage.getItem('gymAdminToken');
        const res = await fetch('${BASE_URL}/api/gyms/membership-plans', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newPlans)
        });
        if (res.ok) {
          plans = newPlans;
          renderPlans();
          closePlanEditor();
          showDialog({
            title: 'Plans Updated',
            message: 'Membership plans updated successfully.',
            confirmText: 'OK',
            iconHtml: '<i class="fas fa-check-circle" style="color:#38b000;"></i>'
          });
        } else {
          showDialog({
            title: 'Error',
            message: 'Failed to update plans.',
            confirmText: 'OK',
            iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ef233c;"></i>'
          });
        }
      } catch (err) {
        console.error('Error updating plans:', err); // Log the error for debugging
        showDialog({
          title: 'Error',
          message: 'Server error. Please try again.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ef233c;"></i>'
        });
      }
    };
  }

  // Discounted Fees Example (dynamic)
  const planTypeSelect = document.getElementById('planTypeSelect');
  const monthsInput = document.getElementById('monthsInput');
  const calcBtn = document.getElementById('calcDiscountBtn');
  const resultSpan = document.getElementById('discountedFeesResult');
  function updateDiscountedFees() {
    if (!planTypeSelect || !monthsInput || !resultSpan) return;
    const planName = planTypeSelect.value;
    const months = parseInt(monthsInput.value, 10) || 1;
    const plan = plans.find(p => p.name === planName) || plans[0];
    const price = plan.price * months;
    const discount = (months >= plan.discountMonths) ? plan.discount : 0;
    const discounted = price * (1 - discount / 100);
    if (discount > 0) {
      resultSpan.innerHTML = `Total: <s>₹${price}</s> <span style='color:#38b000;'>₹${discounted.toFixed(0)}</span> <span style='color:#ffbe0b;'>(-${discount}% off)</span>`;
    } else {
      resultSpan.innerHTML = `Total: ₹${price}`;
    }
  }
  if (calcBtn) calcBtn.onclick = updateDiscountedFees;
  if (planTypeSelect) planTypeSelect.onchange = updateDiscountedFees;
  if (monthsInput) monthsInput.oninput = updateDiscountedFees;

  // Initial render
  fetchPlans();
});
// --- Remove Member Button Dropdown Logic ---
// (showDialog is now defined only once at the top of the file, remove this duplicate)
document.addEventListener('DOMContentLoaded', function () {
  const removeMemberBtnTab = document.getElementById('removeMemberBtnTab');
  let removeDropdown = null;

  if (removeMemberBtnTab) {
    removeMemberBtnTab.addEventListener('click', function (e) {
      e.preventDefault();
      // Remove any existing dropdown
      if (removeDropdown) removeDropdown.remove();

      // Create dropdown
      removeDropdown = document.createElement('div');
      removeDropdown.className = 'remove-member-dropdown';
      removeDropdown.innerHTML = `
        <button class="remove-dropdown-option" id="removeExpiredMembersBtn">
          <i class="fas fa-user-slash" style="color:#d32f2f;margin-right:8px;"></i>
          Remove Expired (7+ days)
        </button>
        <button class="remove-dropdown-option" id="customRemoveMembersBtn">
          <i class="fas fa-user-cog" style="color:#1976d2;margin-right:8px;"></i>
          Custom Remove
        </button>
      `;

      // Position dropdown below the button, adjust for mobile view
      const rect = removeMemberBtnTab.getBoundingClientRect();
      removeDropdown.style.position = 'absolute';
      removeDropdown.style.top = (rect.bottom + window.scrollY + 8) + 'px';
      // Default left position
      let left = rect.left + window.scrollX;
      // If on mobile (screen width <= 600px), ensure dropdown doesn't overflow right edge
      if (window.innerWidth <= 600) {
        const dropdownWidth = 220;
        if (left + dropdownWidth > window.innerWidth - 8) {
          left = window.innerWidth - dropdownWidth - 8; // 8px margin from right
          if (left < 8) left = 8; // 8px min left margin
        }
      }
      removeDropdown.style.left = left + 'px';
      removeDropdown.style.zIndex = 10000;
      removeDropdown.style.background = '#fff';
      removeDropdown.style.boxShadow = '0 4px 18px 0 rgba(0,0,0,0.10)';
      removeDropdown.style.borderRadius = '10px';
      removeDropdown.style.padding = '8px 0';
      removeDropdown.style.minWidth = '220px';

      document.body.appendChild(removeDropdown);

      // Remove dropdown on outside click
      function handleOutsideClick(ev) {
        if (!removeDropdown.contains(ev.target) && ev.target !== removeMemberBtnTab) {
          removeDropdown.remove();
          document.removeEventListener('mousedown', handleOutsideClick);
        }
      }
      setTimeout(() => {
        document.addEventListener('mousedown', handleOutsideClick);
      }, 0);


      // Remove expired members logic
      document.getElementById('removeExpiredMembersBtn').onclick = function () {
        removeDropdown.remove();
        showDialog({
          title: 'Remove Expired Members',
          message: 'Remove all members whose membership expired more than 7 days ago?',
          confirmText: 'Remove',
          cancelText: 'Cancel',
          showCancel: true,
          iconHtml: '<i class="fas fa-user-slash" style="color:#d32f2f;"></i>',
          onConfirm: async function () {
            const token = localStorage.getItem('gymAdminToken');
            try {
              const res = await fetch('${BASE_URL}/api/members', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const members = await res.json();
              const now = new Date();
              const expired = (Array.isArray(members) ? members : []).filter(m => {
                if (!m.membershipValidUntil) return false;
                const valid = new Date(m.membershipValidUntil);
                return (now - valid) / (1000 * 60 * 60 * 24) > 7;
              });
              if (!expired.length) {
                showDialog({
                  title: 'No Expired Members',
                  message: 'No expired members found.',
                  confirmText: 'OK',
                  iconHtml: '<i class="fas fa-info-circle" style="color:#1976d2;"></i>'
                });
                return;
              }
              let removed = 0;
              for (const m of expired) {
                await fetch(`${BASE_URL}/api/members/${m._id}`, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                removed++;
              }
              showDialog({
                title: 'Members Removed',
                message: `Removed ${removed} expired member(s).`,
                confirmText: 'OK',
                iconHtml: '<i class="fas fa-check-circle" style="color:#38b000;"></i>',
                onConfirm: function () {
                  if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
                  // Update member stats after removal
                  if (typeof updateMembersStatsCard === 'function') updateMembersStatsCard();
                  // Refresh payment stats to show accurate data from payment records
                  if (typeof updatePaymentsStatsCard === 'function') updatePaymentsStatsCard();
                }
              });
            } catch (err) {
              console.error('Error occurred while removing expired members:', err);
              showDialog({
                title: 'Error',
                message: 'Error removing expired members.',
                confirmText: 'OK',
                iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#ef233c;"></i>'
              });
            }
          }
        });
      };

      // Custom remove logic (interactive layout)
      document.getElementById('customRemoveMembersBtn').onclick = function () {
        removeDropdown.remove();
        showCustomRemoveMembersModal();
      };
    });
  }

  // Interactive custom remove modal
  function showCustomRemoveMembersModal() {
    // Remove any existing modal
    let modal = document.getElementById('customRemoveMembersModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'customRemoveMembersModal';
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.zIndex = '100000';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px; height: 80vh; display: flex; flex-direction: column; overflow: hidden;">
        <div class="modal-header-style" style="flex-shrink: 0; padding: 20px; border-bottom: 1px solid var(--border-color);">
          <h3 class="modal-title-style">
            <i class="fas fa-user-minus" style="color: #dc3545; margin-right: 8px;"></i>
            Remove Members
          </h3>
          <button class="modal-close" id="closeCustomRemoveMembersModal">&times;</button>
        </div>
        
        <div class="modal-body" style="flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column;">
          <div class="form-group" style="margin-bottom: 20px; flex-shrink: 0;">
            <label for="customRemoveSearch" class="form-label">
              <i class="fas fa-search" style="margin-right: 6px; color: var(--primary);"></i>
              Search Members
            </label>
            <input type="text" 
                   id="customRemoveSearch" 
                   class="form-control" 
                   placeholder="Search by name, email, or membership ID..."
                   style="margin-top: 8px; width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px;">
          </div>
          
          <div class="members-selection-container" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
            <div class="selected-count-badge" id="selectedCountBadge" style="display: none;">
              <i class="fas fa-check-circle"></i>
              <span id="selectedCountText">0 selected</span>
            </div>
            
            <div id="customRemoveMembersList" 
                 style="flex: 1; 
                        overflow-y: auto; 
                        border: 1px solid var(--border-color); 
                        border-radius: 8px; 
                        background: var(--card-bg);
                        min-height: 200px;
                        max-height: none;">
              <div class="loading-state" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
                <div>Loading members...</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer" style="flex-shrink: 0; display: flex; justify-content: flex-end; gap: 12px; padding: 20px; border-top: 1px solid var(--border-color); background: white;">
          <button class="btn btn-secondary" id="cancelCustomRemoveBtn" style="padding: 10px 20px; border: 1px solid #ccc; background: #f8f9fa; color: #333; border-radius: 6px; cursor: pointer; font-size: 14px;">
            <i class="fas fa-times" style="margin-right: 6px;"></i>
            Cancel
          </button>
          <button class="btn btn-danger" id="confirmCustomRemoveBtn" disabled style="padding: 10px 20px; border: none; background: #dc3545; color: white; border-radius: 6px; cursor: pointer; font-size: 14px; opacity: 0.6;">
            <i class="fas fa-user-minus" style="margin-right: 6px;"></i>
            Remove Selected
          </button>
        </div>
      </div>
      
      <style>
        .members-selection-container {
          position: relative;
        }
        
        .selected-count-badge {
          position: absolute;
          top: -12px;
          right: 8px;
          background: #28a745;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .member-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color, #e9ecef);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          background: white;
        }
        
        .member-item:hover {
          background: #f8f9fa;
        }
        
        .member-item.selected {
          background: #e3f2fd;
          border-left: 4px solid #1976d2;
        }
        
        .member-item:last-child {
          border-bottom: none;
        }
        
        .member-checkbox {
          margin-right: 12px;
          transform: scale(1.2);
          cursor: pointer;
        }
        
        .member-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 12px;
          border: 2px solid #e9ecef;
        }
        
        .member-info {
          flex: 1;
        }
        
        .member-name {
          font-weight: 600;
          color: #333;
          margin-bottom: 2px;
        }
        
        .member-details {
          color: #666;
          font-size: 0.9rem;
        }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }
        
        .empty-state i {
          font-size: 2rem;
          margin-bottom: 12px;
          color: #999;
        }
        
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed !important;
        }
        
        .btn:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        
        .btn-danger:not(:disabled) {
          background: #dc3545 !important;
          opacity: 1 !important;
        }
        
        .btn-danger:not(:disabled):hover {
          background: #c82333 !important;
        }
        
        .btn-secondary:hover {
          background: #e2e6ea !important;
          border-color: #adb5bd !important;
        }
        
        /* Ensure modal content doesn't exceed viewport */
        .modal-content {
          max-height: 90vh !important;
        }
        
        /* Custom scrollbar for member list */
        #customRemoveMembersList::-webkit-scrollbar {
          width: 6px;
        }
        
        #customRemoveMembersList::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        #customRemoveMembersList::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 3px;
        }
        
        #customRemoveMembersList::-webkit-scrollbar-thumb:hover {
          background: #999;
        }
        
        /* Responsive design for smaller screens */
        @media (max-width: 768px) {
          .modal-content {
            max-width: 95vw !important;
            height: 85vh !important;
            margin: 10px;
          }
          
          .modal-body {
            padding: 15px !important;
          }
          
          .modal-footer {
            padding: 15px !important;
            flex-direction: column-reverse;
          }
          
          .modal-footer .btn {
            width: 100%;
            margin-bottom: 10px;
          }
          
          .member-item {
            padding: 10px 12px !important;
          }
          
          .member-details {
            font-size: 0.8rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .modal-content {
            max-width: 100vw !important;
            height: 100vh !important;
            margin: 0;
            border-radius: 0 !important;
          }
          
          .modal-header-style {
            padding: 15px !important;
          }
          
          .modal-title-style {
            font-size: 1.1rem !important;
          }
        }
      </style>
    `;
    document.body.appendChild(modal);

    // Close modal handlers
    document.getElementById('closeCustomRemoveMembersModal').onclick = closeModal;
    document.getElementById('cancelCustomRemoveBtn').onclick = closeModal;
    
    function closeModal() {
      modal.remove();
      document.body.style.overflow = '';
    }
    
    // Close on backdrop click
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    // Fetch and render members
    const token = localStorage.getItem('gymAdminToken');
    fetch('${BASE_URL}/api/members', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(members => {
        renderCustomRemoveMembersList(members, '');
        
        // Search functionality
        const searchInput = document.getElementById('customRemoveSearch');
        searchInput.addEventListener('input', function(e) {
          renderCustomRemoveMembersList(members, e.target.value);
        });
      })
      .catch(error => {
        console.error('Error fetching members:', error);
        const list = document.getElementById('customRemoveMembersList');
        list.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <div>Error loading members</div>
            <small>Please try again or contact support</small>
          </div>
        `;
      });

    // Render members with enhanced UI
    function renderCustomRemoveMembersList(members, filter) {
      const list = document.getElementById('customRemoveMembersList');
      const selectedCountBadge = document.getElementById('selectedCountBadge');
      const selectedCountText = document.getElementById('selectedCountText');
      const confirmBtn = document.getElementById('confirmCustomRemoveBtn');
      
      if (!list) return;
      
      let filtered = Array.isArray(members) ? members : [];
      if (filter) {
        const f = filter.toLowerCase();
        filtered = filtered.filter(m =>
          (m.memberName?.toLowerCase().includes(f)) ||
          (m.email?.toLowerCase().includes(f)) ||
          (m.membershipId?.toLowerCase().includes(f)) ||
          (m.phone?.toLowerCase().includes(f))
        );
      }

      if (!filtered.length) {
        list.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-search"></i>
            <div>${filter ? 'No members found matching your search' : 'No members found'}</div>
            <small>${filter ? 'Try adjusting your search terms' : 'Add some members first'}</small>
          </div>
        `;
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.6';
        confirmBtn.style.cursor = 'not-allowed';
        selectedCountBadge.style.display = 'none';
        return;
      }

      list.innerHTML = filtered.map(m => `
        <div class="member-item" onclick="toggleMemberSelection('${m.membershipId || ''}')">
          <input type="checkbox" 
                 class="custom-remove-checkbox member-checkbox" 
                 value="${m.membershipId || ''}" 
                 onclick="event.stopPropagation();">
          <img src="${m.profileImage ? `${BASE_URL}${m.profileImage}` : 'https://via.placeholder.com/40x40/e9ecef/6c757d?text=' + (m.memberName?.[0] || 'M')}" 
               alt="${m.memberName || 'Member'}" 
               class="member-avatar"
               onerror="this.src='https://via.placeholder.com/40x40/e9ecef/6c757d?text=' + '${(m.memberName?.[0] || 'M')}'">
          <div class="member-info">
            <div class="member-name">${m.memberName || 'Unknown'}</div>
            <div class="member-details">
              ${m.membershipId || 'No ID'} • ${m.email || 'No email'} 
              ${m.phone ? '• ' + m.phone : ''}
            </div>
          </div>
        </div>
      `).join('');

      // Add event listeners and update selection state
      const checkboxes = list.querySelectorAll('.custom-remove-checkbox');
      
      function updateSelectionState() {
        const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        const memberItems = list.querySelectorAll('.member-item');
        
        // Update visual state of member items
        checkboxes.forEach((cb, index) => {
          if (memberItems[index]) {
            memberItems[index].classList.toggle('selected', cb.checked);
          }
        });
        
        // Update count badge
        if (selectedCount > 0) {
          selectedCountBadge.style.display = 'block';
          selectedCountText.textContent = `${selectedCount} selected`;
        } else {
          selectedCountBadge.style.display = 'none';
        }
        
        // Update confirm button with proper styling
        if (selectedCount === 0) {
          confirmBtn.disabled = true;
          confirmBtn.style.opacity = '0.6';
          confirmBtn.style.cursor = 'not-allowed';
          confirmBtn.style.background = '#dc3545';
        } else {
          confirmBtn.disabled = false;
          confirmBtn.style.opacity = '1';
          confirmBtn.style.cursor = 'pointer';
          confirmBtn.style.background = '#dc3545';
        }
      }

      checkboxes.forEach(cb => {
        cb.addEventListener('change', updateSelectionState);
      });

      // Initial state
      updateSelectionState();

      // Confirm remove functionality - auto close and show confirmation
      confirmBtn.onclick = function() {
        const selected = Array.from(checkboxes).filter(c => c.checked);
        if (!selected.length) return;
        
        const selectedIds = selected.map(c => c.value);
        const selectedMembers = filtered.filter(m => selectedIds.includes(m.membershipId));
        
        // Close selection modal immediately
        closeModal();
        
        // Show confirmation dialog with enhanced details
        setTimeout(() => {
          showDialog({
            title: 'Confirm Member Removal',
            message: `Are you sure you want to remove ${selected.length} member${selected.length > 1 ? 's' : ''}?\n\n` +
                    `Members to be removed:\n${selectedMembers.map(m => `• ${m.memberName} (${m.membershipId})`).join('\n')}` +
                    `\n\nThis action cannot be undone.`,
            confirmText: 'Remove Members',
            cancelText: 'Cancel',
            iconHtml: '<i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 2rem;"></i>',
            onConfirm: async function() {
              try {
                showDialog({
                  title: 'Processing...',
                  message: 'Removing selected members...',
                  confirmText: 'Please wait...',
                  iconHtml: '<i class="fas fa-spinner fa-spin" style="color: #1976d2; font-size: 2rem;"></i>'
                });

                const res = await fetch('${BASE_URL}/api/members/bulk', {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ membershipIds: selectedIds })
                });
                
                const data = await res.json();
                
                if (!res.ok) {
                  showDialog({
                    title: 'Error',
                    message: data?.message || 'Failed to remove members. Please try again.',
                    confirmText: 'OK',
                    iconHtml: '<i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 2rem;"></i>'
                  });
                  return;
                }

                // Success dialog
                showDialog({
                  title: 'Members Removed Successfully',
                  message: `Successfully removed ${data.deletedCount || 0} member${(data.deletedCount || 0) !== 1 ? 's' : ''} from your gym.`,
                  confirmText: 'OK',
                  iconHtml: '<i class="fas fa-check-circle" style="color: #28a745; font-size: 2rem;"></i>',
                  onConfirm: function() {
                    // Refresh all relevant data
                    if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
                    if (typeof updateMembersStatsCard === 'function') updateMembersStatsCard();
                    if (typeof updatePaymentsStatsCard === 'function') updatePaymentsStatsCard();
                  }
                });
                
              } catch (error) {
                console.error('Error removing members:', error);
                showDialog({
                  title: 'Network Error',
                  message: 'Unable to connect to server. Please check your connection and try again.',
                  confirmText: 'OK',
                  iconHtml: '<i class="fas fa-wifi" style="color: #dc3545; font-size: 2rem;"></i>'
                });
              }
            }
          });
        }, 100); // Small delay for smooth transition
      };
    }

    // Global function for member item click handling
    window.toggleMemberSelection = function(membershipId) {
      const checkbox = document.querySelector(`input[value="${membershipId}"]`);
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      }
    };
  }
});

// --- Add Member Modal Logic (Single Consolidated Implementation) ---
document.addEventListener('DOMContentLoaded', function() {
  
  // DOM elements
  const addMemberBtn = document.getElementById('addMemberBtn');
  const addMemberBtnTab = document.getElementById('addMemberBtnTab');
  const addMemberModal = document.getElementById('addMemberModal');
  const closeAddMemberModal = document.getElementById('closeAddMemberModal');
  const addMemberForm = document.getElementById('addMemberForm');
  const addMemberSuccessMsg = document.getElementById('addMemberSuccessMsg');
  const memberProfileImageInput = document.getElementById('memberProfileImage');
  const memberImageTag = document.getElementById('memberImageTag');
  const uploadMemberImageBtn = document.getElementById('uploadMemberImageBtn');

  // Form elements for payment calculation
  const planSelected = document.getElementById('planSelected');
  const monthlyPlan = document.getElementById('monthlyPlan');
  const paymentAmount = document.getElementById('paymentAmount');


  
  // Cache for membership plans
  let plansCache = [];
  
  // Cache for gym activities
  let activitiesCache = [];

  // Fetch membership plans from backend
  async function fetchPlansForModal() {
    try {
      
      // Use the same waitForToken pattern as the admin profile fetch
      const token = await waitForToken('gymAdminToken', 10, 100);
      
      if (!token) {
        console.warn('[AddMember] No authentication token found after retry');
        
        // Try alternative token names if gymAdminToken is not available
        const alternativeTokens = ['token', 'authToken', 'gymAuthToken'];
        let alternativeToken = null;
        
        for (const tokenName of alternativeTokens) {
          alternativeToken = localStorage.getItem(tokenName);
          if (alternativeToken) {
            break;
          }
        }
        
        if (!alternativeToken) {
          console.error('[AddMember] No valid authentication token found');
          plansCache = [];
          return;
        }
        
        // Use the alternative token
        const response = await fetch('${BASE_URL}/api/gyms/membership-plans', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${alternativeToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText} (using alternative token)`);
        }
        
        const data = await response.json();
        
        // Handle both response formats: direct array or {success: true, plans: [...]}
        if (Array.isArray(data)) {
          plansCache = data;
        } else if (data.success && Array.isArray(data.plans)) {
          plansCache = data.plans;
        } else {
          console.warn('[AddMember] Invalid API response format:', data);
          plansCache = [];
        }
        return;
      }
            const response = await fetch('${BASE_URL}/api/gyms/membership-plans', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle both response formats: direct array or {success: true, plans: [...]}
      if (Array.isArray(data)) {
        plansCache = data;
      } else if (data.success && Array.isArray(data.plans)) {
        plansCache = data.plans;
      } else {
        console.warn('[AddMember] Invalid API response format:', data);
        plansCache = [];
      }
    } catch (error) {
      console.error('[AddMember] Error fetching plans:', error);
      plansCache = [];
    }
  }

  // Fetch gym activities from backend
  async function fetchActivitiesForModal() {
    try {
      // Use global gym profile if available, otherwise fetch it
      let data = window.currentGymProfile;
      
      if (!data || Object.keys(data).length === 0) {
        const token = await waitForToken('gymAdminToken', 10, 100);
        
        if (!token) {
          console.warn('[AddMember] No authentication token found for activities fetch');
          activitiesCache = [];
          return;
        }

        const response = await fetch('${BASE_URL}/api/gyms/profile/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        data = await response.json();
        window.currentGymProfile = data; // Store globally
      }
      
      // Extract activities from gym profile
      if (data && Array.isArray(data.activities)) {
        activitiesCache = data.activities;
      } else {
        console.warn('[AddMember] No activities found in gym profile');
        activitiesCache = [];
      }
    } catch (error) {
      console.error('[AddMember] Error fetching activities:', error);
      activitiesCache = [];
    }
  }

  // Update payment amount based on plan and duration
  function updatePaymentAmountAndDiscount() {
    
    // Get fresh DOM references
    const currentPlanSelected = document.getElementById('planSelected');
    const currentMonthlyPlan = document.getElementById('monthlyPlan');
    const currentPaymentAmount = document.getElementById('paymentAmount');
    const discountInfo = document.getElementById('discountInfo');
    const discountText = document.getElementById('discountText');
    
    if (!currentPlanSelected || !currentMonthlyPlan || !currentPaymentAmount) {
      console.warn('[AddMember] Payment calculation elements not found');
      return;
    }

    const selectedPlan = currentPlanSelected.value;
    const selectedDuration = currentMonthlyPlan.value;
    

    if (!selectedPlan || !selectedDuration) {
      currentPaymentAmount.value = '';
      if (discountInfo) discountInfo.style.display = 'none';
      return;
    }

    // Extract months from duration - handle multiple formats
    let months = 1;
    const durationLower = selectedDuration.toLowerCase();
    
    if (durationLower.includes('3') && durationLower.includes('month')) {
      months = 3;
    } else if (durationLower.includes('6') && durationLower.includes('month')) {
      months = 6;
    } else if (durationLower.includes('12') && (durationLower.includes('month') || durationLower.includes('year'))) {
      months = 12;
    } else {
      // Try regex extraction as fallback
      const monthsMatch = selectedDuration.match(/(\d+)\s*(?:months?|years?)/i);
      if (monthsMatch) {
        months = parseInt(monthsMatch[1]);
        if (selectedDuration.toLowerCase().includes('year')) {
          months *= 12; // Convert years to months
        }
      }
    }


    // Find plan in cache
    const plan = plansCache.find(p => p.name === selectedPlan);
    
    if (!plan) {
      console.warn('[AddMember] Plan not found in cache:', selectedPlan, 'Available:', plansCache);
      currentPaymentAmount.value = '';
      if (discountInfo) discountInfo.style.display = 'none';
      return;
    }


    // Calculate amount
    const baseAmount = plan.price * months;
    let finalAmount = baseAmount;
    let discountAmount = 0;
    let discountPercentage = 0;
    
    // Check if discount applies - handle both array and numeric discountMonths
    let discountApplies = false;
    if (plan.discount > 0 && plan.discountMonths) {
      if (Array.isArray(plan.discountMonths)) {
        discountApplies = plan.discountMonths.includes(months);
      } else if (typeof plan.discountMonths === 'number') {
        discountApplies = months >= plan.discountMonths;
      }
    }
    
    if (discountApplies) {
      discountPercentage = plan.discount;
      discountAmount = Math.round(baseAmount * (plan.discount / 100));
      finalAmount = baseAmount - discountAmount;
    }

  

    // Update UI
    currentPaymentAmount.value = finalAmount;
    
    // Update discount information
    if (discountInfo && discountText) {
      if (discountApplies && discountAmount > 0) {
        discountText.innerHTML = `${discountPercentage}% discount applied - You save ₹${discountAmount}! (Base: ₹${baseAmount})`;
        discountInfo.style.display = 'block';
        discountInfo.style.backgroundColor = '#d4edda';
        discountInfo.style.color = '#155724';
        discountInfo.style.border = '1px solid #c3e6cb';
        discountInfo.style.padding = '10px';
        discountInfo.style.borderRadius = '5px';
        discountInfo.style.marginTop = '10px';
      } else {
        discountText.innerHTML = `No discount applied. Total: ₹${finalAmount} (${months} month${months > 1 ? 's' : ''} × ₹${plan.price})`;
        discountInfo.style.display = 'block';
        discountInfo.style.backgroundColor = '#f8f9fa';
        discountInfo.style.color = '#6c757d';
        discountInfo.style.border = '1px solid #dee2e6';
        discountInfo.style.padding = '10px';
        discountInfo.style.borderRadius = '5px';
        discountInfo.style.marginTop = '10px';
      }
    } else {
      console.warn('[AddMember] Discount info elements not found');
    }
    
    // Trigger change event to notify other systems
    currentPaymentAmount.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Open modal
  async function openAddMemberModal() {
    
    try {
      await fetchPlansForModal();
      await fetchActivitiesForModal();
    } catch (error) {
      console.error('[AddMember] Error fetching data for modal:', error);
    }
    
    if (addMemberModal) {
      addMemberModal.style.display = 'flex';
    }
    
    // Reset form and ensure it's in "add" mode
    if (addMemberForm) {
      addMemberForm.reset();
      addMemberForm.dataset.editMode = 'false';
      
      // Remove hidden memberId field if exists
      const memberIdInput = document.getElementById('editMemberId');
      if (memberIdInput) {
        memberIdInput.remove();
      }
      
      // Reset modal title
      const modalTitle = addMemberModal.querySelector('.modal-title-style');
      if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Add New Member';
      }
      
      // Reset submit button
      const submitBtn = addMemberForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Add Member';
        submitBtn.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
      }
      
      // Re-enable all form fields
      const nameInput = document.getElementById('memberName');
      const ageInput = document.getElementById('memberAge');
      const genderInput = document.getElementById('memberGender');
      if (nameInput) nameInput.disabled = false;
      if (ageInput) ageInput.disabled = false;
      if (genderInput) genderInput.disabled = false;
    }
    
    if (paymentAmount) paymentAmount.value = '';
    if (memberImageTag) memberImageTag.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00OCA2NEM1Ni44MzY2IDY0IDY0IDU2LjgzNjYgNjQgNDhDNjQgMzkuMTYzNCA1Ni44MzY2IDMyIDQ4IDMyQzM5LjE2MzQgMzIgMzIgMzkuMTYzNCAzMiA0OEMzMiA1Ni44MzY2IDM5LjE2MzQgNjQgNDggNjRaIiBmaWxsPSIjQ0NDQ0NDIi8+CjxwYXRoIGQ9Ik0yNCA3Nkg3MlY4MEgyNFY3NloiIGZpbGw9IiNDQ0NDQ0MiLz4KPHRleHQgeD0iNDgiIHk9Ijg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTk5OTkiPlBob3RvPC90ZXh0Pgo8L3N2Zz4K';
    if (addMemberSuccessMsg) addMemberSuccessMsg.style.display = 'none';
    
    // Hide discount info initially
    const discountInfo = document.getElementById('discountInfo');
    if (discountInfo) discountInfo.style.display = 'none';
    
    // Populate plan dropdown with enhanced options
    if (planSelected) {
      if (plansCache.length > 0) {
        
        const planOptions = plansCache.map(plan => {
          const planDetails = `${plan.name} - ₹${plan.price}/month`;
          const discountInfo = plan.discount > 0 ? ` (${plan.discount}% off on ${plan.discountMonths}+ months)` : '';
          return `<option value="${plan.name}" data-price="${plan.price}" data-discount="${plan.discount || 0}" data-discount-months="${plan.discountMonths || 0}">${planDetails}${discountInfo}</option>`;
        }).join('');
        
        planSelected.innerHTML = '<option value="">Select Plan</option>' + planOptions;
      } else {
        console.warn('[AddMember] No plans available, using fallback options');
        planSelected.innerHTML = `
          <option value="">Select Plan</option>
          <option value="Basic" data-price="1000" data-discount="0">Basic - ₹1000/month</option>
          <option value="Standard" data-price="1500" data-discount="10">Standard - ₹1500/month (10% off on 3+ months)</option>
          <option value="Premium" data-price="2000" data-discount="15">Premium - ₹2000/month (15% off on 6+ months)</option>
        `;
      }
    } else {
      console.error('[AddMember] Plan dropdown element not found!');
    }
    
    // Populate duration dropdown with consistent options
    const monthlyPlanElement = document.getElementById('monthlyPlan');
    if (monthlyPlanElement) {
      monthlyPlanElement.innerHTML = `
        <option value="">Select Duration</option>
        <option value="1 Month">1 Month</option>
        <option value="3 Months">3 Months</option>
        <option value="6 Months">6 Months</option>
        <option value="12 Months">12 Months</option>
      `;
    }
    
    // Populate activity dropdown
    const activityPreference = document.getElementById('activityPreference');
    if (activityPreference && activitiesCache.length > 0) {
      const activityOptions = activitiesCache.map(activity => {
        const activityName = typeof activity === 'string' ? activity : activity.name;
        return `<option value="${activityName}">${activityName}</option>`;
      }).join('');
      
      activityPreference.innerHTML = '<option value="">Select Activity</option>' + activityOptions;
    } else if (activityPreference) {
      // Fallback to default options if no activities found
      activityPreference.innerHTML = `
        <option value="">Select Activity</option>
        <option value="Cardio">Cardio</option>
        <option value="Weight Training">Weight Training</option>
        <option value="Yoga">Yoga</option>
        <option value="Zumba">Zumba</option>
        <option value="CrossFit">CrossFit</option>
        <option value="Pilates">Pilates</option>
        <option value="General Fitness">General Fitness</option>
      `;
      console.warn('[AddMember] Activity dropdown populated with fallback options');
    }
    
    // Reattach event listeners after modal is opened and populated
    setTimeout(() => {
      attachPaymentListeners();
      attachImageUploadListeners();
      
      // Trigger initial calculation if both plan and duration are selected
      const currentPlan = document.getElementById('planSelected')?.value;
      const currentDuration = document.getElementById('monthlyPlan')?.value;
      if (currentPlan && currentDuration) {
        updatePaymentAmountAndDiscount();
      }
    }, 100);
    
  }

  // Close modal
  function closeAddMemberModalFunc() {
    if (addMemberModal) addMemberModal.style.display = 'none';
  }

  // Button event listeners
  if (addMemberBtn) {
    addMemberBtn.addEventListener('click', function(e) {
      e.preventDefault();
      openAddMemberModal();
    });
  }
  
  if (addMemberBtnTab) {
    addMemberBtnTab.addEventListener('click', function(e) {
      e.preventDefault();
      openAddMemberModal();
    });
  }

  // Payment calculation listeners - attach directly without DOM replacement
  function attachPaymentListeners() {
    
    // Get current DOM references
    const currentPlanSelected = document.getElementById('planSelected');
    const currentMonthlyPlan = document.getElementById('monthlyPlan');
    
    if (currentPlanSelected) {
      // Remove any existing listeners by removing and re-adding the event listener
      currentPlanSelected.removeEventListener('change', handlePlanChange);
      currentPlanSelected.addEventListener('change', handlePlanChange);
    } else {
      console.warn('[AddMember] Plan select element not found!');
    }
    
    if (currentMonthlyPlan) {
      // Remove any existing listeners by removing and re-adding the event listener
      currentMonthlyPlan.removeEventListener('change', handleMonthChange);
      currentMonthlyPlan.addEventListener('change', handleMonthChange);
    } else {
      console.warn('[AddMember] Monthly plan select element not found!');
    }
  }

  // Event handler functions
  function handlePlanChange(event) {
    updatePaymentAmountAndDiscount();
  }

  function handleMonthChange(event) {
    updatePaymentAmountAndDiscount();
  }

  // Initial attachment
  attachPaymentListeners();

  // Modal close listeners
  if (closeAddMemberModal) {
    closeAddMemberModal.addEventListener('click', closeAddMemberModalFunc);
  }
  
  if (addMemberModal) {
    addMemberModal.addEventListener('mousedown', function(e) {
      if (e.target === addMemberModal) closeAddMemberModalFunc();
    });
  }

  // Image upload functionality - use direct event listeners
  function attachImageUploadListeners() {
    
    const currentUploadBtn = document.getElementById('uploadMemberImageBtn');
    const currentFileInput = document.getElementById('memberProfileImage');
    
    if (currentUploadBtn && currentFileInput) {
      // Remove existing listeners
      currentUploadBtn.removeEventListener('click', handleUploadBtnClick);
      currentUploadBtn.addEventListener('click', handleUploadBtnClick);
    } else {
      console.warn('[AddMember] Image upload button or input not found:', {
        uploadMemberImageBtn: !!currentUploadBtn,
        memberProfileImageInput: !!currentFileInput
      });
    }

    if (currentFileInput) {
      currentFileInput.removeEventListener('change', handleFileInputChange);
      currentFileInput.addEventListener('change', handleFileInputChange);
    }
  }

  // Event handler functions for image upload
  function handleUploadBtnClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const fileInput = document.getElementById('memberProfileImage');
    if (fileInput) {
      fileInput.click();
    } else {
      console.error('[AddMember] File input not found when button clicked');
    }
  }

  function handleFileInputChange(e) {
    const file = e.target.files[0];
    const imageTag = document.getElementById('memberImageTag');
    
    if (file && imageTag) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        imageTag.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    } else if (imageTag) {
      imageTag.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00OCA2NEM1Ni44MzY2IDY0IDY0IDU2LjgzNjYgNjQgNDhDNjQgMzkuMTYzNCA1Ni44MzY2IDMyIDQ4IDMyQzM5LjE2MzQgMzIgMzIgMzkuMTYzNCAzMiA0OEMzMiA1Ni44MzY2IDM5LjE2MzQgNjQgNDggNjRaIiBmaWxsPSIjQ0NDQ0NDIi8+CjxwYXRoIGQ9Ik0yNCA3Nkg3MlY4MEgyNFY3NloiIGZpbGw9IiNDQ0NDQ0MiLz4KPHRleHQgeD0iNDgiIHk9Ijg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTk5OTkiPlBob3RvPC90ZXh0Pgo8L3N2Zz4K';
    }
  }

  // Initial attachment
  attachImageUploadListeners();

  // Form submission
  if (addMemberForm) {
    // Mark form as having enhanced handler for notification integration detection
    addMemberForm._hasEnhancedHandler = true;
    
    addMemberForm.onsubmit = async function(e) {
      e.preventDefault();
      let token = await waitForToken('gymAdminToken', 10, 100);
      if (!token) {
        const alternativeTokens = ['token', 'authToken', 'gymAuthToken'];
        for (const tokenName of alternativeTokens) {
          token = localStorage.getItem(tokenName);
          if (token) {
            break;
          }
        }
        if (!token) {
          if (window.unifiedNotificationSystem) {
            window.unifiedNotificationSystem.showToast('You must be logged in as a gym admin.', 'error');
          } else {
            alert('You must be logged in as a gym admin.');
          }
          return;
        }
      }
      
      // Check if form is in edit mode
      const isEditMode = addMemberForm.dataset.editMode === 'true';
      const memberId = document.getElementById('editMemberId')?.value;
      
      const formData = prepareMemberFormData(addMemberForm);
      const { gymName, plan, monthlyPlan, memberEmail, memberName, membershipId, validDate } = getMemberFormMeta(formData);
     
      // Debug: Log FormData contents
      for (let [key, value] of formData.entries()) {
      }
      
      try {
        let res, data;
        
        if (isEditMode && memberId) {
          // Update existing member
          res = await fetch(`${BASE_URL}/api/members/${memberId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          data = await res.json();
          
          if (res.ok) {
            // Show success message
            showDialog({
              title: 'Success!',
              message: 'Member details updated successfully.',
              confirmText: 'OK',
              iconHtml: '<i class="fas fa-check-circle" style="color:#4caf50;font-size:2.5em;"></i>',
              onConfirm: () => {
                // Reset form and close modal
                addMemberForm.reset();
                addMemberForm.dataset.editMode = 'false';
                const modalTitle = document.querySelector('#addMemberModal .modal-title-style');
                if (modalTitle) {
                  modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Add New Member';
                }
                const submitBtn = addMemberForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                  submitBtn.innerHTML = '<i class="fas fa-check"></i> Add Member';
                  submitBtn.style.background = 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)';
                }
                // Re-enable disabled fields
                const nameInput = document.getElementById('memberName');
                const ageInput = document.getElementById('memberAge');
                const genderInput = document.getElementById('memberGender');
                if (nameInput) nameInput.disabled = false;
                if (ageInput) ageInput.disabled = false;
                if (genderInput) genderInput.disabled = false;
                
                closeAddMemberModalFunc();
                
                // Refresh members table
                if (typeof fetchAndDisplayMembers === 'function') {
                  fetchAndDisplayMembers();
                }
              }
            });
            return;
          }
        } else {
          // Add new member
          res = await fetch('${BASE_URL}/api/members', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
          });
          data = await res.json();
        }
        
        // Handle successful response
        if (res.ok && (data.success || data.message === 'Member added successfully')) {
          // Record membership payment automatically
          if (window.paymentManager) {
            try {
              const memberData = {
                _id: data.member?._id || data.memberId,
                memberName: memberName,
                paymentAmount: formData.get('paymentAmount'),
                planSelected: plan,
                monthlyPlan: monthlyPlan,
                paymentMode: formData.get('paymentMode'),
                membershipValidUntil: validDate
              };
              await window.paymentManager.recordMembershipPayment(memberData);
              
              // Trigger payment notification using enhanced system
              if (window.NotificationManager) {
                await window.NotificationManager.notifyPayment(
                  memberName,
                  formData.get('paymentAmount'),
                  'success'
                );
              }
            } catch (paymentError) {
              console.error('❌ Failed to record membership payment:', paymentError);
              // Don't block member creation for payment recording errors
            }
          }
          
          // Trigger new member notification using enhanced system
          if (window.NotificationManager) {
            await window.NotificationManager.notifyMember(
              'added',
              memberName,
              `Plan: ${plan} (${monthlyPlan})`
            );
          } else {
            console.warn('Enhanced notification system not available yet, trying to initialize...');
            // Try to initialize notification system if not available
            setTimeout(async () => {
              if (window.NotificationManager) {
                await window.NotificationManager.notifyMember(
                  'added',
                  memberName,
                  `Plan: ${plan} (${monthlyPlan})`
                );
              } else {
                console.error('Enhanced notification system still not available after retry');
              }
            }, 1000);
          }
          
          sendMembershipEmail({ token, memberEmail, memberName, membershipId, plan, monthlyPlan, validDate, gymName });
          showAddMemberSuccess(membershipId, addMemberForm, memberImageTag, closeAddMemberModalFunc, memberName);
        } 
        // Handle duplicate member error with "Add Anyway" option
        else if (data && data.code === 'DUPLICATE_MEMBER') {
          showDialog({
            title: '⚠️ Duplicate Member Detected',
            message: `A member with this email or phone number already exists in the system.\n\n🔍 <b>Details:</b>\n• Email: ${memberEmail}\n• Phone: ${formData.get('memberPhone') || 'Not provided'}\n\n👨‍👩‍👧‍👦 If this is a family member or the person already has a different membership, you can still add them.`,
            confirmText: 'Add Anyway',
            cancelText: 'Cancel',
            iconHtml: '<i class="fas fa-user-friends" style="color:#ff9800;font-size:2.5em;"></i>',
            onConfirm: async function() {
              // Try again with forceAdd flag
              formData.set('forceAdd', 'true');
              try {
                const forceRes = await fetch('${BASE_URL}/api/members', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` },
                  body: formData
                });
                const forceData = await forceRes.json();
                
                if (forceRes.ok && (forceData.success || forceData.message === 'Member added successfully')) {
                  // Record membership payment automatically for forced add
                  if (window.paymentManager) {
                    try {
                      const memberData = {
                        _id: forceData.member?._id || forceData.memberId,
                        memberName: memberName,
                        paymentAmount: formData.get('paymentAmount'),
                        planSelected: plan,
                        monthlyPlan: monthlyPlan,
                        paymentMode: formData.get('paymentMode'),
                        membershipValidUntil: validDate
                      };
                      await window.paymentManager.recordMembershipPayment(memberData);
                      
                      // Trigger payment notification for forced add using enhanced system
                      if (window.NotificationManager) {
                        await window.NotificationManager.notifyPayment(
                          memberName,
                          formData.get('paymentAmount'),
                          'success'
                        );
                      }
                    } catch (paymentError) {
                      console.error('❌ Failed to record membership payment (forced add):', paymentError);
                      // Don't block member creation for payment recording errors
                    }
                  }
                  
                  // Trigger new member notification for forced add using enhanced system
                  if (window.NotificationManager) {
                    await window.NotificationManager.notifyMember(
                      'added',
                      memberName,
                      `Plan: ${plan} (${monthlyPlan}) - Forced Add`
                    );
                  } else {
                    console.warn('Enhanced notification system not available yet, trying to initialize...');
                    // Try to initialize notification system if not available
                    setTimeout(async () => {
                      if (window.NotificationManager) {
                        await window.NotificationManager.notifyMember(
                          'added',
                          memberName,
                          `Plan: ${plan} (${monthlyPlan}) - Forced Add`
                        );
                      } else {
                        console.error('Enhanced notification system still not available after retry');
                      }
                    }, 1000);
                  }
                  
                  sendMembershipEmail({ token, memberEmail, memberName, membershipId, plan, monthlyPlan, validDate, gymName });
                  showAddMemberSuccess(membershipId, addMemberForm, memberImageTag, closeAddMemberModalFunc, memberName);
                } else {
                  console.error('[AddMember] Force add failed:', forceData);
                  showDialog({
                    title: 'Error Adding Member',
                    message: forceData.message || forceData.error || 'Failed to add member even with force option.',
                    confirmText: 'OK',
                    iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2.2em;"></i>'
                  });
                }
              } catch (err) {
                console.error('[AddMember] Force add exception:', err);
                showDialog({
                  title: 'Connection Error',
                  message: 'Unable to connect to server. Please check your connection and try again.',
                  confirmText: 'OK',
                  iconHtml: '<i class="fas fa-wifi" style="color:#e53935;font-size:2.2em;"></i>'
                });
              }
            }
          });
        } 
        // Handle other backend errors
        else if (!res.ok || (data && (data.message || data.error))) {
          console.error('[AddMember] Backend error:', { status: res.status, data });
          const errorMessage = data.message || data.error || `Server responded with status ${res.status}`;
          showDialog({
            title: 'Error Adding Member',
            message: errorMessage,
            confirmText: 'OK',
            iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2.2em;"></i>'
          });
        } 
        // Fallback for unexpected responses
        else {
          console.error('[AddMember] Unexpected response format:', data);
          showDialog({
            title: 'Unexpected Error',
            message: 'An unexpected error occurred while adding the member. Please try again.',
            confirmText: 'OK',
            iconHtml: '<i class="fas fa-question-circle" style="color:#e53935;font-size:2.2em;"></i>'
          });
        }
      } catch (err) {
        console.error('[AddMember] Network or parsing error:', err);
        // Handle network errors or JSON parsing errors
        showDialog({
          title: 'Connection Error',
          message: 'Unable to connect to the server. Please check your internet connection and try again.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-wifi" style="color:#e53935;font-size:2.2em;"></i>'
        });
      }
    };

    function prepareMemberFormData(form) {
      const formData = new FormData(form);
      const addressInput = document.getElementById('memberAddress');
      if (addressInput?.value) {
        formData.set('address', addressInput.value);
      }
      return formData;
    }

    function getMemberFormMeta(formData) {
      // Debug gym profile
      
      const gymName = (window.currentGymProfile && (window.currentGymProfile.gymName || window.currentGymProfile.name)) ? (window.currentGymProfile.gymName || window.currentGymProfile.name) : 'GYM';
      const plan = formData.get('planSelected') || 'PLAN';
      const monthlyPlan = formData.get('monthlyPlan') || '';
      const memberEmail = formData.get('memberEmail') || '';
      const memberName = formData.get('memberName') || '';
      
      
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}`;
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      const gymShort = gymName.replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
      const planShort = plan.replace(/[^A-Za-z0-9]/g, '').substring(0,6).toUpperCase();
      const membershipId = `${gymShort}-${ym}-${planShort}-${random}`;
      
      
      formData.append('membershipId', membershipId);
      let validDate = '';
      let months = 1;
      if (/3\s*Months?/i.test(monthlyPlan)) months = 3;
      else if (/6\s*Months?/i.test(monthlyPlan)) months = 6;
      else if (/12\s*Months?/i.test(monthlyPlan)) months = 12;
      const validUntil = new Date(now);
      validUntil.setMonth(validUntil.getMonth() + months);
      validDate = validUntil.toISOString().split('T')[0];
      formData.append('membershipValidUntil', validDate);
      
      
      return { gymName, plan, monthlyPlan, memberEmail, memberName, membershipId, validDate };
    }

    function sendMembershipEmail({ token, memberEmail, memberName, membershipId, plan, monthlyPlan, validDate, gymName }) {
      
      fetch('${BASE_URL}/api/members/send-membership-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: memberEmail,
          memberName,
          membershipId,
          plan,
          monthlyPlan,
          validUntil: validDate,
          gymName
        })
      })
      .then(response => {
        return response.json();
      })
      .then(data => {
        if (data.success) {
        } else {
          console.error('[AddMember] Email sending failed:', data.message);
        }
      })
      .catch((err) => {
        console.error('[AddMember] Email sending error:', err);
      });
    }

    function showAddMemberSuccess(membershipId, form, imgTag, closeModalFunc, memberName) {
      showDialog({
        title: '✅ Member Added Successfully!',
        message: `Member <b>${memberName || 'Unknown'}</b> has been added successfully!<br><br>📋 <b>Membership ID:</b> ${membershipId}<br><br>📧 A welcome email with membership details has been sent to the member.`,
        confirmText: 'Got it!',
        iconHtml: '<i class="fas fa-user-check" style="color:#4caf50;font-size:2.5em;"></i>',
        onConfirm: () => {
          closeModalFunc();
          // Refresh payment data if payment manager is available
          if (window.paymentManager) {
            window.paymentManager.refreshPaymentData();
          }
          // Refresh member stats and payment stats
          if (typeof updateMembersStatsCard === 'function') {
            updateMembersStatsCard();
          }
          if (typeof updatePaymentsStatsCard === 'function') {
            updatePaymentsStatsCard();
          }
        }
      });
      
      // Clean up form and image
      if (form) form.reset();
      if (imgTag) imgTag.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTYiIGhlaWdodD0iOTYiIHZpZXdCb3g9IjAgMCA5NiA5NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00OCA2NEM1Ni44MzY2IDY0IDY0IDU2LjgzNjYgNjQgNDhDNjQgMzkuMTYzNCA1Ni44MzY2IDMyIDQ4IDMyQzM5LjE2MzQgMzIgMzIgMzkuMTYzNCAzMiA0OEMzMiA1Ni44MzY2IDM5LjE2MzQgNjQgNDggNjRaIiBmaWxsPSIjQ0NDQ0NDIi8+CjxwYXRoIGQ9Ik0yNCA3Nkg3MlY4MEgyNFY3NloiIGZpbGw9IiNDQ0NDQ0MiLz4KPHRleHQgeD0iNDgiIHk9Ijg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTk5OTkiPlBob3RvPC90ZXh0Pgo8L3N2Zz4K';
    }

    // Remove legacy error message display (all errors now use dialog)
    function showAddMemberError() {}
  }
    
});

// --- Renew Membership Modal Logic ---
document.addEventListener('DOMContentLoaded', function() {
  
  // DOM elements
  const renewMembershipModal = document.getElementById('renewMembershipModal');
  const closeRenewMembershipModal = document.getElementById('closeRenewMembershipModal');
  const cancelRenewMembership = document.getElementById('cancelRenewMembership');
  const renewMembershipForm = document.getElementById('renewMembershipForm');
  
  // Form elements
  const renewPlanSelected = document.getElementById('renewPlanSelected');
  const renewMonthlyPlan = document.getElementById('renewMonthlyPlan');
  const renewPaymentAmount = document.getElementById('renewPaymentAmount');
  
  // Cache for membership plans
  let renewPlansCache = [];

  // Fetch membership plans for renewal modal
  async function fetchPlansForRenewalModal() {
    try {
      const token = await waitForToken('gymAdminToken', 10, 100);
      if (!token) {
        console.error('[RenewMembership] No token available');
        renewPlansCache = [];
        return;
      }
      
      const response = await fetch('${BASE_URL}/api/gyms/membership-plans', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle both response formats: direct array or {success: true, plans: [...]}
      if (Array.isArray(data)) {
        renewPlansCache = data;
      } else if (data.plans && Array.isArray(data.plans)) {
        renewPlansCache = data.plans;
      } else {
        renewPlansCache = [];
      }
      
    } catch (error) {
      console.error('[RenewMembership] Error fetching plans:', error);
      renewPlansCache = [];
    }
  }

  // Update payment amount based on plan and duration for renewal
  function updateRenewalPaymentAmount() {
    const selectedPlan = renewPlanSelected.value;
    const selectedDuration = renewMonthlyPlan.value;
    const renewDiscountInfo = document.getElementById('renewDiscountInfo');
    const renewDiscountText = document.getElementById('renewDiscountText');
    
    if (!selectedPlan || !selectedDuration) {
      renewPaymentAmount.value = '';
      if (renewDiscountInfo) renewDiscountInfo.style.display = 'none';
      return;
    }

    // Extract months from duration
    const monthsMatch = selectedDuration.match(/(\d+)\s*Months?/i);
    const months = monthsMatch ? parseInt(monthsMatch[1]) : 1;

    // Find plan in cache
    const plan = renewPlansCache.find(p => p.name === selectedPlan);
    
    if (!plan) {
      console.warn('[RenewMembership] Plan not found in cache:', selectedPlan);
      renewPaymentAmount.value = '';
      if (renewDiscountInfo) renewDiscountInfo.style.display = 'none';
      return;
    }

    // Calculate amount
    const baseAmount = plan.price * months;
    let finalAmount = baseAmount;
    let discountAmount = 0;
    let discountPercentage = 0;
    
    // Check if discount applies
    let discountApplies = false;
    if (plan.discount > 0 && plan.discountMonths) {
      if (Array.isArray(plan.discountMonths)) {
        discountApplies = plan.discountMonths.includes(months);
      } else {
        discountApplies = months >= plan.discountMonths;
      }
    }
    
    if (discountApplies) {
      discountPercentage = plan.discount;
      discountAmount = Math.round(baseAmount * (plan.discount / 100));
      finalAmount = baseAmount - discountAmount;
    }

    // Update UI
    renewPaymentAmount.value = finalAmount;
    
    // Update discount information
    if (renewDiscountInfo && renewDiscountText) {
      if (discountApplies && discountAmount > 0) {
        renewDiscountText.innerHTML = `${discountPercentage}% discount applied - You save ₹${discountAmount}`;
        renewDiscountInfo.style.display = 'block';
        renewDiscountInfo.style.backgroundColor = '#d4edda';
        renewDiscountInfo.style.color = '#155724';
        renewDiscountInfo.style.border = '1px solid #c3e6cb';
      } else {
        renewDiscountText.innerHTML = 'No discount applied';
        renewDiscountInfo.style.display = 'block';
        renewDiscountInfo.style.backgroundColor = '#f8f9fa';
        renewDiscountInfo.style.color = '#6c757d';
        renewDiscountInfo.style.border = '1px solid #dee2e6';
      }
    }
  }

  // Open renewal modal with member data
  async function openRenewalModal(memberData) {
    await fetchPlansForRenewalModal();
    
    if (renewMembershipModal) {
      renewMembershipModal.style.display = 'flex';
    }
    
    // Reset form
    if (renewMembershipForm) renewMembershipForm.reset();
    
    // Hide discount info initially
    const renewDiscountInfo = document.getElementById('renewDiscountInfo');
    if (renewDiscountInfo) renewDiscountInfo.style.display = 'none';
    
    // Populate member info
    document.getElementById('renewMemberName').textContent = memberData.memberName || '';
    document.getElementById('renewMembershipId').textContent = memberData.membershipId || '';
    document.getElementById('renewCurrentPlan').textContent = `${memberData.planSelected || ''} - ${memberData.monthlyPlan || ''}`;
    
    const expiryDate = memberData.membershipValidUntil ? new Date(memberData.membershipValidUntil).toLocaleDateString() : 'N/A';
    const today = new Date();
    const expiry = new Date(memberData.membershipValidUntil);
    const isExpired = expiry < today;
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    let expiryText = expiryDate;
    if (isExpired) {
      expiryText += ` <span style="color:#e53935;font-weight:600;">(Expired)</span>`;
    } else if (daysLeft <= 3) {
      expiryText += ` <span style="color:#ff9800;font-weight:600;">(${daysLeft} day${daysLeft === 1 ? '' : 's'} left)</span>`;
    }
    
    document.getElementById('renewExpiryDate').innerHTML = expiryText;
    
    // Set hidden member ID
    document.getElementById('renewMemberId').value = memberData._id || '';
    
    // Pre-fill current values
    document.getElementById('renewPlanSelected').value = memberData.planSelected || '';
    document.getElementById('renewMonthlyPlan').value = memberData.monthlyPlan || '';
    document.getElementById('renewActivityPreference').value = memberData.activityPreference || '';
    
    // Populate plan dropdown
    if (renewPlanSelected && renewPlansCache.length > 0) {
      renewPlanSelected.innerHTML = '<option value="">Select Plan</option>' + 
        renewPlansCache.map(plan => `<option value="${plan.name}" ${plan.name === memberData.planSelected ? 'selected' : ''}>${plan.name} - ₹${plan.price}/month</option>`).join('');
    }
    
    // Update payment amount
    updateRenewalPaymentAmount();
    
    // Attach event listeners
    setTimeout(() => {
      attachRenewalPaymentListeners();
    }, 100);
  }

  // Close renewal modal
  function closeRenewalModal() {
    if (renewMembershipModal) renewMembershipModal.style.display = 'none';
  }

  // Payment calculation listeners for renewal
  function attachRenewalPaymentListeners() {
    if (renewPlanSelected) {
      renewPlanSelected.removeEventListener('change', handleRenewalPlanChange);
      renewPlanSelected.addEventListener('change', handleRenewalPlanChange);
    }
    
    if (renewMonthlyPlan) {
      renewMonthlyPlan.removeEventListener('change', handleRenewalMonthChange);
      renewMonthlyPlan.addEventListener('change', handleRenewalMonthChange);
    }
  }

  function handleRenewalPlanChange(event) {
    updateRenewalPaymentAmount();
  }

  function handleRenewalMonthChange(event) {
    updateRenewalPaymentAmount();
  }

  // Modal close listeners
  if (closeRenewMembershipModal) {
    closeRenewMembershipModal.addEventListener('click', closeRenewalModal);
  }
  
  if (cancelRenewMembership) {
    cancelRenewMembership.addEventListener('click', closeRenewalModal);
  }
  
  if (renewMembershipModal) {
    renewMembershipModal.addEventListener('mousedown', function(e) {
      if (e.target === renewMembershipModal) closeRenewalModal();
    });
  }

  // Form submission
  if (renewMembershipForm) {
    renewMembershipForm.onsubmit = async function(e) {
      e.preventDefault();
      
      const token = await waitForToken('gymAdminToken', 10, 100);
      if (!token) {
        showDialog({
          title: 'Authentication Error',
          message: 'Please log in again to continue.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2.2em;"></i>'
        });
        return;
      }
      
      const formData = new FormData(renewMembershipForm);
      const memberId = formData.get('memberId');
      
      if (!memberId) {
        showDialog({
          title: 'Error',
          message: 'Member ID is missing. Please try again.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2.2em;"></i>'
        });
        return;
      }
      
      try {
        const paymentMode = formData.get('paymentMode');
        const is7DayAllowance = paymentMode === '7-day-allowance';
        
        // Prepare renewal data
        const renewalData = {
          planSelected: formData.get('planSelected'),
          monthlyPlan: formData.get('monthlyPlan'),
          paymentAmount: parseInt(formData.get('paymentAmount')),
          paymentMode: is7DayAllowance ? 'pending' : paymentMode,
          activityPreference: formData.get('activityPreference'),
          paymentStatus: is7DayAllowance ? 'pending' : 'paid',
          pendingPaymentAmount: is7DayAllowance ? parseInt(formData.get('paymentAmount')) : 0,
          allowanceExpiryDate: is7DayAllowance ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null
        };
        
        const response = await fetch(`${BASE_URL}/api/members/renew/${memberId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(renewalData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Record renewal payment automatically (only if not 7-day allowance)
          if (window.paymentManager && !is7DayAllowance) {
            try {
              const memberData = {
                _id: memberId,
                memberName: document.getElementById('renewMemberName')?.textContent || 'Unknown Member'
              };
              const renewalPaymentData = {
                paymentAmount: formData.get('paymentAmount'),
                planSelected: formData.get('planSelected'),
                monthlyPlan: formData.get('monthlyPlan'),
                paymentMode: formData.get('paymentMode'),
                membershipValidUntil: data.newExpiryDate
              };
              await window.paymentManager.recordRenewalPayment(memberData, renewalPaymentData);
              
              // Trigger payment notification for renewal using enhanced system
              if (window.NotificationManager) {
                await window.NotificationManager.notifyPayment(
                  memberData.memberName,
                  formData.get('paymentAmount'),
                  'success'
                );
              }
            } catch (paymentError) {
              console.error('❌ Failed to record renewal payment:', paymentError);
              // Don't block renewal for payment recording errors
            }
          }
          
          // Show different success messages based on payment mode
          let successTitle, successMessage, iconHtml;
          
          if (is7DayAllowance) {
            successTitle = '🕐 7-Day Allowance Granted';
            successMessage = `Membership has been renewed with 7-day payment allowance!<br><br>📋 <b>New Expiry Date:</b> ${new Date(data.newExpiryDate).toLocaleDateString()}<br><br>💰 <b>Pending Amount:</b> ₹${formData.get('paymentAmount')}<br><br>⏰ <b>Payment Due:</b> Within 7 days<br><br>⚠️ The member is now marked as "Payment Pending" and has 7 days to complete payment.`;
            iconHtml = '<i class="fas fa-clock" style="color:#ffc107;font-size:2.5em;"></i>';
            
            // Trigger payment pending notification using enhanced system
            if (window.NotificationManager) {
              await window.NotificationManager.notify(
                'Payment Allowance Granted',
                `${document.getElementById('renewMemberName')?.textContent || 'Member'} has been granted 7-day payment allowance for ₹${formData.get('paymentAmount')}`,
                'warning'
              );
            }
          } else {
            successTitle = '✅ Membership Renewed Successfully!';
            successMessage = `Membership has been renewed successfully!<br><br>📋 <b>New Expiry Date:</b> ${new Date(data.newExpiryDate).toLocaleDateString()}<br><br>💰 <b>Amount Paid:</b> ₹${formData.get('paymentAmount')}<br><br>📧 A renewal confirmation email has been sent to the member.`;
            iconHtml = '<i class="fas fa-check-circle" style="color:#4caf50;font-size:2.5em;"></i>';
          }
          
          showDialog({
            title: successTitle,
            message: successMessage,
            confirmText: 'Great!',
            iconHtml: iconHtml,
            onConfirm: () => {
              closeRenewalModal();
              // Refresh the members table
              if (typeof fetchMembersData === 'function') {
                fetchMembersData();
              }
              // Refresh payment data if payment manager is available
              if (window.paymentManager) {
                window.paymentManager.refreshPaymentData();
              }
              // Refresh payment stats
              if (typeof updatePaymentsStatsCard === 'function') {
                updatePaymentsStatsCard();
              }
            }
          });
        } else {
          throw new Error(data.message || 'Failed to renew membership');
        }
        
      } catch (error) {
        console.error('[RenewMembership] Error:', error);
        showDialog({
          title: 'Renewal Failed',
          message: error.message || 'Failed to renew membership. Please try again.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2.2em;"></i>'
        });
      }
    };
  }

  // Make openRenewalModal globally available
  window.openRenewalModal = openRenewalModal;
  
});

            let currentGymProfile = {}; // Store fetched profile data

            async function fetchAndUpdateAdminProfile() {
        logLocalStorageItems();
        
        // Increase retries to 50 (5 seconds) to avoid race condition after login redirect
        const token = await waitForToken('gymAdminToken', 50, 100);
        const adminNameElement = document.getElementById('adminName');
        const adminAvatarElement = document.getElementById('adminAvatar');
        setDefaultAdminProfile(adminNameElement, adminAvatarElement);
    
        if (!token) {
            console.error('❌ No token found after waiting. Redirecting to login.');
            handleMissingToken();
            return;
        }
        
    
        try {
            const responseData = await fetchAdminProfile(token);
            if (!responseData.ok) {
                console.error('❌ Profile fetch failed with response:', responseData);
                handleProfileFetchError(responseData, adminNameElement, adminAvatarElement);
                return;
            }
            
            currentGymProfile = responseData.data;
            updateAdminProfileUI(adminNameElement, adminAvatarElement, responseData.data);
        } catch (error) {
            console.error('❌ Exception during profile fetch:', error);
            handleProfileFetchException(error, adminNameElement, adminAvatarElement);
        }
    }
    
    function logLocalStorageItems() {
       
        const allItems = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            allItems.push({
                key,
                value: value?.substring(0, 30) + '...',
                length: value?.length || 0,
                fullValue: value // Only for debugging - remove in production
            });
        }
                
        // Specifically check for our target token
        const targetToken = localStorage.getItem('gymAdminToken');
       
        
        // Check for any token-like keys
        const tokenKeys = Object.keys(localStorage).filter(key => 
            key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')
        );
    }
    
    async function waitForToken(tokenKey, maxTries, delayMs) {
        
        let token = null;
        let tries = 0;
        
        // Function to check multiple storage locations
        function checkAllStorageLocations() {
            // First check URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get('token');
            if (urlToken) {
                // Store it in localStorage for future use
                localStorage.setItem(tokenKey, urlToken);
                // Clean the URL
                window.history.replaceState({}, document.title, window.location.pathname);
                return { location: 'URL parameters', token: urlToken };
            }
            
            // Check localStorage
            let found = localStorage.getItem(tokenKey);
            if (found) return { location: 'localStorage', token: found };
            
            // Check sessionStorage
            found = sessionStorage.getItem(tokenKey);
            if (found) return { location: 'sessionStorage', token: found };
            
            // Check alternative key names
            const altKeys = ['authToken', 'token', 'gymAuthToken', 'adminToken'];
            for (const altKey of altKeys) {
                found = localStorage.getItem(altKey);
                if (found) return { location: `localStorage[${altKey}]`, token: found };
                
                found = sessionStorage.getItem(altKey);
                if (found) return { location: `sessionStorage[${altKey}]`, token: found };
            }
            
            return null;
        }
        
        while (!token && tries < maxTries) {
            const result = checkAllStorageLocations();
            if (result) {
                token = result.token;
                // If found in alternative location, also store it in the expected location
                if (result.location !== 'localStorage') {
                    localStorage.setItem(tokenKey, token);
                }
                break;
            }
            
            await new Promise(res => setTimeout(res, delayMs));
            tries++;
            
           
        }
        
        if (token) {
        } else {
        }
        
        return token;
    }
    
    function setDefaultAdminProfile(adminNameElement, adminAvatarElement) {
        if (adminNameElement) adminNameElement.textContent = 'Gym Admin';
        if (adminAvatarElement) adminAvatarElement.src = 'https://via.placeholder.com/40';
    }
    
    function handleMissingToken() {
        console.error("No authentication token found after retry. Redirecting to login.");
        window.location.replace('${BASE_URL}/public/admin-login.html');
    }
    
    async function fetchAdminProfile(token) {
       
        const response = await fetch('${BASE_URL}/api/gyms/profile/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        return { ok: response.ok, status: response.status, statusText: response.statusText, data, raw: response };
    }
    
    function handleProfileFetchError(responseData, adminNameElement, adminAvatarElement) {
        console.error(`Error fetching profile: ${responseData.status} ${responseData.statusText}`);
        console.error('Detailed server response:', responseData.data);
        if (responseData.status === 401 || responseData.status === 403) {
            console.error('Unauthorized access. Clearing tokens.');
            localStorage.removeItem('gymAdminToken');
            window.location.replace('${BASE_URL}/public/admin-login.html');
        } else {
            throw new Error(responseData.data.message || 'Failed to fetch profile');
        }
    }
    
    function updateAdminProfileUI(adminNameElement, adminAvatarElement, profile) {
        // Store the complete profile data globally
        currentGymProfile = profile;
        window.currentGymProfile = profile; // Also set on window for global access
        
        // Store gymId in localStorage for QR generator and other components
        if (profile._id) {
            localStorage.setItem('gymId', profile._id);
            localStorage.setItem('currentGymId', profile._id);
        } else if (profile.id) {
            localStorage.setItem('gymId', profile.id);
            localStorage.setItem('currentGymId', profile.id);
        }
        
        if (adminNameElement) {
            adminNameElement.textContent = profile.gymName || profile.name || 'Gym Admin';
        }
        if (adminAvatarElement) {
            let logoUrl = profile.logoUrl || profile.logo || profile.logoURL || profile.logo_path || '';
      
            if (logoUrl && !logoUrl.startsWith('http')) {
                if (logoUrl.startsWith('/')) {
                    logoUrl = `${BASE_URL}${logoUrl}`;
                } else {
                    logoUrl = `${BASE_URL}/${logoUrl}`;
                }
            }
            
            if (!logoUrl) logoUrl = `${BASE_URL}/uploads/gym-logos/default-logo.png`;
            
            
            // Auto-fix logo path if it's using wrong directory - standardize to gym-logos
            if (logoUrl && (logoUrl.includes('/uploads/gymImages/') || logoUrl.includes('/uploads/gymPhotos/') || logoUrl.includes('/uploads/images/'))) {
                const filename = logoUrl.split('/').pop();
                const altUrl = `${BASE_URL}/uploads/gym-logos/${filename}`;
                logoUrl = altUrl;
            }
            
            
            adminAvatarElement.src = logoUrl;
            adminAvatarElement.onerror = function() {
                this.onerror = null; // Prevent infinite loop
                this.src = '${BASE_URL}/uploads/gym-logos/default-logo.png';
            };
           
        }
        // Ensure activities are rendered after profile is loaded
        if (typeof fetchAndRenderActivities === 'function') fetchAndRenderActivities();
        
        // Refresh QR generator with correct gym ID if it exists
        if (window.qrGenerator && typeof window.qrGenerator.refreshGymId === 'function') {
            window.qrGenerator.refreshGymId();
        }
        
        // Trigger custom event for other components that depend on gym profile
        window.dispatchEvent(new CustomEvent('gymProfileLoaded', { 
            detail: { 
                gymId: profile._id || profile.id,
                profile: profile 
            } 
        }));
    }

    
    function handleProfileFetchException(error, adminNameElement, adminAvatarElement) {
        console.error('Comprehensive error fetching or updating admin profile:', error);
        if (adminNameElement) adminNameElement.textContent = 'Admin';
        if (adminAvatarElement) adminAvatarElement.src = 'https://via.placeholder.com/40';
        localStorage.removeItem('gymAdminToken');
        if (window.unifiedNotificationSystem) {
            window.unifiedNotificationSystem.showToast('Unable to fetch profile. Please try logging in again.', 'error');
        } else {
            alert('Unable to fetch profile. Please try logging in again.');
        }
    }

document.addEventListener('DOMContentLoaded', function () {
    const deletePhotoConfirmModal = document.getElementById('deletePhotoConfirmModal');
    const closeDeletePhotoConfirmModal = document.getElementById('closeDeletePhotoConfirmModal');
    const confirmDeletePhotoBtn = document.getElementById('confirmDeletePhotoBtn');
    const cancelDeletePhotoBtn = document.getElementById('cancelDeletePhotoBtn');
    let pendingDeletePhotoId = null;
    fetchAndUpdateAdminProfile();
    fetchGymPhotos();


    // Fetch gym photos from backend and render them in the photo grid (dashboard view, modal preview only)
    async function fetchGymPhotos() {
        const token = localStorage.getItem('gymAdminToken');
        try {
            const response = await fetch('${BASE_URL}/api/gyms/photos', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch gym photos: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            
            // Extract photos from the response (registration photos are in the photos array)
            const photos = data.photos || [];
            renderPhotoGrid(photos);
        } catch (err) {
            console.error('Error fetching gym photos:', err);
            renderPhotoGrid([]);
        }
    }

    // Render the photo grid with modal preview only (no edit/remove)
    function renderPhotoGrid(photos) {
        const photoGrid = document.getElementById('photoGrid');
        if (!photoGrid) return;
        photoGrid.innerHTML = '';
        if (!photos || !photos.length) {
            photoGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:32px 0;">No photos uploaded yet.</div>';
            return;
        }
        // Store the last photo grid for edit/remove lookup
        window._lastPhotoGrid = photos;
        photos.forEach((photo, idx) => {
            // Support both string and object with url - handle registration photo structure
            let url = typeof photo === 'string' ? photo : (photo.url || photo.path || photo.imageUrl || '');
            const title = typeof photo === 'object' ? (photo.title || '') : '';
            const description = typeof photo === 'object' ? (photo.description || '') : '';
            const category = typeof photo === 'object' ? (photo.category || '') : '';
            const id = typeof photo === 'object' ? (photo._id || photo.id || '') : '';
            
            if (!url) return;
            
            // Convert relative path to full URL if needed (registration photos use relative paths)
            if (url && !url.startsWith('http')) {
                if (url.startsWith('/')) {
                    url = `${BASE_URL}${url}`;
                } else {
                    url = `${BASE_URL}/${url}`;
                }
            }
            
            
            const card = document.createElement('div');
            card.className = 'photo-grid-item';
            card.style.position = 'relative';
            card.style.background = '#fff';
            card.style.borderRadius = '10px';
            card.style.boxShadow = '0 2px 8px #0001';
            card.style.padding = '12px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'center';
            card.innerHTML = `
                <img src="${url}" alt="Gym Photo" style="width:100%;height:140px;object-fit:cover;border-radius:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:10px;" data-photo-idx="${idx}" />
                <h3 style="margin:4px 0 2px 0;font-size:1.1em;">${title || 'Untitled'}</h3>
                <p style="margin:0 0 6px 0;color:#666;font-size:0.95em;">${description || 'No description'}</p>
                <div style="font-size:0.95em;color:#1976d2;margin-bottom:6px;">${category ? `<i class='fas fa-tag'></i> ${category}` : ''}</div>
                <div style="display:flex;gap:8px;justify-content:center;">
                    <button class="edit-photo-btn" data-photo-id="${id}" style="padding:4px 10px;border:none;background:var(--primary);color:#fff;border-radius:4px;cursor:pointer;">Edit</button>
                    <button class="remove-photo-btn" data-photo-id="${id}" style="padding:4px 10px;border:none;background:var(--danger);color:#fff;border-radius:4px;cursor:pointer;">Remove</button>
                </div>
            `;
            // Click to open modal preview
            card.querySelector('img').addEventListener('click', function() {
                showPhotoModal(url);
            });
            photoGrid.appendChild(card);
        });
    }

    // Modal preview for photo
    function showPhotoModal(url) {
        // Remove any existing modal
        let modal = document.getElementById('photoPreviewModal');
        if (modal) modal.remove();
        modal = document.createElement('div');
        modal.id = 'photoPreviewModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.7)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10010';
        modal.innerHTML = `
            <div style="background:#fff;padding:18px 18px 10px 18px;border-radius:12px;max-width:90vw;max-height:90vh;box-shadow:0 4px 32px rgba(0,0,0,0.18);position:relative;display:flex;flex-direction:column;align-items:center;">
                <button id="closePhotoPreviewModal" style="position:absolute;top:8px;right:12px;font-size:2rem;background:none;border:none;color:#333;cursor:pointer;">&times;</button>
                <img src="${url}" alt="Gym Photo" style="max-width:80vw;max-height:70vh;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.12);margin-bottom:8px;" />
            </div>
        `;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        document.getElementById('closePhotoPreviewModal').onclick = function() {
            modal.remove();
            document.body.style.overflow = '';
        };
        // Also close on click outside modal-content
        modal.addEventListener('mousedown', function(e) {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        });
    }

    function handlePhotoGridClick(e) {
        if (e.target.classList.contains('edit-photo-btn')) {
            handleEditPhotoBtn(e.target);
        } else if (e.target.classList.contains('remove-photo-btn')) {
            handleRemovePhotoBtn(e.target);
        }
    }

    function handleEditPhotoBtn(target) {
        const photoId = target.getAttribute('data-photo-id');
        const photo = (window._lastPhotoGrid || []).find(p => (p._id || p.id) === photoId);
        if (!photo) {
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Photo not found.', 'error');
            } else {
                alert('Photo not found.');
            }
            return;
        }
        document.getElementById('editPhotoId').value = photoId;
        document.getElementById('editPhotoTitle').value = photo.title || '';
        document.getElementById('editPhotoDescription').value = photo.description || '';
        document.getElementById('editPhotoFile').value = '';
        document.getElementById('editPhotoPreview').innerHTML = photo.imageUrl ? `<img src="${photo.imageUrl}" style="max-width:180px;max-height:120px;border-radius:6px;">` : '';
        document.getElementById('editPhotoModal').style.display = 'flex';
    }

    function handleRemovePhotoBtn(target) {
        const photoId = target.getAttribute('data-photo-id');
        if (!photoId) {
            if (window.unifiedNotificationSystem) {
                window.unifiedNotificationSystem.showToast('Photo ID missing.', 'error');
            } else {
                alert('Photo ID missing.');
            }
            return;
        }
        pendingDeletePhotoId = photoId;
        deletePhotoConfirmModal.style.display = 'flex';
    }

    function wireModalCloseButtons() {
        document.getElementById('closeEditPhotoModal').onclick = document.getElementById('cancelEditPhotoBtn').onclick = function() {
            document.getElementById('editPhotoModal').style.display = 'none';
        };
        if (closeDeletePhotoConfirmModal) {
            closeDeletePhotoConfirmModal.onclick = () => {
                deletePhotoConfirmModal.style.display = 'none';
                pendingDeletePhotoId = null;
            };
        }
        if (cancelDeletePhotoBtn) {
            cancelDeletePhotoBtn.onclick = () => {
                deletePhotoConfirmModal.style.display = 'none';
                pendingDeletePhotoId = null;
            };
        }
        if (confirmDeletePhotoBtn) {
            confirmDeletePhotoBtn.onclick = async () => {
                if (!pendingDeletePhotoId) return;
                const token = localStorage.getItem('gymAdminToken');
                try {
                    const res = await fetch(`${BASE_URL}/api/gyms/photos/${pendingDeletePhotoId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                        alert('Photo removed successfully!');
                        fetchGymPhotos();
                    } else {
                        alert(data.message || 'Failed to remove photo');
                    }
                } catch (err) {
                    alert('Network error while removing photo');
                }
                deletePhotoConfirmModal.style.display = 'none';
                pendingDeletePhotoId = null;
            };
        }
    }

    function wirePhotoFilePreview() {
        document.getElementById('editPhotoFile').addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('editPhotoPreview');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    if (evt.target && typeof evt.target.result === 'string') {
                        preview.innerHTML = `<img src="${evt.target.result}" style="max-width:180px;max-height:120px;border-radius:6px;">`;
                    } else {
                        preview.innerHTML = '';
                    }
                };
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = '';
            }
        });
    }

    function wireEditPhotoForm() {
        document.getElementById('editPhotoForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const token = localStorage.getItem('gymAdminToken');
            const photoId = document.getElementById('editPhotoId').value;
            if (!photoId) {
                alert('Photo ID missing. Cannot update.');
                return;
            }
            const title = document.getElementById('editPhotoTitle').value;
            const description = document.getElementById('editPhotoDescription').value;
            const fileInput = document.getElementById('editPhotoFile');
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            if (fileInput.files[0]) {
                formData.append('photo', fileInput.files[0]);
            }
            try {
                const res = await fetch(`${BASE_URL}/api/gyms/photos/${photoId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                const data = await res.json();
                if (res.status === 404) {
                    alert('Photo not found. It may have been deleted or does not exist.');
                    document.getElementById('editPhotoModal').style.display = 'none';
                    fetchGymPhotos();
                    return;
                }
                if (res.ok && data.success) {
                    const msgDiv = document.getElementById('editPhotoMsg');
                    msgDiv.textContent = 'Photo updated successfully!';
                    msgDiv.style.color = 'green';
                    setTimeout(() => {
                        msgDiv.textContent = '';
                        document.getElementById('editPhotoModal').style.display = 'none';
                    }, 1500);
                    fetchGymPhotos();
                } else {
                    const msgDiv = document.getElementById('editPhotoMsg');
                    msgDiv.textContent = data.message || 'Update failed';
                    msgDiv.style.color = 'red';
                }
            } catch (err) {
                const msgDiv = document.getElementById('editPhotoMsg');
                if (msgDiv) {
                    msgDiv.textContent = 'Network error. Please try again.';
                    msgDiv.style.color = 'red';
                }
                console.error('Error updating photo:', err);
            }
        });
    }

    // Wire up all handlers
    document.getElementById('photoGridSection').addEventListener('click', handlePhotoGridClick);
    wireModalCloseButtons();
    wirePhotoFilePreview();
    wireEditPhotoForm();
});

// --- Gym Photo Upload Logic ---
            const uploadGymPhotoForm = document.getElementById('uploadGymPhotoForm');
            if (uploadGymPhotoForm) {
                uploadGymPhotoForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    const formData = new FormData(uploadGymPhotoForm);
                    const token = localStorage.getItem('gymAdminToken');
                    try {
                        const res = await fetch('${BASE_URL}/api/gyms/photos', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                        });
                        const data = await res.json();
        if (res.ok && data.success) {
    handlePhotoUploadSuccess();
    fetchGymPhotos();
} else {
    const msgDiv = document.getElementById('uploadPhotoMsg');
    msgDiv.textContent = data.message || 'Upload failed';
    msgDiv.style.color = 'red';
}

function handlePhotoUploadSuccess() {
    const msgDiv = document.getElementById('uploadPhotoMsg');
    msgDiv.textContent = 'Photo uploaded successfully!';
    msgDiv.style.color = 'green';
    uploadGymPhotoForm.reset();
    setTimeout(clearUploadPhotoMsgAndCloseModal, 1200);
}

function clearUploadPhotoMsgAndCloseModal() {
    const msgDiv = document.getElementById('uploadPhotoMsg');
    if (msgDiv) msgDiv.textContent = '';
    const uploadPhotoModal = document.getElementById('uploadPhotoModal');
    if (uploadPhotoModal) uploadPhotoModal.style.display = 'none';
}
                    } catch (err) {
                        const msgDiv = document.getElementById('editPhotoMsg');
                        if (msgDiv) {
                            msgDiv.textContent = 'Network error';
                            msgDiv.style.color = 'red';
                        }
                        console.error('Error uploading photo:', err);
                    }
                });
            }

        
        // Profile Dropdown Toggle Functionality
        const userProfileToggle = document.getElementById('userProfileToggle');
        const profileDropdownMenu = document.getElementById('profileDropdownMenu');
        const logoutLink = document.getElementById('logoutLink');

        if (userProfileToggle && profileDropdownMenu) {
            // Force correct positioning and z-index
            function ensureDropdownVisibility() {
                profileDropdownMenu.style.position = 'fixed';
                profileDropdownMenu.style.zIndex = '2147483647';
                profileDropdownMenu.style.top = '70px';
                profileDropdownMenu.style.right = '20px';
                profileDropdownMenu.style.pointerEvents = 'auto';
            }
            
            userProfileToggle.addEventListener('click', function(event) {
                event.stopPropagation(); // Prevent click from closing menu immediately
                ensureDropdownVisibility();
                profileDropdownMenu.classList.toggle('show');
                
                // Ensure visibility after toggle
                if (profileDropdownMenu.classList.contains('show')) {
                    profileDropdownMenu.style.visibility = 'visible';
                    profileDropdownMenu.style.display = 'block';
                }
            });
            
            // Ensure dropdown is properly positioned
            ensureDropdownVisibility();
        }

        window.addEventListener('click', function(event) {
            if (profileDropdownMenu?.classList.contains('show')) {
                if (!userProfileToggle.contains(event.target) && !profileDropdownMenu.contains(event.target)) {
                    profileDropdownMenu.classList.remove('show');
                }
            }
        });

        // Edit Profile Modal elements and logic
        const editProfileModal = document.getElementById('editProfileModal');
        const editProfileForm = document.getElementById('editProfileForm');
        const logoPreviewImage = document.getElementById('logoPreviewImage');

        function populateEditProfileModal() {
            if (!currentGymProfile) {
                console.warn('No currentGymProfile available for modal population');
                return;
            }

            
            document.getElementById('editGymName').value = currentGymProfile.gymName || '';
            document.getElementById('editGymEmail').value = currentGymProfile.email || '';
            document.getElementById('editGymPhone').value = currentGymProfile.phone || '';
            
            // Handle address fields - check both direct fields and location object
            const address = currentGymProfile.address || currentGymProfile.location?.address || '';
            const city = currentGymProfile.city || currentGymProfile.location?.city || '';
            const state = currentGymProfile.state || currentGymProfile.location?.state || '';
            const pincode = currentGymProfile.pincode || currentGymProfile.location?.pincode || '';
            
            document.getElementById('editGymAddress').value = address;
            document.getElementById('editGymCity').value = city;
            
            // Add state field if it exists
            const stateField = document.getElementById('editGymState');
            if (stateField) {
                stateField.value = state;
            }
            
            document.getElementById('editGymPincode').value = pincode;
            document.getElementById('editGymDescription').value = currentGymProfile.description || '';

            // Handle logo URL with improved logic
            let logoUrl = currentGymProfile.logoUrl || currentGymProfile.logo || currentGymProfile.logoURL || currentGymProfile.logo_path || '';
            
            
            if (logoUrl && !logoUrl.startsWith('http')) {
                if (logoUrl.startsWith('/')) {
                    logoUrl = `${BASE_URL}${logoUrl}`;
                } else {
                    logoUrl = `${BASE_URL}/${logoUrl}`;
                }
            }
            
            // Auto-fix logo path if it's using wrong directory - standardize to gym-logos
            if (logoUrl && (logoUrl.includes('/uploads/gymImages/') || logoUrl.includes('/uploads/gymPhotos/') || logoUrl.includes('/uploads/images/'))) {
                const filename = logoUrl.split('/').pop();
                const altUrl = `${BASE_URL}/uploads/gym-logos/${filename}`;
                logoUrl = altUrl;
            }
            
            if (logoUrl) {
                logoPreviewImage.src = `${logoUrl}?${new Date().getTime()}`;
                logoPreviewImage.style.display = 'block';
                
                // Add error handling for logo preview
                logoPreviewImage.onerror = function() {
                    this.onerror = null; // Prevent infinite loop
                    this.src = '${BASE_URL}/uploads/gym-logos/default-logo.png';
                };
            } else {
                logoPreviewImage.src = '#';
                logoPreviewImage.style.display = 'none';
            }
            
        }

        // Note: Old edit profile functionality removed - now handled by gym-profile.js

        if (logoutLink) {
            logoutLink.addEventListener('click', function(event) {
                event.preventDefault(); // Prevent default anchor behavior
               localStorage.removeItem('gymAdminToken');
                window.location.href = '${BASE_URL}/public/admin-login.html'; // Redirect to login page
            });
        }

      



        // Handle Modals general closing (both .modal and .offers-modal)
        const modals = document.querySelectorAll('.modal, .offers-modal');
        const closeButtons = document.querySelectorAll('.modal-close');

        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modalToClose = button.closest('.modal, .offers-modal');
                if (modalToClose) {
                    modalToClose.classList.remove('show');
                    modalToClose.style.display = 'none';
                }
            });
        });

        window.addEventListener('click', (e) => {
            modals.forEach(modal => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // Specific Modals (Notification, Upload Photo, Add Equipment)
        // Fix: Use unique IDs for open-modal button and send button
        const openNotificationModalBtn = document.getElementById('openNotificationModalBtn');
        const notificationModal = document.getElementById('notificationModal');
        if (openNotificationModalBtn && notificationModal) {
            openNotificationModalBtn.addEventListener('click', () => {
                notificationModal.classList.add('show');
                if (window.resetNotificationForm) {
                    window.resetNotificationForm();
                }
            });
        }

        const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        const uploadPhotoModal = document.getElementById('uploadPhotoModal');
        if (uploadPhotoBtn && uploadPhotoModal) {
            uploadPhotoBtn.addEventListener('click', () => uploadPhotoModal.style.display = 'flex');
        }
        // Add interactive cancel for upload photo modal
        const cancelUploadPhotoBtn = document.getElementById('cancelUploadPhotoBtn');
        if (cancelUploadPhotoBtn && uploadPhotoModal) {
            cancelUploadPhotoBtn.onclick = function() {
                uploadPhotoModal.style.display = 'none';
            };
        }

        const addEquipmentBtn = document.getElementById('uploadEquipmentBtn');
        if (addEquipmentBtn) {
            addEquipmentBtn.addEventListener('click', () => {
                // Directly open the add equipment modal without navigating to Equipment tab
                // This allows adding equipment even when the Equipment tab is hidden
                if (window.equipmentManager && typeof window.equipmentManager.openAddEquipmentModal === 'function') {
                    window.equipmentManager.openAddEquipmentModal();
                } else {
                    // Fallback: try to open modal directly if equipment manager isn't loaded yet
                    const equipmentModal = document.getElementById('equipmentModal');
                    if (equipmentModal) {
                        // Reset form
                        const form = document.getElementById('equipmentForm');
                        if (form) form.reset();
                        
                        // Set title to Add mode
                        const title = document.getElementById('equipmentModalTitle');
                        if (title) title.innerHTML = '<i class="fas fa-plus"></i> Add Equipment';
                        
                        // Show modal
                        equipmentModal.style.display = 'flex';
                    } else {
                        // Last resort: show notification that equipment functionality is disabled
                        if (window.unifiedNotificationSystem) {
                            window.unifiedNotificationSystem.showToast('Equipment functionality is currently hidden. Enable it in Settings → Customize Dashboard to access all features.', 'info');
                        } else {
                            alert('Equipment functionality is currently hidden. Enable it in Settings → Customize Dashboard to access all features.');
                        }
                    }
                }
            });
        }

        // Biometric Enrollment quick action button
        const biometricEnrollBtn = document.getElementById('biometricEnrollBtn');
        if (biometricEnrollBtn) {
            biometricEnrollBtn.addEventListener('click', () => {
                // Check if biometric attendance is enabled and redirect accordingly
                if (typeof handleBiometricEnrollmentRedirect === 'function') {
                    handleBiometricEnrollmentRedirect();
                } else {
                    // Fallback: navigate to biometric enrollment page
                    window.location.href = '/frontend/biometric-enrollment.html';
                }
            });
        }

        // Device Setup quick action button
        const deviceSetupBtn = document.getElementById('deviceSetupBtn');
        if (deviceSetupBtn) {
            deviceSetupBtn.addEventListener('click', () => {
                // Check if biometric attendance is enabled and redirect accordingly
                if (typeof handleBiometricDeviceSetupRedirect === 'function') {
                    handleBiometricDeviceSetupRedirect();
                } else {
                    // Fallback: call the device configuration modal function from settings.js
                    if (typeof showDeviceConfigurationModal === 'function') {
                        showDeviceConfigurationModal();
                    } else {
                        if (window.unifiedNotificationSystem) {
                            window.unifiedNotificationSystem.showToast('Device setup functionality will be available after enabling biometric attendance in settings.', 'info');
                        } else {
                            alert('Device setup functionality will be available after enabling biometric attendance in settings.');
                        }
                    }
                }
            });
        }

        // Generate QR Code quick action button
        const generateQRCodeBtn = document.getElementById('generateQRCodeBtn');
        if (generateQRCodeBtn) {
            generateQRCodeBtn.addEventListener('click', () => {
                console.log('QR Code button clicked from quick action');
                // Check if QR generator is available
                if (window.qrGenerator && typeof window.qrGenerator.openQRCodeModal === 'function') {
                    window.qrGenerator.openQRCodeModal();
                } else {
                    // Fallback: directly open the modal if generator isn't loaded yet
                    const qrModal = document.getElementById('qrCodeGeneratorModal');
                    if (qrModal) {
                        qrModal.style.display = 'block';
                        document.body.style.overflow = 'hidden';
                    } else {
                        if (window.unifiedNotificationSystem) {
                            window.unifiedNotificationSystem.showToast('QR Code generator is loading. Please try again in a moment.', 'info');
                        } else {
                            alert('QR Code generator is loading. Please try again in a moment.');
                        }
                    }
                }
            });
        }

        // File input change for logo preview in Edit Profile Modal
        const editGymLogoInput = document.getElementById('editGymLogo');
        if (editGymLogoInput && logoPreviewImage) {
            editGymLogoInput.addEventListener('change', function(event) {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        logoPreviewImage.src = e.target.result;
                        logoPreviewImage.style.display = 'block';
                    }
                    reader.readAsDataURL(file);
                } else {
                    logoPreviewImage.src = '#';
                    logoPreviewImage.style.display = 'none';
                }
            });
        }

        // Edit Profile Form Submission
        if (editProfileForm) {
            let pendingFormData = null;

            // Password confirmation modal elements
            const passwordConfirmDialog = document.getElementById('passwordConfirmDialog');
            const passwordConfirmForm = document.getElementById('passwordConfirmForm');
            const closePasswordConfirmDialog = document.getElementById('closePasswordConfirmDialog');

            // Helper to show modal
            function showPasswordConfirmDialog() {
                if (passwordConfirmDialog) passwordConfirmDialog.style.display = 'flex';
                if (document.getElementById('currentPassword')) document.getElementById('currentPassword').value = '';
            }
            // Helper to hide modal
            function hidePasswordConfirmDialog() {
                if (passwordConfirmDialog) passwordConfirmDialog.style.display = 'none';
            }
            // Handle closing modal
            if (closePasswordConfirmDialog) {
                closePasswordConfirmDialog.onclick = hidePasswordConfirmDialog;
            }

            editProfileForm.addEventListener('submit', function(event) {
                event.preventDefault();
                // Always construct FormData and append logo if present
                pendingFormData = new FormData(editProfileForm);
                const logoInput = document.getElementById('editGymLogo');
                if (logoInput && logoInput.files.length > 0) {
                    pendingFormData.set('gymLogo', logoInput.files[0]);
                }
                // Password validation if changing password
                const passwordFields = document.getElementById('passwordFields');
                const passwordConfirmInput = document.getElementById('editGymPasswordConfirm');
                if (passwordFields && passwordFields.style.display !== 'none' && passwordInput.value) {
                    const password = passwordInput.value;
                    const confirmPassword = passwordConfirmInput.value;
                    if (!password || !confirmPassword) {
                        showProfileUpdateMessage('Both password fields are required to change password.', 'error');
                        return;
                    }
                    if (password !== confirmPassword) {
                        showProfileUpdateMessage('Passwords do not match.', 'error');
                        return;
                    }
                    pendingFormData.append('newPassword', password);
                }
                // Always require current password for any update
                showPasswordConfirmDialog();
            });

            // Handle password confirmation form submit
            if (passwordConfirmForm) {
                passwordConfirmForm.addEventListener('submit', async function(event) {
                    event.preventDefault();
                    const currentPassword = document.getElementById('currentPassword').value;
                    if (!currentPassword) {
                        if (window.unifiedNotificationSystem) {
                            window.unifiedNotificationSystem.showToast('Please enter your current password.', 'error');
                        } else {
                            alert('Please enter your current password.');
                        }
                        return;
                    }
                    if (!pendingFormData) {
                        if (window.unifiedNotificationSystem) {
                            window.unifiedNotificationSystem.showToast('No pending profile update.', 'error');
                        } else {
                            alert('No pending profile update.');
                        }
                        hidePasswordConfirmDialog();
                        return;
                    }
                    pendingFormData.append('currentPassword', currentPassword);
                    await submitProfileUpdate(pendingFormData);
                    // Only clear pendingFormData and hide the dialog on success or non-password errors (handled in submitProfileUpdate)

                });
            }

            // Profile update submission function
            async function submitProfileUpdate(formData) {
                try {
                    const response = await fetch('${BASE_URL}/api/gyms/profile/me', {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('gymAdminToken')}`
                        },
                        body: formData
                    });
                    const result = await response.json();
                    if (response.ok) {
                        showProfileUpdateMessage('Profile updated successfully!', 'success');
                        // Update logo preview in modal and avatar if new logo is present
                        if (result.gym && result.gym.logoUrl) {
                            let logoPath = result.gym.logoUrl;
                            // Always construct full URL for logo
                            if (!logoPath.startsWith('http')) {
                                logoPath = `${BASE_URL}/${logoPath.replace(/^\/+/, '')}`;
                            }
                            const cacheBustedLogo = `${logoPath}?${new Date().getTime()}`;
                            const logoPreviewImage = document.getElementById('logoPreviewImage');
                            if (logoPreviewImage) {
                                logoPreviewImage.src = cacheBustedLogo;
                                logoPreviewImage.style.display = 'block';
                            }
                            const adminAvatarElement = document.getElementById('adminAvatar');
                            if (adminAvatarElement) adminAvatarElement.src = `${logoPath}?${new Date().getTime()}`;
                            // Debug: Log the final logo URL used
                        }
                        if(editProfileModal) editProfileModal.style.display = 'none';
                        if(typeof hidePasswordConfirmDialog === 'function') hidePasswordConfirmDialog(); // Hide password dialog on success
                        pendingFormData = null;
                        fetchAndUpdateAdminProfile(); // Refresh the displayed profile info
                    } else {
                        // Show specific error for invalid current password
                        ; // Added empty statement to avoid 'if' as only statement in else block
                        if (result.message?.toLowerCase().includes('invalid current password')) {
                            showProfileUpdateMessage('Current password is incorrect.', 'error');
                            if (typeof hidePasswordConfirmDialog === 'function') hidePasswordConfirmDialog(); // Close only the password dialog
                            // Do NOT close the edit profile modal
                        } else {
                            showProfileUpdateMessage(`Error updating profile: ${result.message || 'Unknown error'}`, 'error');
                            if(editProfileModal) editProfileModal.style.display = 'none'; // Close modal for other errors
                        }
                    }
                } catch (error) {
                    console.error('Error submitting profile update:', error);
                    showProfileUpdateMessage('An error occurred while updating your profile. Please try again.', 'error');
                    if(editProfileModal) editProfileModal.style.display = 'none'; // Close modal on network/unknown error
                }
                // Only close modal on success or non-password errors
            }
        // --- Profile Update Message UI ---
        function showProfileUpdateMessage(message, type) {
            let msgDiv = document.getElementById('profileUpdateMessage');
            if (!msgDiv) {
                msgDiv = document.createElement('div');
                msgDiv.id = 'profileUpdateMessage';
                msgDiv.style.position = 'fixed';
                msgDiv.style.top = '80px';
                msgDiv.style.left = '50%';
                msgDiv.style.transform = 'translateX(-50%)';
                msgDiv.style.zIndex = 10000;
                msgDiv.style.padding = '12px 28px';
                msgDiv.style.borderRadius = '6px';
                msgDiv.style.fontWeight = 'bold';
                msgDiv.style.fontSize = '1.1rem';
                msgDiv.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
                document.body.appendChild(msgDiv);
            }
            msgDiv.textContent = message;
            msgDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            msgDiv.style.color = type === 'success' ? '#155724' : '#721c24';
            msgDiv.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
            msgDiv.style.display = 'block';
            clearTimeout(msgDiv._hideTimeout);
            msgDiv._hideTimeout = setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
        }
        // --- Change Password Logic ---
        const showChangePasswordFields = document.getElementById('showChangePasswordFields');
        const passwordFields = document.getElementById('passwordFields');
        const passwordInput = document.getElementById('editGymPassword');

        if (showChangePasswordFields && passwordFields) {
            showChangePasswordFields.addEventListener('click', function() {
                passwordFields.style.display = passwordFields.style.display === 'none' ? 'block' : 'none';
            });
        }
        // --- End Change Password Logic ---

        // File upload interaction
        const fileUploads = document.querySelectorAll('.file-upload');
        fileUploads.forEach(upload => {
            const input = upload.querySelector('input[type="file"]');
            
            upload.addEventListener('click', () => {
                input.click();
            });
            
            input.addEventListener('change', () => {
                if (input.files.length > 0) {
                    const fileName = input.files[0].name;
                    const textElement = upload.querySelector('.file-upload-text');
                    textElement.textContent = fileName;
                    upload.style.borderColor = 'var(--primary)';
                    upload.style.backgroundColor = 'rgba(58, 134, 255, 0.05)';
                }
            });
            
            // Drag and drop functionality
            upload.addEventListener('dragover', (e) => {
                e.preventDefault();
                upload.style.borderColor = 'var(--primary)';
                upload.style.backgroundColor = 'rgba(58, 134, 255, 0.1)';
            });
            
            upload.addEventListener('dragleave', () => {
                upload.style.borderColor = '#ced4da';
                upload.style.backgroundColor = 'transparent';
            });
            
            upload.addEventListener('drop', (e) => {
                e.preventDefault();
                input.files = e.dataTransfer.files;
                const fileName = input.files[0].name;
                const textElement = upload.querySelector('.file-upload-text');
                textElement.textContent = fileName;
                upload.style.borderColor = 'var(--primary)';
                upload.style.backgroundColor = 'rgba(58, 134, 255, 0.05)';
            });
        });
       
        // Rush hour toggle
        const rushHourToggle = document.querySelector('.rush-hour-toggle input');
        const rushHourIcon = document.querySelector('.rush-hour-icon');
        
        rushHourToggle.addEventListener('change', () => {
            if (rushHourToggle.checked) {
                rushHourIcon.classList.add('pulse');
                document.querySelector('.rush-hour-text h4').textContent = 'Rush Hour Active';
                document.querySelector('.rush-hour-text p').textContent = 'Extra staff deployed during peak hours (5PM-8PM)';
            } else {
                rushHourIcon.classList.remove('pulse');
                document.querySelector('.rush-hour-text h4').textContent = 'Rush Hour Inactive';
                document.querySelector('.rush-hour-text p').textContent = 'Normal operations during peak hours';
            }
        });

        // Quick action buttons
        const quickActionBtns = document.querySelectorAll('.quick-action');
        quickActionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Add ripple effect
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                btn.appendChild(ripple);
                
                // Remove ripple after animation
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });

        // Table row actions
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('tr');
                
                if (btn.classList.contains('approve')) {
                    const statusCell = row.querySelector('.status');
                    statusCell.textContent = 'Active';
                    statusCell.className = 'status active';
                    row.querySelectorAll('.action-btn').forEach(b => b.remove());
                    const viewBtn = document.createElement('button');
                    viewBtn.className = 'action-btn view';
                    viewBtn.textContent = 'View';
                    row.querySelector('td:last-child').appendChild(viewBtn);
                } else if (btn.classList.contains('reject')) {
                    row.remove();
                }
            });
        });
    }

// --- Dashboard Stats Loading ---
async function initializeStatCards() {
  try {
    // Show loading state
    showStatCardsLoading();
    
    // Fetch actual data from APIs
    await updateStatCardData();
    
    // Hide loading state
    hideStatCardsLoading();
    
  } catch (error) {
    console.error('❌ Error initializing stat cards:', error);
    hideStatCardsLoading();
    showStatCardsError();
  }
}

async function updateStatCardData() {
  try {
    const token = localStorage.getItem('gymAdminToken');
    if (!token) {
      console.warn('No auth token found, showing default values');
      updateStatCardsWithDefaultData();
      return;
    }


    // Fetch all stats in parallel
    const [membersStats, paymentsStats, attendanceStats, trainersStats] = await Promise.all([
      fetchMembersStats(token),
      fetchPaymentsStats(token),
      fetchAttendanceStats(token),
      fetchTrainersStats(token)
    ]);


    // Update each stat card
    updateMembersStatCard(membersStats);
    updatePaymentsStatCard(paymentsStats);
    updateAttendanceStatCard(attendanceStats);
    updateTrainersStatCard(trainersStats);

  } catch (error) {
    console.error('❌ Error updating stat cards:', error);
    updateStatCardsWithDefaultData();
  }
}

// Individual stat fetching functions
async function fetchMembersStats(token) {
  try {
    const response = await fetch('${BASE_URL}/api/members', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const members = await response.json();
      const total = members.length;
      
      // Calculate change based on new members from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const newMembers = members.filter(member => {
        const joinDate = new Date(member.joinDate);
        return joinDate >= sevenDaysAgo;
      });
      
      const change = total > 0 ? (newMembers.length / total) * 100 : 0;
      
      const result = { total, change: change.toFixed(1), active: total };
      return result;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    console.warn('👥 Using fallback for members stats:', error.message);
    return { total: 0, change: 0, active: 0 };
  }
}

async function fetchPaymentsStats(token) {
  try {
    const response = await fetch('${BASE_URL}/api/payments/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const stats = await response.json();
      return {
        total: stats.totalAmount || 0,
        change: stats.changePercentage || 0,
        monthly: stats.monthlyAmount || 0
      };
    }
    throw new Error('Failed to fetch payments stats');
  } catch (error) {
    console.warn('Using fallback for payments stats:', error.message);
    // Try alternative approach - get recent payments and calculate manually
    try {
      const recentResponse = await fetch('${BASE_URL}/api/payments/recent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (recentResponse.ok) {
        const payments = await recentResponse.json();
        const total = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        return { total, change: 0, monthly: total };
      }
    } catch (e) {
      console.warn('Alternative payment fetch also failed:', e.message);
    }
    return { total: 0, change: 0, monthly: 0 };
  }
}

async function fetchAttendanceStats(token) {
  try {
    // Try to get attendance data if available
    const response = await fetch('${BASE_URL}/api/attendance/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const stats = await response.json();
      return {
        percentage: stats.attendancePercentage || 0,
        trend: stats.trend || 'neutral'
      };
    }
    throw new Error('Failed to fetch attendance stats');
  } catch (error) {
    console.warn('Using fallback for attendance stats:', error.message);
    // Calculate basic attendance based on members
    try {
      const membersResponse = await fetch('${BASE_URL}/api/members', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (membersResponse.ok) {
        const members = await membersResponse.json();
        // Simulate attendance percentage based on active members
        const activeMembers = members.filter(member => {
          const validUntil = new Date(member.validUntil);
          return validUntil > new Date();
        });
        const percentage = members.length > 0 ? (activeMembers.length / members.length * 100) : 0;
        return { percentage: percentage.toFixed(0), trend: 'neutral' };
      }
    } catch (e) {
      console.warn('Alternative attendance calculation failed:', e.message);
    }
    return { percentage: 0, trend: 'neutral' };
  }
}

async function fetchTrainersStats(token) {
  try {
    const response = await fetch('${BASE_URL}/api/trainers', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const trainers = await response.json();
      const total = trainers.length;
      const active = trainers.filter(trainer => trainer.status === 'approved').length;
      
      // Calculate change based on recently added trainers
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentTrainers = trainers.filter(trainer => {
        const createdAt = new Date(trainer.createdAt || trainer.dateJoined);
        return createdAt >= thirtyDaysAgo;
      });
      
      const change = total > 0 ? (recentTrainers.length / total) * 100 : 0;
      
      return { total, active, change: change.toFixed(1) };
    }
    throw new Error('Failed to fetch trainers stats');
  } catch (error) {
    console.warn('Using fallback for trainers stats:', error.message);
    return { total: 0, active: 0, change: 0 };
  }
}

// Update individual stat cards with better error handling
function updateMembersStatCard(data) {
  const card = document.getElementById('membersStatCard');
  if (!card) return;

  const valueElement = card.querySelector('.stat-value');
  const changeElement = card.querySelector('.stat-change');
  
  
  if (valueElement) valueElement.textContent = data.total || 0;
  
  if (changeElement) {
    const change = parseFloat(data.change) || 0;
    const isPositive = change >= 0;
    
    changeElement.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
    changeElement.innerHTML = `
      <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
      ${Math.abs(change).toFixed(1)}%
    `;
  }
}

function updatePaymentsStatCard(data) {
  const card = document.querySelector('.stat-card.payments');
  if (!card) return;

  const valueElement = card.querySelector('.stat-value');
  const changeElement = card.querySelector('.stat-change');
  
  
  if (valueElement) {
    const total = data.total || 0;
    valueElement.textContent = `₹${total.toLocaleString('en-IN')}`;
  }
  
  if (changeElement) {
    const change = parseFloat(data.change) || 0;
    const isPositive = change >= 0;
    
    changeElement.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
    changeElement.innerHTML = `
      <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
      ${Math.abs(change).toFixed(1)}%
    `;
  }
}

function updateAttendanceStatCard(data) {
  const card = document.getElementById('attendanceStatCard');
  if (!card) return;

  const valueElement = card.querySelector('.stat-value');
  const changeElement = card.querySelector('.stat-change');
  
  
  if (valueElement) {
    valueElement.textContent = `${data.percentage || 0}%`;
  }
  
  if (changeElement) {
    const trend = data.trend || 'neutral';
    let icon = 'fa-clock';
    let text = 'Steady';
    
    if (trend === 'up') {
      icon = 'fa-arrow-up';
      text = 'Improving';
    } else if (trend === 'down') {
      icon = 'fa-arrow-down';
      text = 'Declining';
    }
    
    changeElement.className = `stat-change ${trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : 'neutral'}`;
    changeElement.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
  }
}

function updateTrainersStatCard(data) {
  const card = document.querySelector('.stat-card.trainers');
  if (!card) return;

  const valueElement = card.querySelector('.stat-value');
  const changeElement = card.querySelector('.stat-change');
  
  
  if (valueElement) valueElement.textContent = data.active || data.total || 0;
  
  if (changeElement) {
    const change = parseFloat(data.change) || 0;
    const isPositive = change >= 0;
    
    changeElement.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
    changeElement.innerHTML = `
      <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
      ${Math.abs(change).toFixed(1)}%
    `;
  }
}

// Loading state management
function showStatCardsLoading() {
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach(card => {
    card.classList.add('loading');
  });
}

function hideStatCardsLoading() {
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach(card => {
    card.classList.remove('loading');
  });
}

function showStatCardsError() {
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach(card => {
    const valueElement = card.querySelector('.stat-value');
    if (valueElement) {
      valueElement.textContent = 'Error';
    }
  });
}

function updateStatCardsWithDefaultData() {
  updateMembersStatCard({ total: 24, change: 8.5 });
  updatePaymentsStatCard({ total: 125000, change: 12.3 });
  updateAttendanceStatCard({ percentage: 78, trend: 'up' });
  updateTrainersStatCard({ active: 5, change: 2.1 });
}

// Legacy function aliases for compatibility
window.updateMembersStatsCard = function() {
  // Re-fetch and update members stats
  fetchMembersStats(localStorage.getItem('gymAdminToken')).then(updateMembersStatCard);
};

window.updatePaymentsStatsCard = function() {
  // Re-fetch and update payments stats
  fetchPaymentsStats(localStorage.getItem('gymAdminToken')).then(updatePaymentsStatCard);
};

// Test function for debugging stat cards (can be called from console)
window.testStatCards = async function() {
  const token = localStorage.getItem('gymAdminToken');
  
  if (token) {
    
    // Test members endpoint
    try {
      const membersResponse = await fetch('${BASE_URL}/api/members', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (membersResponse.ok) {
        const members = await membersResponse.json();
      }
    } catch (e) {
      console.error('👥 Members API error:', e);
    }
    
    // Test payments endpoint
    try {
      const paymentsResponse = await fetch('${BASE_URL}/api/payments/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (paymentsResponse.ok) {
        const payments = await paymentsResponse.json();
      }
    } catch (e) {
      console.error('💰 Payments API error:', e);
    }
    
    // Test trainers endpoint
    try {
      const trainersResponse = await fetch('${BASE_URL}/api/trainers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (trainersResponse.ok) {
        const trainers = await trainersResponse.json();
      }
    } catch (e) {
      console.error('🏋️ Trainers API error:', e);
    }
  }
  
  // Force refresh stat cards
  await initializeStatCards();
};

// Debug function to test token and API connection (callable from browser console)
window.debugMembersFetch = async function() {
  
  // Check token
  const token = localStorage.getItem('gymAdminToken');
  if (!token) {
    console.error('❌ No token found in localStorage');
    return;
  }
  
  
  // Decode token
  try {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));
    
    const now = Math.floor(Date.now() / 1000);
    const expired = payload.exp && payload.exp < now;
    if (expired) {
      console.error('❌ Token is EXPIRED!');
     
      return;
    }
    
    // Extract gym ID
    const gymId = payload.admin?.id || payload.admin?.gymId || payload.gym?.id || payload.id;
    
    // Test API call
    const url = `${BASE_URL}/api/members?gym=${gymId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    
    if (response.ok) {
      const data = await response.json();
    
      
      // Test table rendering
      const tableBody = document.getElementById('membersTableBody');
      if (tableBody) {
      }
    } else {
      const errorData = await response.text();
      console.error('❌ API ERROR:', errorData);
    }
  } catch (e) {
    console.error('❌ Error during debug:', e);
  }
};

// Quick function to force refresh members table (callable from console)
window.refreshMembersTable = function() {
  fetchAndDisplayMembers();
};

// Initialize dashboard customization on page load
document.addEventListener('DOMContentLoaded', function() {
  // Apply saved dashboard customization settings for this specific gym
  setTimeout(() => {
    const gymId = getGymId ? getGymId() : null;
    if (!gymId) {
      console.warn('No gym ID available for dashboard customization');
      return;
    }
    
    const savedEquipmentVisible = getGymSpecificSetting ? 
      getGymSpecificSetting(`dashboardEquipmentVisible_${gymId}`) !== 'false' : true;
    const savedPaymentVisible = getGymSpecificSetting ? 
      getGymSpecificSetting(`dashboardPaymentVisible_${gymId}`) !== 'false' : true;
    
 
    
    // Apply customization settings using the new unified function
    if (typeof applyTabVisibility === 'function') {
      applyTabVisibility('equipment', savedEquipmentVisible);
      applyTabVisibility('payment', savedPaymentVisible);
    } else {
      // Fallback to old functions if new one isn't available yet
      if (typeof toggleEquipmentTabVisibility === 'function') {
        toggleEquipmentTabVisibility(savedEquipmentVisible);
      }
      if (typeof togglePaymentTabVisibility === 'function') {
        togglePaymentTabVisibility(savedPaymentVisible);
      }
    }
  }, 100); // Reduced delay for faster application
});


// Members table body reference (global) used across fetch/render and row click handlers
const membersTableBody = document.getElementById('membersTableBody');

let allMembersCache = [];

// Helper function to validate and get token
function getValidToken() {
  const token = localStorage.getItem('gymAdminToken');
  
  if (!token) {
    console.error('❌ No token found in localStorage');
    return null;
  }
  
  // Check if token looks valid (JWT format: xxx.yyy.zzz)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('❌ Token format is invalid (not JWT)');
    localStorage.removeItem('gymAdminToken');
    return null;
  }
  
  try {
    // Decode token to check expiration
    const payload = JSON.parse(atob(parts[1]));
 
    
    // Check if token is expired
    if (payload.exp) {
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        console.error('❌ Token has expired');
        localStorage.removeItem('gymAdminToken');
        return null;
      }
    }
    
    return token;
  } catch (e) {
    console.error('❌ Error decoding token:', e);
    localStorage.removeItem('gymAdminToken');
    return null;
  }
}

// --- Enhanced Member Search & Filter Logic ---
async function fetchAndDisplayMembers() {
  if (!membersTableBody) return;
  membersTableBody.innerHTML = '<tr><td colspan="13" style="text-align:center;">Loading...</td></tr>';
  
  // Get and validate token
  const token = getValidToken();
  if (!token) {
    console.error('No valid authentication token found');
    membersTableBody.innerHTML = `<tr><td colspan="13" style="color:red;text-align:center;">Authentication required. Please log in again.</td></tr>`;
    setTimeout(() => {
      window.location.href = '/public/admin-login.html';
    }, 2000);
    return;
  }
  
  try {
    // Get gym ID for API call
    let gymId = null;
    
    // Try to get gym ID from currentGymProfile first
    if (window.currentGymProfile && window.currentGymProfile._id) {
      gymId = window.currentGymProfile._id;
    } else {
      // Fallback: extract from token
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        gymId = payload.admin?.gymId || payload.admin?.id || payload.gymId || payload.id;
      } catch (e) {
        console.warn('Could not extract gym ID from token', e);
      }
    }
    
    if (!gymId) {
      throw new Error('Gym ID not found. Please refresh the page.');
    }
    
    // Build API URL with gym ID parameter
    const apiUrl = `${BASE_URL}/api/members?gym=${gymId}`;
    
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    
    // Handle 401 Unauthorized specifically
    if (res.status === 401) {
      console.error('❌ 401 Authentication failed - token may be expired');
      const errorText = await res.text();
      console.error('Error response:', errorText);
      localStorage.removeItem('gymAdminToken');
      membersTableBody.innerHTML = `<tr><td colspan="13" style="color:red;text-align:center;">Session expired. Redirecting to login...</td></tr>`;
      setTimeout(() => {
        window.location.href = '/public/admin-login.html';
      }, 2000);
      return;
    }
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Server error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Failed to fetch members' };
      }
      throw new Error(errorData.message || `Server error: ${res.status}`);
    }
    
    const members = await res.json();
 
    
    allMembersCache = Array.isArray(members) ? members : [];
    
    if (allMembersCache.length === 0) {
      membersTableBody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:20px;color:#666;">No members found. Add your first member to get started!</td></tr>`;
      return;
    }
    
    renderMembersTable(allMembersCache);
    
  } catch (err) {
    console.error('❌ Error loading members:', err);
    membersTableBody.innerHTML = `<tr><td colspan="13" style="color:red;text-align:center;">Error loading members: ${err.message}</td></tr>`;
  }
}

// --- Search & Filter Handlers ---
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('memberSearchInput');
  const expiryFilter = document.getElementById('membershipExpiryFilter');
  if (searchInput) {
    searchInput.addEventListener('input', handleMemberSearchAndFilter);
  }
  if (expiryFilter) {
    expiryFilter.addEventListener('change', handleMemberSearchAndFilter);
  }
});

function handleMemberSearchAndFilter() {
  const searchInput = document.getElementById('memberSearchInput');
  const expiryFilter = document.getElementById('membershipExpiryFilter');
  let filtered = allMembersCache.slice();
  // --- Search ---
  const q = (searchInput?.value || '').trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(m => {
      return (
        (m.memberName && m.memberName.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.phone && m.phone.toLowerCase().includes(q)) ||
        (m.membershipId && m.membershipId.toLowerCase().includes(q))
      );
    });
  }
  // --- Expiry Filter ---
  const filterVal = expiryFilter?.value;
  if (filterVal === '3days' || filterVal === '1day') {
    const days = filterVal === '3days' ? 3 : 1;
    const now = new Date();
    filtered = filtered.filter(m => {
      if (!m.membershipValidUntil) return false;
      const validUntil = new Date(m.membershipValidUntil);
      const diff = (validUntil - now) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= days;
    });
  }
  renderMembersTable(filtered);
}

function renderMembersTable(members) {

  
  if (!membersTableBody) {
    console.error('❌ membersTableBody element not found!');
    return;
  }
  
  if (!Array.isArray(members) || !members.length) {
    membersTableBody.innerHTML = '<tr><td colspan="14" style="text-align:center; color:#888;">No members found.</td></tr>';
    return;
  }
  
  
  // Build all rows as an array first, then insert once (more efficient)
  const rows = [];
  const today = new Date();
  today.setHours(0,0,0,0);
  
  members.forEach((member, index) => {
    const imgSrc = member.profileImage ? `${BASE_URL}${member.profileImage}` : 'https://via.placeholder.com/48?text=Photo';
    const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '';
    const membershipId = member.membershipId || '';
    const validUntilRaw = member.membershipValidUntil;
    const validUntil = validUntilRaw ? new Date(validUntilRaw).toLocaleDateString() : '';
    const amountPaid = member.paymentAmount !== undefined ? member.paymentAmount : '';
    const address = member.address || member.memberAddress || '';
    const rowId = member._id ? `data-member-id="${member._id}"` : '';
    
    // Payment status badge (removed paid badge, keeping only pending and overdue)
    // Exclude cash payment members with paid status from showing pending payment badges
    let paymentStatusBadge = '';
    const paymentStatus = member.paymentStatus || '';
    const pendingAmount = member.pendingPaymentAmount;
    
    if ((paymentStatus === 'pending' || (pendingAmount && pendingAmount > 0)) &&
        !(member.paymentMode === 'Cash' && paymentStatus === 'paid')) {
      paymentStatusBadge = `<span class="payment-status-badge pending" style="background:#ff6b6b;color:white;padding:2px 8px;border-radius:12px;font-size:0.75em;margin-left:5px;">💳 Payment Pending</span>`;
    } else if (paymentStatus === 'overdue') {
      paymentStatusBadge = `<span class="payment-status-badge overdue" style="background:#d63031;color:white;padding:2px 8px;border-radius:12px;font-size:0.75em;margin-left:5px;">⚠️ Overdue</span>`;
    }
    // Removed paid badge as requested

    // Row color logic and action button logic
    let statusClass = '';
    let actionButton = '';
    
    // Check if member has payment pending status (takes priority over expiry status)
    // Skip pending payment logic for members with cash payment mode and paid status (cash validation)
    if ((paymentStatus === 'pending' || (pendingAmount && pendingAmount > 0)) && 
        !(member.paymentMode === 'Cash' && paymentStatus === 'paid')) {
      statusClass = 'member-row-payment-pending'; // Yellow effect for payment pending
      actionButton = `
        <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
          <button class="mark-paid-btn" data-member-id="${member._id}" data-source="members-table" style="background:#28a745;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.75em;font-weight:500;" title="Mark payment as received">✅ Mark Paid</button>
        </div>
      `;
    } else if (validUntilRaw) {
      const validDate = new Date(validUntilRaw);
      validDate.setHours(0,0,0,0);
      const diffDays = Math.ceil((validDate - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        statusClass = 'member-row-expired';
        actionButton = `
          <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
            <button class="renew-membership-btn" data-member-id="${member._id}" style="background:#1976d2;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.75em;font-weight:500;" title="Regular renewal with immediate payment">🔄 Renew</button>
            <button class="seven-day-allowance-btn" data-member-id="${member._id}" style="background:#ff9800;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.75em;font-weight:500;" title="Grant 7-day allowance with pending payment">⏰ 7-Day</button>
          </div>
        `;
      } else if (diffDays <= 3) {
        statusClass = 'member-row-expiring';
        actionButton = `
          <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
            <button class="renew-membership-btn" data-member-id="${member._id}" style="background:#1976d2;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.75em;font-weight:500;" title="Regular renewal with immediate payment">🔄 Renew</button>
            <button class="seven-day-allowance-btn" data-member-id="${member._id}" style="background:#ff9800;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.75em;font-weight:500;" title="Grant 7-day allowance with pending payment">⏰ 7-Day</button>
          </div>
        `;
      } else {
        statusClass = 'member-row-active';
        actionButton = `<span style="color:#4caf50;font-size:0.85em;">✅ Active</span>`;
      }
    } else {
      actionButton = `
        <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
          <button class="renew-membership-btn" data-member-id="${member._id}" style="background:#1976d2;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.75em;font-weight:500;" title="Regular renewal with immediate payment">🔄 Renew</button>
          <button class="seven-day-allowance-btn" data-member-id="${member._id}" style="background:#ff9800;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:0.75em;font-weight:500;" title="Grant 7-day allowance with pending payment">⏰ 7-Day</button>
        </div>
      `;
    }
    
    rows.push(`
      <tr ${rowId} class="${statusClass}">
        <td style="text-align:center;"><img src="${imgSrc}" alt="Profile" style="width:48px;height:48px;border-radius:50%;object-fit:cover;"></td>
        <td>${member.memberName || ''}${paymentStatusBadge}</td>
         <td>${membershipId}</td>
        <td>${member.age || ''}</td>
        <td>${member.gender || ''}</td>
        <td>${member.phone || ''}</td>
        <td>${member.email || ''}</td>
        <td>${address}</td>
        <td>${member.planSelected || ''}</td>
        <td>${member.monthlyPlan || ''}</td>
        <td>${member.activityPreference || ''}</td>
         <td>${joinDate}</td>
        <td>${validUntil}</td>
        <td>${amountPaid}</td>
        <td style="text-align:center;">${actionButton}</td>
      </tr>
    `);
  });
  
  // Insert all rows at once
  membersTableBody.innerHTML = rows.join('');
  
 
}
// Ensure only one event listener is attached and openMembersDetailCard is always available
function openMembersDetailCard() {
  const membersDetailCard = document.getElementById('membersDetailCard');
  const membersDetailLoading = document.getElementById('membersDetailLoading');
  const membersDetailError = document.getElementById('membersDetailError');
  const membersDetailContent = document.getElementById('membersDetailContent');
  const newMembersList = document.getElementById('newMembersList');
  const existingMembersList = document.getElementById('existingMembersList');
  if (membersDetailCard) {
    membersDetailCard.style.display = 'flex';
    if (membersDetailLoading) membersDetailLoading.style.display = 'block';
    if (membersDetailError) membersDetailError.style.display = 'none';
    if (membersDetailContent) membersDetailContent.style.display = 'none';
    fetchAndRenderMembersDetail();
  }
  // Helper to split members into new and existing
  function splitMembersByJoinDate(members, days = 30) {
    const now = new Date();
    const newMembers = [];
    const existingMembers = [];
    members.forEach(member => {
      if (!member.joinDate) {
        existingMembers.push(member);
        return;
      }
      const join = new Date(member.joinDate);
      const diffDays = (now - join) / (1000 * 60 * 60 * 24);
      if (diffDays <= days) newMembers.push(member);
      else existingMembers.push(member);
    });
    return { newMembers, existingMembers };
  }

  // Helper to render member list HTML
  function renderMemberList(members, renderItem, emptyMsg) {
    return members.length
      ? members.map(renderItem).join('')
      : `<li style="color:#888;">${emptyMsg}</li>`;
  }

  // Helper to render a member list item
  function renderMemberListItem(member) {
    const img = member.profileImageUrl
      ? `<img src="${member.profileImageUrl}" alt="${member.name || member.memberName || ''}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:10px;">`
      : `<span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:#eee;margin-right:10px;"></span>`;
    const name = member.name || member.memberName || 'Member';
    const plan = member.planSelected || member.plan || '';
    const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '';
    return `<li style="display:flex;align-items:center;margin-bottom:10px;">${img}<div><div style="font-weight:500;">${name}</div><div style="font-size:0.95em;color:#888;">${plan}${joinDate ? ' | Joined: ' + joinDate : ''}</div></div></li>`;
  }

  // Refactored: fetch and render members detail with reduced complexity and unique log
  async function fetchAndRenderMembersDetail() {
    if (membersDetailLoading) membersDetailLoading.style.display = 'block';
    if (membersDetailError) membersDetailError.style.display = 'none';
    if (membersDetailContent) membersDetailContent.style.display = 'none';
    if (newMembersList) newMembersList.innerHTML = '';
    if (existingMembersList) existingMembersList.innerHTML = '';
    const token = localStorage.getItem('gymAdminToken');
    try {
      const res = await fetch('${BASE_URL}/api/members', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.members)) {
        throw new Error(data.message || 'Failed to fetch members');
      }
      // Use helper to split members
      const { newMembers, existingMembers } = splitMembersByJoinDate(data.members, 30);
      if (newMembersList)
        newMembersList.innerHTML = renderMemberList(
          newMembers,
          renderMemberListItem,
          'No new members in last 30 days.'
        );
      if (existingMembersList)
        existingMembersList.innerHTML = renderMemberList(
          existingMembers,
          renderMemberListItem,
          'No existing members.'
        );
      if (membersDetailLoading) membersDetailLoading.style.display = 'none';
      if (membersDetailContent) membersDetailContent.style.display = 'block';
      // Unique log for this instance
    } catch (err) {
      if (membersDetailLoading) membersDetailLoading.style.display = 'none';
      if (membersDetailError) {
        membersDetailError.textContent = err.message || 'Failed to load members.';
        membersDetailError.style.display = 'block';
      }
    }
  }
}
window.openMembersDetailCard = openMembersDetailCard;

// --- Member Detail Drawer: Show details for clicked member row ---
if (membersTableBody) {
  membersTableBody.addEventListener('click', function(e) {
    // Check if the clicked element is a renew membership button
    if (e.target.classList.contains('renew-membership-btn')) {
      e.stopPropagation(); // Prevent row click event
      
      const memberId = e.target.getAttribute('data-member-id');
      if (!memberId) {
        console.error('Member ID not found on renew button');
        return;
      }
      
      // Find member data from cache
      const memberData = allMembersCache.find(m => m._id === memberId);
      if (!memberData) {
        showDialog({
          title: 'Error',
          message: 'Member data not found. Please refresh the page and try again.',
          confirmText: 'OK',
          iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#e53935;font-size:2.2em;"></i>'
        });
        return;
      }
      
      // Open renewal modal with member data
      if (typeof window.openRenewalModal === 'function') {
        window.openRenewalModal(memberData);
      } else {
        console.error('openRenewalModal function not available');
      }
      return;
    }
    
    // Check if clicking action buttons
    if (e.target.closest('.mark-paid-btn, .seven-day-allowance-btn')) {
      return; // Let those buttons handle their own logic
    }
    
    // Original row click functionality for member details
    let tr = e.target;
    while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
    if (tr && tr.hasAttribute('data-member-id')) {
      const memberId = tr.getAttribute('data-member-id');
      const memberData = allMembersCache.find(m => m._id === memberId);
      
      if (memberData) {
        showMemberDrawer(memberData);
      }
    }
  });
}

// Show member detail drawer
function showMemberDrawer(member) {
  const drawer = document.getElementById('membersDetailDrawer');
  const drawerBody = document.getElementById('memberDrawerBody');
  const drawerFooter = document.getElementById('memberDrawerFooter');
  
  if (!drawer || !drawerBody) return;  
  
  // Calculate membership status
  const validUntilDate = member.membershipValidUntil ? new Date(member.membershipValidUntil) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let status = 'active';
  let statusLabel = 'Active';
  let statusIcon = '<i class="fas fa-check-circle" style="color:#28a745;"></i>';
  
  if (validUntilDate) {
    validUntilDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((validUntilDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      status = 'expired';
      statusLabel = 'Expired';
      statusIcon = '<i class="fas fa-times-circle" style="color:#dc3545;"></i>';
    } else if (diffDays <= 3) {
      status = 'expiring';
      statusLabel = 'Expiring Soon';
      statusIcon = '<i class="fas fa-exclamation-triangle" style="color:#ffc107;"></i>';
    }
  }
  
  // Check payment status
  const paymentStatus = member.paymentStatus || '';
  let paymentBadge = '';
  if (paymentStatus === 'pending' || member.pendingPaymentAmount > 0) {
    paymentBadge = `<div class="member-status-badge pending">${'💳'} Payment Pending</div>`;
  }
  
  // Build drawer content
  const content = `
    <!-- Profile Section -->
    <div class="member-profile-section">
      <img src="${member.profileImage || 'https://via.placeholder.com/120?text=Photo'}" 
           alt="${member.memberName}" 
           class="member-profile-avatar">
      <div class="member-profile-name">${member.memberName || 'Unknown Member'}</div>
      <div class="member-profile-id">${member.membershipId || 'N/A'}</div>
      <div class="member-status-badges">
        <div class="member-status-badge ${status}">${statusIcon} ${statusLabel}</div>
        ${paymentBadge}
      </div>
    </div>
    
    <!-- Membership Plan -->
    <div class="member-info-section">
      <div class="member-info-header">
        <i class="fas fa-crown"></i>
        <span>Membership Plan</span>
      </div>
      <div class="member-info-grid">
        <div class="member-plan-card">
          <div class="member-plan-name">
            <i class="fas fa-star"></i>
            ${member.planSelected || 'N/A'}
          </div>
          <div class="member-plan-details">
            <span><strong>Duration:</strong> ${member.monthlyPlan || 'N/A'}</span>
            <span><strong>Amount:</strong> ₹${member.paymentAmount || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Contact Information -->
    <div class="member-info-section">
      <div class="member-info-header">
        <i class="fas fa-address-card"></i>
        <span>Contact Information</span>
      </div>
      <div class="member-info-grid">
        <div class="member-info-item">
          <div class="member-info-label"><i class="fas fa-phone"></i> Phone Number</div>
          <div class="member-info-value">${member.phone || 'Not provided'}</div>
        </div>
        <div class="member-info-item">
          <div class="member-info-label"><i class="fas fa-envelope"></i> Email Address</div>
          <div class="member-info-value">${member.email || 'Not provided'}</div>
        </div>
        <div class="member-info-item">
          <div class="member-info-label"><i class="fas fa-map-marker-alt"></i> Address</div>
          <div class="member-info-value">${member.address || member.memberAddress || 'Not provided'}</div>
        </div>
      </div>
    </div>
    
    <!-- Personal Information -->
    <div class="member-info-section">
      <div class="member-info-header">
        <i class="fas fa-user"></i>
        <span>Personal Information</span>
      </div>
      <div class="member-info-grid">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="member-info-item">
            <div class="member-info-label"><i class="fas fa-venus-mars"></i> Gender</div>
            <div class="member-info-value">${member.gender || 'Not specified'}</div>
          </div>
          <div class="member-info-item">
            <div class="member-info-label"><i class="fas fa-birthday-cake"></i> Age</div>
            <div class="member-info-value">${member.age || 'Not specified'}</div>
          </div>
        </div>
        <div class="member-info-item">
          <div class="member-info-label"><i class="fas fa-dumbbell"></i> Activity Preference</div>
          <div class="member-info-value highlight">${member.activityPreference || 'Not specified'}</div>
        </div>
      </div>
    </div>
    
    <!-- Membership Timeline -->
    <div class="member-info-section">
      <div class="member-info-header">
        <i class="fas fa-calendar-alt"></i>
        <span>Membership Timeline</span>
      </div>
      <div class="member-info-grid">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="member-info-item">
            <div class="member-info-label"><i class="fas fa-calendar-plus"></i> Join Date</div>
            <div class="member-info-value">${member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'}</div>
          </div>
          <div class="member-info-item">
            <div class="member-info-label"><i class="fas fa-calendar-check"></i> Valid Until</div>
            <div class="member-info-value ${status === 'expired' ? 'text-danger' : status === 'expiring' ? 'text-warning' : 'text-success'}">${member.membershipValidUntil ? new Date(member.membershipValidUntil).toLocaleDateString() : 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Payment Information -->
    <div class="member-info-section">
      <div class="member-info-header">
        <i class="fas fa-credit-card"></i>
        <span>Payment Information</span>
      </div>
      <div class="member-info-grid">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div class="member-info-item">
            <div class="member-info-label"><i class="fas fa-rupee-sign"></i> Amount Paid</div>
            <div class="member-info-value highlight">₹${member.paymentAmount || 'N/A'}</div>
          </div>
          <div class="member-info-item">
            <div class="member-info-label"><i class="fas fa-money-bill-wave"></i> Payment Mode</div>
            <div class="member-info-value">${member.paymentMode || 'N/A'}</div>
          </div>
        </div>
        ${paymentStatus === 'pending' ? `
          <div class="member-info-item">
            <div class="member-info-label"><i class="fas fa-hourglass-half"></i> Pending Amount</div>
            <div class="member-info-value" style="color:#ff9800;font-weight:700;">₹${member.pendingPaymentAmount || 'N/A'}</div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  drawerBody.innerHTML = content;
  
  // Show drawer
  drawer.style.display = 'block';
  setTimeout(() => {
    drawer.classList.add('active');
  }, 10);
  
  // Show footer
  if (drawerFooter) {
    drawerFooter.style.display = 'flex';
  }
  
  // Setup event listeners
  setupDrawerEventListeners(member);
}

// Setup drawer event listeners
function setupDrawerEventListeners(member) {
  const drawer = document.getElementById('membersDetailDrawer');
  const backdrop = document.getElementById('memberDrawerBackdrop');
  const closeBtn = document.getElementById('closeMemberDrawer');
  const editBtn = document.getElementById('editMemberDrawerBtn');
  const renewBtn = document.getElementById('renewMemberDrawerBtn');
  const deleteBtn = document.getElementById('deleteMemberDrawerBtn');
  
  // Close handlers
  const closeDrawer = () => {
    drawer.classList.remove('active');
    setTimeout(() => {
      drawer.style.display = 'none';
    }, 300);
  };
  
  if (closeBtn) {
    closeBtn.onclick = closeDrawer;
  }
  
  if (backdrop) {
    backdrop.onclick = closeDrawer;
  }
  
  // Edit button - opens edit modal with member data
  if (editBtn) {
    editBtn.onclick = () => {
      closeDrawer();
      setTimeout(() => {
        openMemberEditModal(member);
      }, 350);
    };
  }
  
  // Renew button
  if (renewBtn) {
    renewBtn.onclick = () => {
      closeDrawer();
      setTimeout(() => {
        if (typeof window.openRenewalModal === 'function') {
          window.openRenewalModal(member);
        } else {
          console.error('openRenewalModal function not found');
          showDialog({
            title: 'Error',
            message: 'Renewal modal not available. Please refresh the page.',
            confirmText: 'OK',
            iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#f44336;font-size:2.5em;"></i>'
          });
        }
      }, 350);
    };
  }
  
  // Delete button
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      showDialog({
        title: 'Remove Member?',
        message: `Are you sure you want to remove ${member.memberName || 'this member'}? This action cannot be undone.`,
        confirmText: 'Yes, Remove',
        cancelText: 'Cancel',
        iconHtml: '<i class="fas fa-trash-alt" style="color:#f44336;font-size:2.5em;"></i>',
        onConfirm: async () => {
          try {
            const token = localStorage.getItem('gymAdminToken');
            const response = await fetch(`${BASE_URL}/api/members/bulk`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ membershipIds: [member.membershipId] })
            });
            
            if (response.ok) {
              closeDrawer();
              showDialog({
                title: 'Success!',
                message: 'Member removed successfully.',
                confirmText: 'OK',
                iconHtml: '<i class="fas fa-check-circle" style="color:#4caf50;font-size:2.5em;"></i>',
                onConfirm: () => {
                  if (typeof fetchAndDisplayMembers === 'function') {
                    fetchAndDisplayMembers();
                  }
                }
              });
            } else {
              throw new Error('Failed to remove member');
            }
          } catch (error) {
            console.error('Error removing member:', error);
            showDialog({
              title: 'Error',
              message: 'Failed to remove member. Please try again.',
              confirmText: 'OK',
              iconHtml: '<i class="fas fa-exclamation-triangle" style="color:#f44336;font-size:2.5em;"></i>'
            });
          }
        }
      });
    };
  }
}

// Open member edit modal with pre-filled data
function openMemberEditModal(member) {
  const modal = document.getElementById('addMemberModal');
  if (!modal) {
    console.error('Add member modal not found');
    return;
  }
  
  // Show modal
  modal.style.display = 'flex';
  
  // Update modal title to "Edit Member"
  const modalTitle = modal.querySelector('.modal-title-style');
  if (modalTitle) {
    modalTitle.innerHTML = '<i class="fas fa-user-edit"></i> Edit Member';
  }
  
  // Pre-fill form fields with member data
  setTimeout(() => {
    const form = document.getElementById('addMemberForm');
    if (!form) return;
    
    // Set member ID in hidden field for update
    let memberIdInput = document.getElementById('editMemberId');
    if (!memberIdInput) {
      memberIdInput = document.createElement('input');
      memberIdInput.type = 'hidden';
      memberIdInput.id = 'editMemberId';
      memberIdInput.name = 'memberId';
      form.appendChild(memberIdInput);
    }
    memberIdInput.value = member._id;
    
    // Fill form fields
    const nameInput = document.getElementById('memberName');
    const ageInput = document.getElementById('memberAge');
    const genderInput = document.getElementById('memberGender');
    const phoneInput = document.getElementById('memberPhone');
    const emailInput = document.getElementById('memberEmail');
    const addressInput = document.getElementById('memberAddress');
    const activityInput = document.getElementById('activityPreference');
    
    if (nameInput) nameInput.value = member.memberName || '';
    if (ageInput) ageInput.value = member.age || '';
    if (genderInput) genderInput.value = member.gender || '';
    if (phoneInput) phoneInput.value = member.phone || '';
    if (emailInput) emailInput.value = member.email || '';
    if (addressInput) addressInput.value = member.address || '';
    if (activityInput) activityInput.value = member.activityPreference || '';
    
    // Disable fields that shouldn't be edited
    if (nameInput) nameInput.disabled = true;
    if (ageInput) ageInput.disabled = true;
    if (genderInput) genderInput.disabled = true;
    
    // Update profile image preview
    const profileImg = document.getElementById('memberImageTag');
    if (profileImg && member.profileImage) {
      profileImg.src = member.profileImage;
    }
    
    // Change submit button text
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Member';
      submitBtn.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
    }
    
    // Mark form as edit mode
    form.dataset.editMode = 'true';
  }, 100);
}

// Keep old function for compatibility but redirect to new drawer
function showMemberDetailCard(member) {
  showMemberDrawer(member);
}

// Enable editing for allowed fields in the member detail card
function enableMemberDetailEdit(member) {
  const modal = document.getElementById('membersDetailCard');
  if (!modal) return;
  // Build the edit form
  const content = `
    <div class="modal-content member-detail-modal">
      <div class="member-detail-header" style="position:relative;">
        <button id="saveMemberDetailBtn" title="Save Changes" style="position:absolute;left:18px;top:16px;background:none;border:none;cursor:pointer;font-size:1.25rem;color:#fff;z-index:3;transition:color 0.2s;"><i class='fas fa-save'></i></button>
        <h2 class="member-detail-title" style="margin-left:32px;">
          <i class="fas fa-id-card-alt"></i> Edit Member
        </h2>
        <button id="closeMembersDetailCard" class="modal-close" title="Close">&times;</button>
      </div>
      <form id="memberDetailEditForm" class="member-detail-body" autocomplete="off" enctype="multipart/form-data">
        <div class="member-detail-top">
          <label for="editMemberProfilePic" style="cursor:pointer;">
            <img src="${member.profileImage}" alt="Profile" class="profile-pic" id="editMemberProfilePicPreview">
            <input type="file" id="editMemberProfilePic" name="profileImage" accept="image/*" style="display:none;">
            <div style="font-size:0.95em;color:#1976d2;text-align:center;margin-top:4px;">Change Photo</div>
          </label>
          <div>
            <div class="member-name">${member.memberName}</div>
            <div class="member-id">${member.membershipId}</div>
          </div>
        </div>
        <ul class="info-list">
          <li><i class="fas fa-crown"></i> <span class="member-detail-label">Plan:</span> <span class="plan-badge">${member.planSelected} (${member.monthlyPlan})</span></li>
          <li><i class="fas fa-dumbbell"></i> <span class="member-detail-label">Activity:</span> <input type="text" id="editMemberActivity" name="activityPreference" value="${member.activityPreference}" class="edit-input"></li>
          <li><i class="fas fa-phone"></i> <span class="member-detail-label">Phone:</span> <input type="tel" id="editMemberPhone" name="phone" value="${member.phone}" class="edit-input"></li>
          <li><i class="fas fa-envelope"></i> <span class="member-detail-label">Email:</span> <input type="email" id="editMemberEmail" name="email" value="${member.email}" class="edit-input"></li>
          <li><i class="fas fa-map-marker-alt"></i> <span class="member-detail-label">Address:</span> <input type="text" id="editMemberAddress" name="address" value="${member.address || ''}" class="edit-input"></li>
          <li><i class="fas fa-venus-mars"></i> <span class="member-detail-label">Gender:</span> ${member.gender} <span class="member-detail-label">Age:</span> ${member.age}</li>
          <li><i class="fas fa-calendar-plus"></i> <span class="member-detail-label">Join Date:</span> ${member.joinDate}</li>
          <li><i class="fas fa-calendar-check"></i> <span class="member-detail-label">Valid Until:</span> ${member.validUntil}</li>
          <li><i class="fas fa-rupee-sign"></i> <span class="member-detail-label">Amount Paid:</span> ${member.paymentAmount}</li>
        </ul>
      </form>
    </div>
  `;
  modal.innerHTML = content;
  modal.style.display = 'flex';
  // Add close logic
  const closeBtn = document.getElementById('closeMembersDetailCard');
  if (closeBtn) closeBtn.onclick = function() { modal.style.display = 'none'; };
  // Save logic
  const saveBtn = document.getElementById('saveMemberDetailBtn');
  if (saveBtn) {
    saveBtn.onclick = function() {
      submitMemberDetailEdit(member);
    };
  }
  // Profile image preview logic
  const fileInput = document.getElementById('editMemberProfilePic');
  const imgPreview = document.getElementById('editMemberProfilePicPreview');
  if (fileInput && imgPreview) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
          imgPreview.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// Handle submit for member detail edit (calls backend API)
async function submitMemberDetailEdit(originalMember) {
  const modal = document.getElementById('membersDetailCard');
  if (!modal) return;
  const form = document.getElementById('memberDetailEditForm');
  if (!form) return;
  // Use the MongoDB _id for updates
  const memberObjectId = originalMember._id;
  if (!memberObjectId) {
    if (window.unifiedNotificationSystem) {
      window.unifiedNotificationSystem.showToast('Member record ID not found. Cannot update.', 'error');
    } else {
      alert('Member record ID not found. Cannot update.');
    }
    return;
  }
  const formData = new FormData();
  formData.append('activityPreference', form.activityPreference.value);
  formData.append('phone', form.phone.value);
  formData.append('email', form.email.value);
  formData.append('address', form.address.value);
  // Profile image
  const fileInput = form.profileImage;
  if (fileInput?.files?.[0]) {
    formData.append('profileImage', fileInput.files[0]);
  }
  try {
    const token = localStorage.getItem('gymAdminToken');
    // Use the backend API: PUT /api/members/:_id
    const response = await fetch(`${BASE_URL}/api/members/${memberObjectId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      }
    );
    const result = await response.json();
    if (response.ok) {
      // Show updated card with new data
      showMemberDetailCard(result.member);
      showMemberUpdateMessage('Member details updated successfully!', 'success');
      // Optionally refresh the members table
      if (typeof fetchAndDisplayMembers === 'function') fetchAndDisplayMembers();
    } else {
      showMemberUpdateMessage(result.message || 'Failed to update member.', 'error');
    }
  } catch (err) {
    console.error('Error updating member details:', err);
    showMemberUpdateMessage('Network error. Please try again.', 'error');
  }
}

// Show update message for member detail edits
function showMemberUpdateMessage(message, type) {
  let msgDiv = document.getElementById('memberUpdateMessage');
  if (!msgDiv) {
    msgDiv = document.createElement('div');
    msgDiv.id = 'memberUpdateMessage';
    msgDiv.style.position = 'fixed';
    msgDiv.style.top = '80px';
    msgDiv.style.left = '50%';
    msgDiv.style.transform = 'translateX(-50%)';
    msgDiv.style.zIndex = 10000;
    msgDiv.style.padding = '12px 28px';
    msgDiv.style.borderRadius = '6px';
    msgDiv.style.fontWeight = 'bold';
    msgDiv.style.fontSize = '1.1rem';
    msgDiv.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
    document.body.appendChild(msgDiv);
  }
  msgDiv.textContent = message;
  msgDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
  msgDiv.style.color = type === 'success' ? '#155724' : '#721c24';
  msgDiv.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
  msgDiv.style.display = 'block';
  clearTimeout(msgDiv._hideTimeout);
  msgDiv._hideTimeout = setTimeout(() => { msgDiv.style.display = 'none'; }, 3000);
}
  
document.addEventListener('DOMContentLoaded', function() {
  const membersTableBody = document.getElementById('membersTableBody');
  const membersDetailCard = document.getElementById('membersDetailCard');
  const closeMembersDetailCard = document.getElementById('closeMembersDetailCard');
  const membersDetailLoading = document.getElementById('membersDetailLoading');
  const membersDetailError = document.getElementById('membersDetailError');
  const membersDetailContent = document.getElementById('membersDetailContent');
  const newMembersList = document.getElementById('newMembersList');
  const existingMembersList = document.getElementById('existingMembersList');

  function openMembersDetailCard() {
    if (membersDetailCard) {
      membersDetailCard.style.display = 'flex';
      if (membersDetailLoading) membersDetailLoading.style.display = 'block';
      if (membersDetailError) membersDetailError.style.display = 'none';
      if (membersDetailContent) membersDetailContent.style.display = 'none';
      fetchAndRenderMembersDetail();
    }
  }
  function closeMembersDetailCardFunc() {
    if (membersDetailCard) membersDetailCard.style.display = 'none';
  }
  if (membersTableBody) {
    membersTableBody.addEventListener('click', function(e) {
      let tr = e.target;
      while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
      if (tr) {
        openMembersDetailCard();
      }
    });
  }
  if (closeMembersDetailCard) {
    closeMembersDetailCard.addEventListener('click', closeMembersDetailCardFunc);
  }
  if (membersDetailCard) {
    membersDetailCard.addEventListener('mousedown', function(e) {
      if (e.target === membersDetailCard) closeMembersDetailCardFunc();
    });
  }
  async function fetchAndRenderMembersDetail() {
    showMembersDetailLoading();
    clearMembersDetailLists();
    const token = localStorage.getItem('gymAdminToken');
    try {
      const members = await fetchMembers(token);
      const { newMembers, existingMembers } = splitMembersByJoinDate(members, 30);
      renderMembersDetailLists(newMembers, existingMembers);
      showMembersDetailContent();
    } catch (err) {
      showMembersDetailError(err);
    }
  }

  function showMembersDetailLoading() {
    if (membersDetailLoading) membersDetailLoading.style.display = 'block';
    if (membersDetailError) membersDetailError.style.display = 'none';
    if (membersDetailContent) membersDetailContent.style.display = 'none';
  }

  function clearMembersDetailLists() {
    if (newMembersList) newMembersList.innerHTML = '';
    if (existingMembersList) existingMembersList.innerHTML = '';
  }

  async function fetchMembers(token) {
    const res = await fetch('${BASE_URL}/api/members', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.members)) {
      throw new Error(data.message || 'Failed to fetch members');
    }
    return data.members;
  }

  function splitMembersByJoinDate(members, days = 30) {
    const now = new Date();
    const newMembers = [];
    const existingMembers = [];
    members.forEach(member => {
      if (!member.joinDate) return existingMembers.push(member);
      const join = new Date(member.joinDate);
      const diffDays = (now - join) / (1000 * 60 * 60 * 24);
      if (diffDays <= days) newMembers.push(member);
      else existingMembers.push(member);
    });
    return { newMembers, existingMembers };
  }

  function renderMembersDetailLists(newMembers, existingMembers) {
    if (newMembersList) {
      newMembersList.innerHTML = newMembers.length
        ? newMembers.map(m => renderMemberListItem(m)).join('')
        : '<li style="color:#888;">No new members in last 30 days.</li>';
    }
    if (existingMembersList) {
      existingMembersList.innerHTML = existingMembers.length
        ? existingMembers.map(m => renderMemberListItem(m)).join('')
        : '<li style="color:#888;">No existing members.</li>';
    }
  }

  function showMembersDetailContent() {
    if (membersDetailLoading) membersDetailLoading.style.display = 'none';
    if (membersDetailContent) membersDetailContent.style.display = 'block';
  }

  function showMembersDetailError(err) {
    if (membersDetailLoading) membersDetailLoading.style.display = 'none';
    if (membersDetailError) {
      membersDetailError.textContent = err.message || 'Failed to load members.';
      membersDetailError.style.display = 'block';
    }
  }
  function renderMemberListItem(member) {
    // Mobile sidebar version: show plan as a badge and add member's email if available
    const img = member.profileImageUrl
      ? `<img src="${member.profileImageUrl}" alt="${member.name || member.memberName || ''}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:10px;">`
      : `<span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:#eee;margin-right:10px;"></span>`;
    const name = member.name || member.memberName || 'Member';
    const plan = member.planSelected || member.plan || '';
    const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '';
    const email = member.email ? `<div style="font-size:0.90em;color:#1976d2;">${member.email}</div>` : '';
    return `<li style="display:flex;align-items:center;margin-bottom:10px;">${img}<div><div style="font-weight:500;">${name} <span style="background:#e3f2fd;color:#1976d2;border-radius:4px;padding:2px 6px;font-size:0.85em;margin-left:6px;">${plan}</span></div>${email}<div style="font-size:0.95em;color:#888;">${joinDate ? 'Joined: ' + joinDate : ''}</div></div></li>`;
  }
});
  



// === Dynamic New Members Section ===
document.addEventListener('DOMContentLoaded', function () {
  const newMembersTableBody = document.getElementById('newMembersTableBody');
  if (!newMembersTableBody) return;

  // Fetch new members from the last 7 days with auth
  const token = localStorage.getItem('gymAdminToken');
  fetch('/api/members/new', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(members => {
      if (!Array.isArray(members) || members.length === 0) {
        newMembersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No new members found.</td></tr>';
        return;
      }
      newMembersTableBody.innerHTML = '';
      members.forEach(member => {
        const tr = document.createElement('tr');
        // Profile image (robust fallback, avoid double /uploads/)
        let profileImg = 'https://via.placeholder.com/48x48.png?text=User';
        if (member.profileImage && member.profileImage !== '') {
          if (member.profileImage.startsWith('http')) {
            profileImg = member.profileImage;
          } else if (member.profileImage.startsWith('/uploads/')) {
            profileImg = member.profileImage;
          } else {
            profileImg = '/uploads/profile-pics/' + member.profileImage;
          }
        }
        // Format join date
        const joinDate = member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A';
        // Name and plan (robust)
        const name = member.memberName || member.name || member.fullName || member.firstName || 'N/A';
        const plan = member.planSelected || member.plan || (member.membershipPlan?.name) || 'N/A';
        tr.innerHTML = `
          <td><img src="${profileImg}" alt="Profile" style="width:40px;height:40px;border-radius:50%;object-fit:cover;"></td>
          <td>${name}</td>
          <td>${joinDate}</td>
          <td>${plan}</td>
          <td><button class="action-btn edit" data-member-id="${member._id}"><i class="fas fa-edit"></i> Edit</button></td>
        `;
        newMembersTableBody.appendChild(tr);
      });
      // Add click event for edit buttons
      newMembersTableBody.querySelectorAll('.action-btn.edit').forEach(btn => {
        btn.addEventListener('click', function() {
          const memberId = this.getAttribute('data-member-id');
          // TODO: Open edit modal for memberId
          alert('Edit member: ' + memberId);
        });
      });
    })
    .catch(err => {
      newMembersTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">Failed to load members.</td></tr>';
    });
});

// === Enhanced Recent Activity System ===
document.addEventListener('DOMContentLoaded', function() {
  let activityLogData = [];
  
  // DOM Elements
  const recentActivityList = document.getElementById('recentActivityList');
  const refreshActivitiesBtn = document.getElementById('refreshActivitiesBtn');
  const viewAllActivitiesBtn = document.getElementById('viewAllActivitiesBtn');
  const dashboardEquipmentGallery = document.getElementById('dashboardEquipmentGallery');
  
  // Activity Types Configuration
  const activityTypes = {
    'member_added': {
      icon: 'fa-user-plus',
      iconBg: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      badge: 'success',
      category: 'Member Management'
    },
    'payment_received': {
      icon: 'fa-credit-card',
      iconBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      badge: 'info',
      category: 'Financial'
    },
    'equipment_added': {
      icon: 'fa-dumbbell',
      iconBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      badge: 'warning',
      category: 'Equipment'
    },
    'notification_sent': {
      icon: 'fa-bell',
      iconBg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      badge: 'info',
      category: 'Communication'
    },
    'trainer_added': {
      icon: 'fa-user-tie',
      iconBg: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      badge: 'info',
      category: 'Staff Management'
    },
    'membership_renewed': {
      icon: 'fa-redo-alt',
      iconBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      badge: 'success',
      category: 'Member Management'
    },
    'attendance_marked': {
      icon: 'fa-calendar-check',
      iconBg: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
      badge: 'info',
      category: 'Attendance'
    },
    'equipment_maintenance': {
      icon: 'fa-tools',
      iconBg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      badge: 'error',
      category: 'Maintenance'
    },
    'plan_updated': {
      icon: 'fa-crown',
      iconBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      badge: 'warning',
      category: 'Settings'
    },
    'biometric_enrolled': {
      icon: 'fa-fingerprint',
      iconBg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      badge: 'info',
      category: 'Security'
    }
  };

  // Format relative time
  function getRelativeTime(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return activityTime.toLocaleDateString();
  }

  // Generate sample activity data (in production, this would come from the server)
  function generateSampleActivities() {
    const sampleActivities = [
      {
        id: 1,
        type: 'member_added',
        title: 'New member registered - Rajesh Kumar',
        description: 'Premium membership plan selected',
        timestamp: new Date(Date.now() - 10 * 60000), // 10 minutes ago
        userId: 'admin',
        metadata: { memberId: 'MEM001', plan: 'Premium' }
      },
      {
        id: 2,
        type: 'payment_received',
        title: 'Payment received from Priya Sharma',
        description: '₹2,500 for monthly membership',
        timestamp: new Date(Date.now() - 45 * 60000), // 45 minutes ago
        userId: 'admin',
        metadata: { amount: 2500, memberId: 'MEM002' }
      },
      {
        id: 3,
        type: 'equipment_added',
        title: 'New equipment added - Treadmill Pro X300',
        description: 'Cardio section updated with latest equipment',
        timestamp: new Date(Date.now() - 2 * 3600000), // 2 hours ago
        userId: 'admin',
        metadata: { equipmentId: 'EQ001', category: 'Cardio' }
      },
      {
        id: 4,
        type: 'biometric_enrolled',
        title: 'Biometric enrollment completed - Amit Singh',
        description: 'Fingerprint successfully registered',
        timestamp: new Date(Date.now() - 3 * 3600000), // 3 hours ago
        userId: 'admin',
        metadata: { memberId: 'MEM003', type: 'fingerprint' }
      },
      {
        id: 5,
        type: 'trainer_added',
        title: 'New trainer onboarded - Fitness Expert Mohan',
        description: 'Specialized in weight training and nutrition',
        timestamp: new Date(Date.now() - 5 * 3600000), // 5 hours ago
        userId: 'admin',
        metadata: { trainerId: 'TR001', specialization: 'Weight Training' }
      },
      {
        id: 6,
        type: 'notification_sent',
        title: 'Holiday schedule notification sent',
        description: 'Sent to 150+ members regarding Diwali timings',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        userId: 'admin',
        metadata: { recipients: 152, type: 'holiday_schedule' }
      }
    ];
    
    return sampleActivities;
  }

  // Render activity item
  function renderActivityItem(activity) {
    const activityConfig = activityTypes[activity.type] || activityTypes['notification_sent'];
    const relativeTime = getRelativeTime(activity.timestamp);
    
    return `
      <li class="activity-item" data-activity-id="${activity.id}">
        <div class="activity-icon" style="background: ${activityConfig.iconBg};">
          <i class="fas ${activityConfig.icon}"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-time">
            <i class="fas fa-clock"></i>
            ${relativeTime}
          </div>
        </div>
        <div class="activity-badge ${activityConfig.badge}">
          ${activityConfig.category}
        </div>
      </li>
    `;
  }

  // Load recent activities
  function loadRecentActivities() {
    // Show loading state
    recentActivityList.innerHTML = `
      <li class="activity-item">
        <div class="activity-icon">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <div class="activity-content">
          <div class="activity-title">Loading recent activities...</div>
          <div class="activity-time">
            <i class="fas fa-clock"></i>
            Please wait
          </div>
        </div>
      </li>
    `;

    // Simulate API call
    setTimeout(() => {
      try {
        activityLogData = generateSampleActivities();
        
        if (activityLogData.length === 0) {
          recentActivityList.innerHTML = `
            <li class="activity-item">
              <div class="activity-icon" style="background: linear-gradient(135deg, #64748b 0%, #475569 100%);">
                <i class="fas fa-info-circle"></i>
              </div>
              <div class="activity-content">
                <div class="activity-title">No recent activities</div>
                <div class="activity-time">
                  <i class="fas fa-clock"></i>
                  Start managing your gym to see activities here
                </div>
              </div>
            </li>
          `;
          return;
        }

        const activitiesHTML = activityLogData
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, 8) // Show latest 8 activities
          .map(renderActivityItem)
          .join('');
        
        recentActivityList.innerHTML = activitiesHTML;
        
        // Add click listeners for activity items
        recentActivityList.querySelectorAll('.activity-item').forEach(item => {
          item.addEventListener('click', function() {
            const activityId = this.dataset.activityId;
            const activity = activityLogData.find(a => a.id == activityId);
            if (activity) {
              showActivityDetails(activity);
            }
          });
        });
        
      } catch (error) {
        console.error('Error loading activities:', error);
        recentActivityList.innerHTML = `
          <li class="activity-item">
            <div class="activity-icon" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="activity-content">
              <div class="activity-title">Failed to load activities</div>
              <div class="activity-time">
                <i class="fas fa-sync-alt"></i>
                Click refresh to try again
              </div>
            </div>
          </li>
        `;
      }
    }, 1000);
  }

  // Show activity details modal
  function showActivityDetails(activity) {
    const activityConfig = activityTypes[activity.type] || activityTypes['notification_sent'];
    
    // Create a simple modal for activity details
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.style.zIndex = '10005';
    
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header-style">
          <h3 class="modal-title-style">
            <i class="fas ${activityConfig.icon}" style="color: var(--primary);"></i>
            Activity Details
          </h3>
          <button class="modal-close" id="closeActivityModal">&times;</button>
        </div>
        <div style="padding: 20px;">
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
            <div class="activity-icon" style="background: ${activityConfig.iconBg}; width: 60px; height: 60px; font-size: 1.5rem;">
              <i class="fas ${activityConfig.icon}"></i>
            </div>
            <div>
              <h4 style="margin: 0; color: #1e293b;">${activity.title}</h4>
              <p style="margin: 4px 0 0; color: #64748b;">${activity.description}</p>
            </div>
          </div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.9rem;">
              <div><strong>Time:</strong> ${getRelativeTime(activity.timestamp)}</div>
              <div><strong>Category:</strong> ${activityConfig.category}</div>
              <div><strong>Performed by:</strong> ${activity.userId}</div>
              <div><strong>Activity ID:</strong> #${activity.id}</div>
            </div>
          </div>
          ${activity.metadata ? `
            <div style="margin-top: 16px;">
              <h5 style="color: #1e293b; margin-bottom: 8px;">Additional Details:</h5>
              <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 0.85rem;">
                ${Object.entries(activity.metadata).map(([key, value]) => 
                  `<div><strong>${key.replace(/_/g, ' ')}:</strong> ${value}</div>`
                ).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('#closeActivityModal');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // Load real equipment for dashboard gallery
  async function loadDashboardEquipment() {
    const dashboardEquipmentGallery = document.getElementById('dashboardEquipmentGallery');
    if (!dashboardEquipmentGallery) return;

    try {
      // Get authentication data
      const token = localStorage.getItem('gymAdminToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
      
      if (!token) {
        console.warn('No auth token found for equipment loading');
        showDashboardEquipmentError('Authentication required');
        return;
      }

      // Fetch real equipment data from backend
      const response = await fetch('/api/gyms/profile/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const gymData = await response.json();
      const equipmentData = gymData.equipment || [];

      if (equipmentData.length === 0) {
        showDashboardEquipmentEmpty();
        return;
      }

      // Render equipment gallery with real data
      renderDashboardEquipmentGallery(equipmentData);

    } catch (error) {
      console.error('Error loading dashboard equipment:', error);
      showDashboardEquipmentError('Failed to load equipment');
    }
  }

  // Render dashboard equipment gallery
  function renderDashboardEquipmentGallery(equipmentData) {
    const dashboardEquipmentGallery = document.getElementById('dashboardEquipmentGallery');
    if (!dashboardEquipmentGallery) return;

    // Show up to 6 items in dashboard gallery
    const displayItems = equipmentData.slice(0, 6);
    
    const equipmentHTML = displayItems.map(equipment => {
      const equipmentId = equipment.id || equipment._id;
      const hasPhoto = equipment.photos && equipment.photos.length > 0;
      const imageUrl = hasPhoto ? equipment.photos[0] : null;
      const categoryIcon = getCategoryIcon(equipment.category);
      const statusClass = (equipment.status || 'available').toLowerCase();

      return `
        <div class="equipment-item ${hasPhoto ? '' : 'no-photo'}" data-equipment-id="${equipmentId}">
          ${hasPhoto ? `
            <img src="${imageUrl}" alt="${equipment.name}" loading="lazy"
                 onerror="this.style.display='none'; this.parentNode.classList.add('image-error');">
            <div class="equipment-overlay">
              <div class="equipment-name">${equipment.name}</div>
              <div class="equipment-category">
                <i class="${categoryIcon}"></i>
                ${equipment.category || 'Equipment'}
              </div>
            </div>
          ` : `
            <div class="equipment-no-photo">
              <div class="no-photo-icon">
                <i class="${categoryIcon}"></i>
              </div>
              <div class="equipment-overlay">
                <div class="equipment-name">${equipment.name}</div>
                <div class="equipment-category">
                  <i class="${categoryIcon}"></i>
                  ${equipment.category || 'Equipment'}
                </div>
              </div>
              <button class="add-photo-btn" onclick="addEquipmentPhoto('${equipmentId}')" title="Add Photo">
                <i class="fas fa-camera-plus"></i>
                <span>Add Photo</span>
              </button>
            </div>
          `}
          <div class="equipment-status-indicator ${statusClass}" title="${equipment.status || 'Available'}">
            <i class="fas fa-circle"></i>
          </div>
        </div>
      `;
    }).join('');
    
    dashboardEquipmentGallery.innerHTML = equipmentHTML;
    
    // Add click listeners for equipment items
    dashboardEquipmentGallery.querySelectorAll('.equipment-item').forEach(item => {
      item.addEventListener('click', function(e) {
        // Don't trigger if clicking add photo button
        if (e.target.closest('.add-photo-btn')) return;
        
        const equipmentId = this.dataset.equipmentId;
        viewEquipmentFromDashboard(equipmentId);
      });
    });
  }

  // Show empty state for equipment
  function showDashboardEquipmentEmpty() {
    const dashboardEquipmentGallery = document.getElementById('dashboardEquipmentGallery');
    if (!dashboardEquipmentGallery) return;

    dashboardEquipmentGallery.innerHTML = `
      <div class="equipment-empty-state">
        <div class="empty-icon">
          <i class="fas fa-dumbbell"></i>
        </div>
        <div class="empty-content">
          <h3>No Equipment Added</h3>
          <p>Start by adding your first piece of equipment</p>
          <button class="add-equipment-btn" onclick="openAddEquipmentFromDashboard()">
            <i class="fas fa-plus"></i>
            Add Equipment
          </button>
        </div>
      </div>
    `;
  }

  // Show error state for equipment
  function showDashboardEquipmentError(message) {
    const dashboardEquipmentGallery = document.getElementById('dashboardEquipmentGallery');
    if (!dashboardEquipmentGallery) return;

    dashboardEquipmentGallery.innerHTML = `
      <div class="equipment-error-state">
        <div class="error-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="error-content">
          <h3>Error Loading Equipment</h3>
          <p>${message}</p>
          <button class="retry-btn" onclick="loadDashboardEquipment()">
            <i class="fas fa-redo"></i>
            Try Again
          </button>
        </div>
      </div>
    `;
  }

  // Get category icon for equipment
  function getCategoryIcon(category) {
    const categoryIcons = {
      'cardio': 'fas fa-heartbeat',
      'strength': 'fas fa-dumbbell', 
      'functional': 'fas fa-running',
      'flexibility': 'fas fa-child',
      'conditioning': 'fas fa-fire',
      'other': 'fas fa-cog'
    };
    
    return categoryIcons[category?.toLowerCase()] || 'fas fa-dumbbell';
  }

  // View equipment from dashboard
  function viewEquipmentFromDashboard(equipmentId) {
    // Show equipment details modal directly instead of navigating to equipment tab
    if (window.equipmentManager && typeof window.equipmentManager.viewEquipment === 'function') {
      window.equipmentManager.viewEquipment(equipmentId);
    } else {
      // Fallback: wait for equipment manager to load
      setTimeout(() => {
        if (window.equipmentManager && typeof window.equipmentManager.viewEquipment === 'function') {
          window.equipmentManager.viewEquipment(equipmentId);
        }
      }, 500);
    }
  }

  // Open add equipment modal from dashboard
  function openAddEquipmentFromDashboard() {
    // Open add equipment modal directly instead of navigating to equipment tab
    if (window.equipmentManager && typeof window.equipmentManager.openAddEquipmentModal === 'function') {
      window.equipmentManager.openAddEquipmentModal();
    } else {
      // Fallback: wait for equipment manager to load
      setTimeout(() => {
        if (window.equipmentManager && typeof window.equipmentManager.openAddEquipmentModal === 'function') {
          window.equipmentManager.openAddEquipmentModal();
        }
      }, 500);
    }
  }

  // Add photo to equipment from dashboard
  function addEquipmentPhoto(equipmentId) {
    // Open edit equipment modal directly to add photo
    if (window.equipmentManager && typeof window.equipmentManager.editEquipment === 'function') {
      window.equipmentManager.editEquipment(equipmentId);
    } else {
      // Fallback: wait for equipment manager to load
      setTimeout(() => {
        if (window.equipmentManager && typeof window.equipmentManager.editEquipment === 'function') {
          window.equipmentManager.editEquipment(equipmentId);
        }
      }, 500);
    }
  }

  // Make functions globally available
  window.viewEquipmentFromDashboard = viewEquipmentFromDashboard;
  window.openAddEquipmentFromDashboard = openAddEquipmentFromDashboard;
  window.addEquipmentPhoto = addEquipmentPhoto;
  window.loadDashboardEquipment = loadDashboardEquipment;

  // Event Listeners
  if (refreshActivitiesBtn) {
    refreshActivitiesBtn.addEventListener('click', loadRecentActivities);
  }

  if (viewAllActivitiesBtn) {
    viewAllActivitiesBtn.addEventListener('click', function() {
      // TODO: Navigate to full activity log or open expanded modal
      alert('View all activities functionality - to be implemented');
    });
  }

  // Button functionality for enhanced cards
  const viewAllEquipmentBtn = document.getElementById('viewAllEquipmentBtn');
  const addEquipmentQuickBtn = document.getElementById('addEquipmentQuickBtn');
  const refreshChartBtn = document.getElementById('refreshChartBtn');
  const sendNotificationQuickBtn = document.getElementById('sendNotificationQuickBtn');

  if (viewAllEquipmentBtn) {
    viewAllEquipmentBtn.addEventListener('click', function() {
      // Navigate to equipment tab by triggering the sidebar link
      const equipmentMenuItem = document.querySelector('.menu-link[href="#"]:nth-child(6)') || 
                               document.querySelector('.sidebar .menu-item:nth-child(6) .menu-link');
      
      if (equipmentMenuItem) {
        equipmentMenuItem.click();
      } else {
        // Fallback: manual tab switching
        const equipmentTab = document.getElementById('equipmentTab');
        const dashboardContent = document.querySelector('.content');
        
        if (equipmentTab && dashboardContent) {
          dashboardContent.style.display = 'none';
          equipmentTab.style.display = 'block';
          
          // Update sidebar active state
          const sidebarLinks = document.querySelectorAll('.menu-link');
          sidebarLinks.forEach(link => link.classList.remove('active'));
          const equipmentLink = document.querySelector('.menu-link[data-tab="equipmentTab"]') || 
                                document.querySelector('a[href="#equipment"]');
          if (equipmentLink) equipmentLink.classList.add('active');
        }
      }
    });
  }

  if (addEquipmentQuickBtn) {
    addEquipmentQuickBtn.addEventListener('click', function() {
      openAddEquipmentFromDashboard();
    });
  }

  if (refreshChartBtn) {
    refreshChartBtn.addEventListener('click', function() {
      // Refresh attendance chart
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
      setTimeout(() => {
        this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        // TODO: Integrate with actual chart refresh functionality
      }, 1500);
    });
  }

  if (sendNotificationQuickBtn) {
    sendNotificationQuickBtn.addEventListener('click', function() {
      // Open notification modal
      const notificationBtn = document.getElementById('openNotificationModalBtn');
      if (notificationBtn) {
        notificationBtn.click();
      }
    });
  }

  // Initialize dashboard enhancements
  loadRecentActivities();
  loadDashboardEquipment();
  
  // Auto-refresh activities every 2 minutes
  setInterval(loadRecentActivities, 120000);
});

