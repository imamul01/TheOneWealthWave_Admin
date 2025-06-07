/* eslint-disable no-console, no-undef, no-unreachable, no-unused-vars */
/* jshint esversion: 8 */

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBYfhqC1x89DbqWgEDS3kpPKrWj6e1777E",
  authDomain: "theonewealthwave-bad63.firebaseapp.com",
  projectId: "theonewealthwave-bad63",
  storageBucket: "theonewealthwave-bad63.firebasestorage.app",
  messagingSenderId: "47205860966",
  appId: "1:47205860966:web:83cc467bcfa640984f4fa7",
  measurementId: "G-D9DHDV9H71"
};

// Initialize Firebase
if (typeof firebase === 'undefined') {
  console.error('Firebase SDK not loaded.');
} else {
  try {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();
    console.log('Firebase initialized');

    document.addEventListener('DOMContentLoaded', () => {
      // Utilities
      const $ = (s, r = document) => r.querySelector(s);
      const $all = (s, r = document) => [...r.querySelectorAll(s)];
      const createElement = (tag, attrs = {}, ...children) => {
        const el = document.createElement(tag);
        for (const k in attrs) {
          if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
          else if (k === 'class') el.className = attrs[k];
          else if (k === 'html') el.innerHTML = attrs[k];
          else el.setAttribute(k, attrs[k]);
        }
        children.flat().forEach(c => {
          if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(String(c)));
          else if (c instanceof Node) el.appendChild(c);
          else console.warn('Invalid child:', c);
        });
        return el;
      };
      const formatCurrency = v => '$' + Number(v).toFixed(2);
      const formatDate = d => new Date(d).toLocaleDateString();
      const debugMode = localStorage.getItem('debug') === 'true';
      const showMessage = (msg, type, isLogin = false) => {
        const box = isLogin ? $('#loginMessage') : $('#messageBox');
        if (box) {
          box.textContent = msg;
          box.className = `messageBox ${type}`;
          box.style.display = 'block';
          setTimeout(() => box.style.display = 'none', 3000);
        }
        showToast(msg, type);
        if (debugMode) console.log(`[${type.toUpperCase()}] ${msg} (Line: ${new Error().stack.split('\n')[2].match(/:(\d+)/)[1]})`);
      };
      const showToast = (msg, type) => {
        const toast = createElement('div', { class: `toast ${type}`, html: msg });
        const container = $('#toastContainer');
        if (container) {
          container.appendChild(toast);
          setTimeout(() => toast.style.display = 'block', 10);
          setTimeout(() => toast.remove(), 3000);
        }
      };

      // State
      const state = {
        activeTab: 'dashboard',
        userList: [],
        levelIncomeList: [],
        rewardList: [],
        notifications: [],
        supportTickets: [],
        depositMethods: { usdtBep20: '', usdtTrc20: '', upiId: '', bankDetails: '' },
        currentUser: null,
        dashboardStats: { totalMembers: 0, activeUsers: 0, todaysIncome: 0, pendingWithdrawals: 0, pendingDeposits: 0 },
        roiSettings: { planType: 'daily', percentage: 1.2, duration: 30, status: 'active' },
        withdrawals: [],
        deposits: [],
        reports: { selfIncome: [], levelIncome: [], reward: [], roi: [] },
        content: { terms: '', about: '', faq: '', news: '' },
        settings: { role: 'admin', enable2fa: false, passwordPolicy: 'Min 8 chars, 1 uppercase, 1 number, 1 special char' },
        activityLogs: []
      };

      // Elements
      const loginSection = $('#loginSection');
      const appSection = $('#app');
      const loginForm = $('#loginForm');
      const loginSpinner = $('#loginSpinner');
      const logoutBtn = $('#logoutBtn');
      const sidebarFooter = $('#sidebarFooter');
      const themeToggle = $('#themeToggle');

      // Authentication
      auth.onAuthStateChanged(user => {
        console.log('Auth state:', user ? `Logged in: ${user.email}` : 'No user');
        state.currentUser = user;
        if (loginSpinner?.style) loginSpinner.style.display = 'none';
        if (user) {
          if (loginSection?.style) loginSection.style.display = 'none';
          if (appSection) appSection.hidden = false;
          if (sidebarFooter) sidebarFooter.textContent = `Admin: ${user.email} | © 2025`;
          switchTab(user.email === 'support@theonewealthwave.com' ? 'support' : 'dashboard');
          loadDashboardStats();
          loadDepositMethods();
          loadNotifications();
          loadROISettings();
          loadWithdrawals();
          loadDeposits();
          loadRewardRank();
          loadContent();
          loadSettings();
          loadActivityLogs();
          loadSupportTickets();
        } else {
          if (loginSection?.style) loginSection.style.display = 'flex';
          if (appSection) appSection.hidden = true;
          if (sidebarFooter) sidebarFooter.textContent = '© 2025 Your Company';
        }
      });

      loginForm?.addEventListener('submit', async e => {
        e.preventDefault();
        if (loginSpinner?.style) loginSpinner.style.display = 'block';
        const email = $('#loginEmail')?.value;
        const password = $('#loginPassword')?.value;
        if (!email || !password) {
          showMessage('Please enter email and password', 'error', true);
          if (loginSpinner?.style) loginSpinner.style.display = 'none';
          return;
        }
        console.log('Login attempt:', email);
        try {
          await auth.signInWithEmailAndPassword(email, password);
          showMessage('Login successful!', 'success', true);
        } catch (error) {
          console.error('Login error:', error.message);
          showMessage(`Login failed: ${error.message}`, 'error', true);
          if (loginSpinner?.style) loginSpinner.style.display = 'none';
        }
      });

      logoutBtn?.addEventListener('click', () => {
        auth.signOut().then(() => {
          showMessage('Logged out!', 'success');
        }).catch(e => showMessage(`Logout failed: ${e.message}`, 'error'));
      });

      // Theme Toggle
      themeToggle?.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const img = themeToggle?.querySelector('img');
        if (img) {
          img.src = document.body.classList.contains('light-theme')
            ? 'https://img.icons8.com/ios-filled/50/000000/moon-symbol.png'
            : 'https://img.icons8.com/ios-filled/50/ffffff/sun.png';
        }
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
      });
      if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-theme');
        const img = themeToggle?.querySelector('img');
        if (img) img.src = 'https://img.icons8.com/ios-filled/50/000000/moon-symbol.png';
      }

      // Tab Navigation
      const switchTab = tabName => {
        state.activeTab = tabName;
        $all('nav.sidebar .menu li button').forEach(btn => {
          const isActive = btn.dataset.tab === tabName;
          btn.classList.toggle('active', isActive);
          btn.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
        $all('main.content .tab-content').forEach(s => {
          const isActive = s.id === tabName;
          s.hidden = !isActive;
          s.setAttribute('aria-hidden', !isActive);
          if (isActive) s.focus();
        });
        const renderers = {
          dashboard: renderDashboard,
          users: renderUsers,
          levelIncome: renderLevelIncome,
          rewardRank: renderRewardRank,
          support: renderSupportTickets,
          deposit: renderDeposit,
          roi: renderROIHistory,
          withdrawal: renderWithdrawal,
          userDeposit: renderUserDeposit,
          reports: renderReports,
          contentMgmt: renderContent,
          communication: renderCommunication,
          settings: renderSettings
        };
        try {
          renderers[tabName]?.();
        } catch (e) {
          console.error(`Error rendering tab ${tabName}:`, e);
          showMessage('Failed to load tab content', 'error');
        }
      };

      $all('nav.sidebar .menu li button:not(#logoutBtn)').forEach(btn =>
        btn.addEventListener('click', () => switchTab(btn.dataset.tab))
      );

      $('nav.sidebar .menu')?.addEventListener('keydown', e => {
        const btns = $all('nav.sidebar .menu li button');
        const idx = btns.findIndex(b => b.classList.contains('active'));
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          btns[(idx + 1) % btns.length].focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          btns[(idx - 1 + btns.length) % btns.length].focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          btns[idx].click();
        }
      });

      // Notifications
      const loadNotifications = async () => {
        try {
          const snap = await db.collection('notifications').orderBy('createdAt', 'desc').limit(5).get();
          state.notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderDashboard();
        } catch (e) {
          console.error('Error loading notifications:', e);
          showMessage('Failed to load notifications', 'error');
        }
      };

      const clearNotifications = async () => {
        try {
          const batch = db.batch();
          const snap = await db.collection('notifications').get();
          snap.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          state.notifications = [];
          renderDashboard();
          showMessage('Notifications cleared!', 'success');
        } catch (e) {
          console.error('Error clearing notifications:', e);
          showMessage('Failed to clear notifications', 'error');
        }
      };

      // Dashboard
      const loadDashboardStats = async () => {
        try {
          const usersSnap = await db.collection('users').get();
          const withdrawalsSnap = await db.collection('withdrawals').where('status', '==', 'pending').get();
          const depositsSnap = await db.collection('deposits').where('status', '==', 'pending').get();
          const today = new Date().toISOString().slice(0, 10);
          const incomeSnap = await db.collection('income').where('date', '==', today).get();

          state.dashboardStats = {
            totalMembers: usersSnap.size,
            activeUsers: usersSnap.docs.filter(d => d.data().status === 'Active').length,
            todaysIncome: incomeSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0),
            pendingWithdrawals: withdrawalsSnap.size,
            pendingDeposits: depositsSnap.size
          };

          const totalMembers = $('#totalMembers');
          const activeUsers = $('#activeUsers');
          const todaysIncome = $('#todaysIncome');
          const pendingWithdrawals = $('#pendingWithdrawals');
          const pendingDeposits = $('#pendingDeposits');
          if (totalMembers) totalMembers.textContent = state.dashboardStats.totalMembers;
          if (activeUsers) activeUsers.textContent = state.dashboardStats.activeUsers;
          if (todaysIncome) todaysIncome.textContent = formatCurrency(state.dashboardStats.todaysIncome);
          if (pendingWithdrawals) pendingWithdrawals.textContent = state.dashboardStats.pendingWithdrawals;
          if (pendingDeposits) pendingDeposits.textContent = state.dashboardStats.pendingDeposits;
        } catch (e) {
          console.error('Error loading stats:', e);
          showMessage('Failed to load dashboard stats', 'error');
        }
      };

      const renderDashboard = () => {
  try {
    const tbody = $('#businessStatsTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      for (let i = 1; i <= 25; i++) {
        tbody.appendChild(createElement('tr', {},
          createElement('td', {}, `Level ${i}`),
          createElement('td', {}, formatCurrency(1000 * i * 1.2)),
          createElement('td', {}, `${50 + i}`)
        ));
      }
    }

    const notes = $('#notificationsList');
    if (notes) {
      notes.innerHTML = '';
      state.notifications.forEach(note => {
        if (typeof note.message === 'string' && note.message.trim()) {
          notes.appendChild(createElement('li', {}, `${note.user}: ${note.message} (${formatDate(note.createdAt?.toDate())})`));
        }
      });
    }

    // Render Charts (Destroy previous instances first)
    if (window.Chart) {
      const incomeTrendsCtx = $('#incomeTrendsChart')?.getContext('2d');
      if (incomeTrendsCtx) {
        if (window.incomeTrendsChartInstance) {
          window.incomeTrendsChartInstance.destroy();
        }
        window.incomeTrendsChartInstance = new Chart(incomeTrendsCtx, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Income Trends',
              data: [1000, 1500, 1200, 1800, 2000, 2500],
              borderColor: '#4a59a9',
              fill: false
            }]
          },
          options: { responsive: true }
        });
      }

      const userGrowthCtx = $('#userGrowthChart')?.getContext('2d');
      if (userGrowthCtx) {
        if (window.userGrowthChartInstance) {
          window.userGrowthChartInstance.destroy();
        }
        window.userGrowthChartInstance = new Chart(userGrowthCtx, {
          type: 'bar',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'User Growth',
              data: [50, 100, 150, 200, 250, 300],
              backgroundColor: '#4a59a9'
            }]
          },
          options: { responsive: true }
        });
      }
    }
  } catch (e) {
    console.error('Error rendering dashboard:', e);
    showMessage('Failed to render dashboard', 'error');
  }
};

      $('#exportReport')?.addEventListener('click', () => {
        try {
          const csv = [
            ['Metric', 'Value'],
            ['Total Members', state.dashboardStats.totalMembers],
            ['Active Users', state.dashboardStats.activeUsers],
            ['Today\'s Income', formatCurrency(state.dashboardStats.todaysIncome)],
            ['Pending Withdrawals', state.dashboardStats.pendingWithdrawals],
            ['Pending Deposits', state.dashboardStats.pendingDeposits]
          ].map(row => row.join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = createElement('a', { href: url, download: 'dashboard_stats.csv' });
a.click();
          URL.revokeObjectURL(url);
        } catch (e) {
          showMessage('Error exporting report', 'error');
        }
      });

      $('#clearNotifications')?.addEventListener('click', clearNotifications);

      $('#refreshData')?.addEventListener('click', () => {
        loadDashboardStats();
        loadNotifications();
        showMessage('Data refreshed', 'success');
      });

      // Users
      const loadUsers = async () => {
        try {
          const snap = await db.collection('users').get();
          state.userList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderUsers();
        } catch (e) {
          console.error('Error loading users:', e);
          showMessage('Failed to load users', 'error');
        }
      };

      const renderUsers = () => {
        try {
          const tbody = $('#usersTableBody');
          const filter = $('#userSearchInput')?.value.toLowerCase() || '';
          if (tbody) {
            tbody.innerHTML = '';
            state.userList.filter(u => u.name?.toLowerCase().includes(filter) || u.country?.toLowerCase().includes(filter))
              .forEach(u => {
                tbody.appendChild(createElement('tr', {},
                  createElement('td', {}, u.name || 'N/A'),
                  createElement('td', {}, u.country || 'N/A'),
                  createElement('td', {}, u.status || 'N/A'),
                  createElement('td', {}, u.joinDate ? formatDate(u.joinDate) : 'N/A'),
                  createElement('td', {}, u.kyc || 'N/A'),
                  createElement('td', {},
                    createElement('button', { class: 'small primary', onclick: () => alert(`Edit ${u.name}`) }, 'Edit'),
                    createElement('button', { class: 'small danger', onclick: () => {
                      if (confirm(`Delete ${u.name}?`)) {
                        db.collection('users').doc(u.id).delete().then(() => {
                          state.userList = state.userList.filter(user => user.id !== u.id);
                          renderUsers();
                          showMessage('User deleted', 'success');
                        });
                      }
                    } }, 'Delete')
                  )
                ));
              });
          }
        } catch (e) {
          console.error('Error rendering users:', e);
          showMessage('Failed to render user list', 'error');
        }
      };

      $('#userSearchInput')?.addEventListener('input', renderUsers);
      $('#addUserBtn')?.addEventListener('click', () => showMessage('Add user feature coming soon!', 'success'));

      // Level Income
      const levelIncomeTableBody = $('#levelIncomeTable tbody');
      const initLevelIncome = async () => {
        try {
          const docSnap = await db.collection('settings').doc('levelIncomeList').get();
          if (docSnap.exists) {
            state.levelIncomeList = docSnap.data().levels || [];
          }
          if (!state.levelIncomeList.length) {
            for (let i = 1; i <= 25; i++) {
              state.levelIncomeList.push({
                level: i,
                incomePercent: 0,
                selfDepositCondition: 0,
                directTeamBusinessCondition: 0,
                directJoiningCondition: 'None',
                blocked: false
              });
            }
            await db.collection('settings').doc('levelIncomeList').set({ levels: state.levelIncomeList });
          }
          renderLevelIncome();
        } catch (e) {
          console.error('Error initializing levelIncomeList:', e);
          showMessage('Failed to load level income settings', 'error');
        }
      };

      const renderLevelIncome = () => {
        try {
          if (levelIncomeTableBody) {
            levelIncomeTableBody.innerHTML = '';
            state.levelIncomeList.forEach(item => {
              const tr = createElement('tr', { class: item.blocked ? 'blocked' : '' },
                createEditableCell(item.level, null, true),
                createEditableNumberCell(item.incomePercent, v => {
                  item.incomePercent = Math.max(0, Math.min(v, 100));
                  renderSummary();
                }, 0, 100, 0.01),
                createEditableNumberCell(item.selfDepositCondition, v => {
                  item.selfDepositCondition = Math.max(0, v);
                }, 0),
                createEditableNumberCell(item.directTeamBusinessCondition, v => {
                  item.directTeamBusinessCondition = Math.max(0, v);
                }, 0),
                createEditableCell(item.directJoiningCondition, v => item.directJoiningCondition = v || 'None'),
                createElement('td', {},
                  createElement('button', {
                    class: item.blocked ? 'danger small' : 'secondary small',
                    onclick: () => {
                      item.blocked = !item.blocked;
                      renderLevelIncome();
                    }
                  }, item.blocked ? 'Blocked' : 'Active')
                ),
                createElement('td', {},
                  createElement('button', {
                    class: 'danger small',
                    onclick: () => {
                      if (state.levelIncomeList.length > 1 && confirm(`Remove Level ${item.level}?`)) {
                        state.levelIncomeList = state.levelIncomeList.filter(l => l.level !== item.level);
                        state.levelIncomeList.forEach((l, i) => l.level = i + 1);
                        renderLevelIncome();
                      }
                    }
                  }, 'Remove')
                )
              );
              levelIncomeTableBody.appendChild(tr);
            });
          }
          renderSummary();
        } catch (e) {
          console.error('Error rendering level income:', e);
          showMessage('Failed to render level income', 'error');
        }
      };

      const saveLevelIncome = async () => {
        try {
          await db.collection('settings').doc('levelIncomeList').set({ levels: state.levelIncomeList });
          showMessage('Level Income settings saved!', 'success');
        } catch (e) {
          console.error('Error saving levelIncomeList:', e);
          showMessage('Failed to save level income settings', 'error');
        }
      };

      const createEditableCell = (value, onChange, readOnly = false) => {
        const td = createElement('td', {});
        if (readOnly) {
          td.textContent = value;
        } else {
          const input = createElement('input', { type: 'text', value });
          input.addEventListener('change', e => onChange(e.target.value));
          td.appendChild(input);
        }
        return td;
      };

      const createEditableNumberCell = (value, onChange, min = null, max = null, step = null) => {
        const td = createElement('td', {});
        const input = createElement('input', { type: 'number', value });
        if (min !== null) input.min = min;
        if (max !== null) input.max = max;
        if (step !== null) input.step = step;
        input.addEventListener('change', e => {
          let v = parseFloat(e.target.value) || 0;
          if (min !== null) v = Math.max(v, min);
          if (max !== null) v = Math.min(v, max);
          e.target.value = v;
          onChange(v);
        });
        td.appendChild(input);
        return td;
      };

      const renderSummary = () => {
        try {
          const totalLevels = $('#liTotalLevels');
          const totalRewardPercent = $('#liTotalRewardPercent');
          if (totalLevels) totalLevels.textContent = state.levelIncomeList.length;
          if (totalRewardPercent) {
            const totalPercent = state.levelIncomeList.reduce((sum, v) => sum + Number(v.incomePercent || 0), 0);
            totalRewardPercent.textContent = totalPercent.toFixed(2) + '%';
          }
        } catch (e) {
          console.error('Error rendering summary:', e);
        }
      };

      $('#btnAddLevelIncome')?.addEventListener('click', () => {
        if (state.levelIncomeList.length >= 25) {
          showMessage('Max 25 levels reached', 'error');
          return;
        }
        state.levelIncomeList.push({
          level: state.levelIncomeList.length + 1,
          incomePercent: 0,
          selfDepositCondition: 0,
          directTeamBusinessCondition: 0,
          directJoiningCondition: 'None',
          blocked: false
        });
        renderLevelIncome();
      });

      $('#btnRemoveLevelIncome')?.addEventListener('click', () => {
        if (state.levelIncomeList.length > 1 && confirm('Remove last level?')) {
          state.levelIncomeList.pop();
          renderLevelIncome();
        }
      });

      $('#btnResetLevelIncome')?.addEventListener('click', () => {
        if (confirm('Reset level income data?')) {
          state.levelIncomeList = [];
          initLevelIncome();
        }
      });

      $('#btnSaveLevelIncome')?.addEventListener('click', saveLevelIncome);

      // Reward & Rank
      const loadRewardRank = async () => {
        try {
          const docSnap = await db.collection('settings').doc('rewardList').get();
          if (docSnap.exists) {
            state.rewardList = docSnap.data().ranks || [];
          }
          if (!state.rewardList.length) {
            state.rewardList = Array.from({ length: 7 }, (_, i) => ({
              rank: i + 1,
              totalBusiness: (i + 1) * 1000,
              powerLeg: (i + 1) * 500,
              otherLegs: (i + 1) * 500,
              rewardIncome: (i + 1) * 100
            }));
            await db.collection('settings').doc('rewardList').set({ ranks: state.rewardList });
          }
          renderRewardRank();
        } catch (e) {
          console.error('Error loading reward settings:', e);
          showMessage('Failed to load reward settings', 'error');
        }
      };

      const renderRewardRank = () => {
        try {
          const tbody = $('#rewardTable tbody');
          if (tbody) {
            tbody.innerHTML = '';
            state.rewardList.forEach(item => {
              tbody.appendChild(createElement('tr', {},
                createElement('td', {}, item.rank),
                createEditableNumberCell(item.totalBusiness, v => {
                  item.totalBusiness = Math.max(v, 0);
                  if (item.totalBusiness < (item.powerLeg + item.otherLegs)) {
                    showMessage('Total Business must be >= Power Leg + Other Legs', 'error');
                    item.totalBusiness = item.powerLeg + item.otherLegs;
                  }
                }, 0),
                createEditableNumberCell(item.powerLeg, v => item.powerLeg = Math.max(v, 0), 0),
                createEditableNumberCell(item.otherLegs, v => item.otherLegs = Math.max(v, 0), 0),
                createEditableNumberCell(item.rewardIncome, v => {
                  item.rewardIncome = Math.max(v, 0);
                  if (item.totalBusiness < (item.powerLeg + item.otherLegs)) {
                    showMessage('Cannot set reward: Total Business must be >= Power Leg + Other Legs', 'error');
                    item.rewardIncome = 0;
                  }
                }, 0),
                createElement('td', {},
                  createElement('button', { class: 'small danger', onclick: () => {
                    if (state.rewardList.length > 1 && confirm(`Remove Rank ${item.rank}?`)) {
                      state.rewardList = state.rewardList.filter(l => l.rank !== item.rank);
                      state.rewardList.forEach((l, i) => l.rank = i + 1);
                      renderRewardRank();
                    }
                  } }, 'Delete')
                )
              ));
            });
          }
        } catch (e) {
          console.error('Error rendering rewards:', e);
          showMessage('Failed to render rewards', 'error');
        }
      };

      const saveRewardRank = async () => {
        try {
          await db.collection('settings').doc('rewardList').set({ ranks: state.rewardList });
          showMessage('Reward settings saved!', 'success');
        } catch (e) {
          console.error('Error saving reward settings:', e);
          showMessage('Failed to save reward settings', 'error');
        }
      };

      const assignRewardsToUsers = async () => {
        try {
          const usersSnap = await db.collection('users').get();
          for (const userDoc of usersSnap.docs) {
            const user = userDoc.data();
            const userBusiness = user.totalBusiness || 0;
            const userPowerLeg = user.powerLeg || 0;
            const userOtherLegs = user.otherLegs || 0;

            const eligibleRank = state.rewardList.find(rank =>
              userBusiness >= rank.totalBusiness &&
              userPowerLeg >= rank.powerLeg &&
              userOtherLegs >= rank.otherLegs
            );

            if (eligibleRank) {
              await db.collection('users').doc(userDoc.id).update({
                reward: eligibleRank.rewardIncome,
                rank: eligibleRank.rank,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              await db.collection('notifications').add({
                message: `Congratulations! You achieved Rank ${eligibleRank.rank} with a reward of ${formatCurrency(eligibleRank.rewardIncome)}.`,
                user: user.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              });
            }
          }
          showMessage('Rewards assigned to eligible users!', 'success');
        } catch (e) {
          console.error('Error assigning rewards:', e);
          showMessage('Failed to assign rewards', 'error');
        }
      };

      $('#rankSettingsForm')?.addEventListener('submit', e => {
        e.preventDefault();
        db.collection('settings').doc('rankRules').set({ rules: $('#rankRulesText')?.value })
          .then(() => showMessage('Rank settings saved!', 'success'))
          .catch(e => showMessage(`Error: ${e.message}`, 'error'));
      });

      $('#btnSaveRewardRank')?.addEventListener('click', saveRewardRank);
      $('#btnAssignRewards')?.addEventListener('click', assignRewardsToUsers);

      // ROI Management
      const loadROISettings = async () => {
        try {
          const docSnap = await db.collection('settings').doc('roiSettings').get();
          if (docSnap.exists) {
            const data = docSnap.data();
            const roiPlanType = $('#roiPlanType');
            const roiPercentage = $('#roiPercentage');
            const roiDuration = $('#roiDuration');
            const roiStatus = $('#roiStatus');
            if (roiPlanType) roiPlanType.value = data.planType || 'daily';
            if (roiPercentage) roiPercentage.value = data.percentage || 1.2;
            if (roiDuration) roiDuration.value = data.duration || 30;
            if (roiStatus) roiStatus.value = data.status || 'active';
            state.roiSettings = data;
          } else {
            state.roiSettings = { planType: 'daily', percentage: 1.2, duration: 30, status: 'active' };
            await db.collection('settings').doc('roiSettings').set(state.roiSettings);
          }
        } catch (e) {
          console.error('Error loading ROI settings:', e);
          showMessage('Failed to load ROI settings', 'error');
        }
      };

      const saveROISettings = async () => {
        try {
          const settings = {
            planType: $('#roiPlanType')?.value || 'daily',
            percentage: parseFloat($('#roiPercentage')?.value) || 1.2,
            duration: parseInt($('#roiDuration')?.value) || 30,
            status: $('#roiStatus')?.value || 'active'
          };
          await db.collection('settings').doc('roiSettings').set(settings);
          state.roiSettings = settings;
          showMessage('ROI settings saved!', 'success');
          renderROIHistory();
        } catch (e) {
          console.error('Error saving ROI settings:', e);
          showMessage('Failed to save ROI settings', 'error');
        }
      };

      const renderROIHistory = async () => {
        try {
          const tbody = $('#roiHistoryBody');
          if (tbody) {
            tbody.innerHTML = '';
            const snapshot = await db.collection('roiHistory').orderBy('date', 'desc').limit(10).get();
            const historyItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            historyItems.forEach(item => {
              tbody.appendChild(createElement('tr', {},
                createElement('td', {}, formatDate(item.date)),
                createElement('td', {}, item.user),
                createElement('td', {}, formatCurrency(item.amount)),
                createElement('td', {}, item.status),
                createElement('td', {},
                  createElement('button', { class: 'small primary', onclick: () => alert(`View details for ${item.user}`) }, 'View')
                )
              ));
            });
          }
        } catch (e) {
          console.error('Error rendering ROI history:', e);
          showMessage('Failed to render ROI history', 'error');
        }
      };

      $('#roiSettingsForm')?.addEventListener('submit', async e => {
        e.preventDefault();
        await saveROISettings();
      });

      // Deposit Management
      const loadDepositMethods = async () => {
        try {
          const doc = await db.collection('settings').doc('depositMethods').get();
          if (doc.exists) {
            state.depositMethods = doc.data();
            const usdtBep20 = $('#usdtBep20');
            const usdtTrc20 = $('#usdtTrc20');
            const upiId = $('#upiId');
            const bankDetails = $('#bankDetails');
            if (usdtBep20) usdtBep20.value = state.depositMethods.usdtBep20 || '';
            if (usdtTrc20) usdtTrc20.value = state.depositMethods.usdtTrc20 || '';
            if (upiId) upiId.value = state.depositMethods.upiId || '';
            if (bankDetails) bankDetails.value = state.depositMethods.bankDetails || '';
          }
        } catch (e) {
          console.error('Error loading deposit methods:', e);
          showMessage(`Failed to load deposits: ${e.message}`, 'error');
        }
      };

      $('#depositMethodsForm')?.addEventListener('submit', e => {
        e.preventDefault();
        const methods = {
          usdtBep20: $('#usdtBep20')?.value || '',
          usdtTrc20: $('#usdtTrc20')?.value || '',
          upiId: $('#upiId')?.value || '',
          bankDetails: $('#bankDetails')?.value || ''
        };
        db.collection('settings').doc('depositMethods').set(methods)
          .then(() => {
            state.depositMethods = methods;
            showMessage('Deposit methods saved!', 'success');
            renderUserDeposit();
          })
          .catch(e => showMessage(`Error saving deposit methods: ${e.message}`, 'error'));
      });

      const loadDeposits = async () => {
        try {
          const snapshot = await db.collection('deposits').orderBy('date', 'desc').limit(50).get();
          state.deposits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderDeposit();
        } catch (e) {
          console.error('Error loading deposits:', e);
          showMessage('Failed to load deposit requests', 'error');
        }
      };

      const renderDeposit = () => {
        try {
          const tbody = $('#depositRequestsBody');
          const filter = $('#depositSearchInput')?.value.toLowerCase() || '';
          if (tbody) {
            tbody.innerHTML = '';
            let deposits = state.deposits.filter(d =>
              d.user.toLowerCase().includes(filter) || d.status.toLowerCase().includes(filter)
            );

            deposits.forEach(d => {
              const approveBtn = createElement('button', {
                class: 'small primary',
                onclick: () => approveDeposit(d.id, d.user, d.amount)
              }, 'Approve');
              const rejectBtn = createElement('button', {
                class: 'small danger',
                onclick: () => rejectDeposit(d.id, d.user)
              }, 'Reject');
              tbody.appendChild(createElement('tr', {},
                createElement('td', {}, d.user),
                createElement('td', {}, formatCurrency(d.amount)),
                createElement('td', {}, formatDate(d.date)),
                createElement('td', {}, d.method),
                createElement('td', {}, d.status),
                createElement('td', {}, d.status === 'Pending' ? [approveBtn, rejectBtn] : [])
              ));
            });
          }
        } catch (e) {
          console.error('Error rendering deposits:', e);
          showMessage('Failed to render deposits', 'error');
        }
      };

      const approveDeposit = async (id, user, amount) => {
        try {
          if (!confirm(`Approve ${formatCurrency(amount)} deposit for ${user}?`)) return;
          await db.collection('deposits').doc(id).update({
            status: 'Approved',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          await db.collection('notifications').add({
            message: `Your deposit of ${formatCurrency(amount)} has been approved.`,
            user,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          showMessage(`Deposit for ${user} approved!`, 'success');
          loadDeposits();
          loadDashboardStats();
        } catch (e) {
          console.error('Error approving deposit:', e);
          showMessage('Failed to approve deposit', 'error');
        }
      };

      const rejectDeposit = async (id, user) => {
        try {
          if (!confirm(`Reject deposit for ${user}?`)) return;
          await db.collection('deposits').doc(id).update({
            status: 'Rejected',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          await db.collection('notifications').add({
            message: `Your deposit request has been rejected.`,
            user,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          showMessage(`Deposit for ${user} rejected!`, 'success');
          loadDeposits();
          loadDashboardStats();
        } catch (e) {
          console.error('Error rejecting deposit:', e);
          showMessage('Failed to reject deposit', 'error');
        }
      };

      $('#depositSearchInput')?.addEventListener('input', renderDeposit);
      $('#refreshDeposits')?.addEventListener('click', () => {
        loadDeposits();
        showMessage('Deposit requests refreshed', 'success');
      });

      // User Deposit
      const renderUserDeposit = async () => {
        try {
          const container = $('#userDepositContainer');
          if (container) {
            container.innerHTML = '';
            await loadDepositMethods();
            const methods = state.depositMethods;
            const methodOptions = [
              methods.usdtBep20 && { value: 'USDT BEP20', details: methods.usdtBep20 },
              methods.usdtTrc20 && { value: 'USDT TRC20', details: methods.usdtTrc20 },
              methods.upiId && { value: 'UPI', details: methods.upiId },
              methods.bankDetails && { value: 'Bank', details: methods.bankDetails }
            ].filter(Boolean);

            if (!methodOptions.length) {
              container.appendChild(createElement('p', {}, 'No deposit methods available.'));
              return;
            }

            const form = createElement('form', { id: 'userDepositForm' },
              createElement('h3', {}, 'Make a Deposit'),
              createElement('label', { for: 'depositMethod' }, 'Select Method:'),
              createElement('select', { id: 'depositMethod' },
                ...methodOptions.map(m => createElement('option', { value: m.value }, m.value))
              ),
              createElement('div', { id: 'methodDetails', style: 'margin: 10px 0;' }),
              createElement('label', { for: 'depositAmount' }, 'Amount ($):'),
              createElement('input', { type: 'number', id: 'depositAmount', min: '1', step: '0.01', required: true }),
              createElement('button', { type: 'submit', class: 'primary' }, 'Submit Deposit')
            );

            container.appendChild(form);

            const methodSelect = $('#depositMethod');
            const detailsDiv = $('#methodDetails');
            const updateDetails = () => {
              const selected = methodOptions.find(m => m.value === methodSelect.value);
              detailsDiv.innerHTML = selected ? `<strong>Details:</strong> ${selected.details}` : '';
            };
            methodSelect.addEventListener('change', updateDetails);
            updateDetails();

            form.addEventListener('submit', e => {
              e.preventDefault();
              submitDepositRequest();
            });
          }
        } catch (e) {
          console.error('Error rendering user deposit:', e);
          showMessage('Failed to load deposit page', 'error');
        }
      };

      const submitDepositRequest = async () => {
        try {
          const method = $('#depositMethod')?.value;
          const amount = parseFloat($('#depositAmount')?.value);
          if (!method || !amount || amount <= 0) {
            showMessage('Please select a method and enter a valid amount', 'error');
            return;
          }
          if (!state.currentUser) {
            showMessage('Please log in to submit a deposit', 'error');
            return;
          }
          const deposit = {
            user: state.currentUser.email,
            amount,
            method,
            status: 'Pending',
            date: new Date().toISOString().slice(0, 10),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          await db.collection('deposits').add(deposit);
          showMessage('Deposit request submitted!', 'success');
          $('#depositAmount').value = '';
          await db.collection('notifications').add({
            message: `New deposit request of ${formatCurrency(amount)} submitted.`,
            user: 'support@theonewealthwave.com',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          loadDeposits();
          loadDashboardStats();
        } catch (e) {
          console.error('Error submitting deposit:', e);
          showMessage('Failed to submit deposit request', 'error');
        }
      };

      // Reports
      const loadReports = async () => {
        try {
          const selfIncomeSnap = await db.collection('income').where('type', '==', 'self').orderBy('date', 'desc').limit(50).get();
          const levelIncomeSnap = await db.collection('income').where('type', '==', 'level').orderBy('date', 'desc').limit(50).get();
          const rewardSnap = await db.collection('rewards').orderBy('date', 'desc').limit(50).get();
          const roiSnap = await db.collection('roiHistory').orderBy('date', 'desc').limit(50).get();

          state.reports.selfIncome = selfIncomeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          state.reports.levelIncome = levelIncomeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          state.reports.reward = rewardSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          state.reports.roi = roiSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          renderReports();
        } catch (e) {
          console.error('Error loading reports:', e);
          showMessage('Failed to load reports', 'error');
        }
      };

      const renderReports = () => {
        try {
          const filter = $('#reportSearchInput')?.value.toLowerCase() || '';
          const dateRange = $('#reportDateRange')?.value || 'all';
          let startDate, endDate;
          if (dateRange === 'custom') {
            startDate = $('#reportStartDate')?.value ? new Date($('#reportStartDate').value) : null;
            endDate = $('#reportEndDate')?.value ? new Date($('#reportEndDate').value) : null;
          } else if (dateRange === 'last7days') {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 7);
          } else if (dateRange === 'last30days') {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
          }

          // Self Income
          const selfIncomeTbody = $('#selfIncomeTableBody');
          if (selfIncomeTbody) {
            selfIncomeTbody.innerHTML = '';
            let filtered = state.reports.selfIncome.filter(r =>
              (r.user?.toLowerCase().includes(filter) || formatDate(r.date).includes(filter)) &&
              (!startDate || new Date(r.date) >= startDate) &&
              (!endDate || new Date(r.date) <= endDate)
            );
            filtered.forEach(r => {
              selfIncomeTbody.appendChild(createElement('tr', {},
                createElement('td', {}, r.user),
                createElement('td', {}, formatCurrency(r.amount)),
                createElement('td', {}, formatDate(r.date))
              ));
            });
            if (window.Chart) {
              const ctx = $('#selfIncomeChart')?.getContext('2d');
              if (ctx) {
                new Chart(ctx, {
                  type: 'line',
                  data: {
                    labels: filtered.map(r => formatDate(r.date)),
                    datasets: [{
                      label: 'Self Income',
                      data: filtered.map(r => r.amount),
                      borderColor: '#4a59a9',
                      fill: false
                    }]
                  },
                  options: { responsive: true }
                });
              }
            }
          }

          // Level Income
          const levelIncomeTbody = $('#levelIncomeTableBody');
          if (levelIncomeTbody) {
            levelIncomeTbody.innerHTML = '';
            let filtered = state.reports.levelIncome.filter(r =>
              (r.level?.toString().includes(filter) || formatDate(r.date).includes(filter)) &&
              (!startDate || new Date(r.date) >= startDate) &&
              (!endDate || new Date(r.date) <= endDate)
            );
            filtered.forEach(r => {
              levelIncomeTbody.appendChild(createElement('tr', {},
                createElement('td', {}, r.level),
                createElement('td', {}, formatCurrency(r.amount)),
                createElement('td', {}, formatDate(r.date))
              ));
            });
            if (window.Chart) {
              const ctx = $('#levelIncomeChart')?.getContext('2d');
              if (ctx) {
                new Chart(ctx, {
                  type: 'bar',
                  data: {
                    labels: filtered.map(r => `Level ${r.level}`),
                    datasets: [{
                      label: 'Level Income',
                      data: filtered.map(r => r.amount),
                      backgroundColor: '#4a59a9'
                    }]
                  },
                  options: { responsive: true }
                });
              }
            }
          }

          // Reward
          const rewardTbody = $('#rewardTableBody');
          if (rewardTbody) {
            rewardTbody.innerHTML = '';
            let filtered = state.reports.reward.filter(r =>
              (r.user?.toLowerCase().includes(filter) || r.rank?.toString().includes(filter)) &&
              (!startDate || new Date(r.date) >= startDate) &&
              (!endDate || new Date(r.date) <= endDate)
            );
            filtered.forEach(r => {
              rewardTbody.appendChild(createElement('tr', {},
                createElement('td', {}, r.user),
                createElement('td', {}, r.rank),
                createElement('td', {}, formatCurrency(r.amount)),
                createElement('td', {}, formatDate(r.date))
              ));
            });
            if (window.Chart) {
              const ctx = $('#rewardChart')?.getContext('2d');
              if (ctx) {
                new Chart(ctx, {
                  type: 'bar',
                  data: {
                    labels: filtered.map(r => `Rank ${r.rank}`),
                    datasets: [{
                      label: 'Reward Amount',
                      data: filtered.map(r => r.amount),
                      backgroundColor: '#4a59a9'
                    }]
                  },
                  options: { responsive: true }
                });
              }
            }
          }

          // ROI
          const roiTbody = $('#roiTableBody');
          if (roiTbody) {
            roiTbody.innerHTML = '';
            let filtered = state.reports.roi.filter(r =>
              (r.user?.toLowerCase().includes(filter) || r.status?.toLowerCase().includes(filter)) &&
              (!startDate || new Date(r.date) >= startDate) &&
              (!endDate || new Date(r.date) <= endDate)
            );
            filtered.forEach(r => {
              roiTbody.appendChild(createElement('tr', {},
                createElement('td', {}, r.user),
                createElement('td', {}, formatCurrency(r.amount)),
                createElement('td', {}, formatDate(r.date)),
                createElement('td', {}, r.status)
              ));
            });
            if (window.Chart) {
              const ctx = $('#roiChart')?.getContext('2d');
              if (ctx) {
                new Chart(ctx, {
                  type: 'line',
                  data: {
                    labels: filtered.map(r => formatDate(r.date)),
                    datasets: [{
                      label: 'ROI Amount',
                      data: filtered.map(r => r.amount),
                      borderColor: '#4a59a9',
                      fill: false
                    }]
                  },
                  options: { responsive: true }
                });
              }
            }
          }
        } catch (e) {
          console.error('Error rendering reports:', e);
          showMessage('Failed to render reports', 'error');
        }
      };

      $('#reportSearchInput')?.addEventListener('input', renderReports);
      $('#reportDateRange')?.addEventListener('change', e => {
        const customRange = $('#customDateRange');
        if (customRange) customRange.style.display = e.target.value === 'custom' ? 'block' : 'none';
        renderReports();
      });
      $('#reportStartDate')?.addEventListener('change', renderReports);
      $('#reportEndDate')?.addEventListener('change', renderReports);
      $('#refreshReports')?.addEventListener('click', () => {
        loadReports();
        showMessage('Reports refreshed', 'success');
      });

      // Reports Tab Navigation
      $all('.tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
          $all('.tabs .tab').forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');
          $all('.reportContent').forEach(c => {
            c.hidden = c.id !== tab.id.replace('tab', 'report');
            c.setAttribute('aria-hidden', c.id !== tab.id.replace('tab', 'report'));
          });
          renderReports();
        });
      });

      // Content Management
      const loadContent = async () => {
        try {
          const doc = await db.collection('settings').doc('content').get();
          if (doc.exists) {
            state.content = doc.data();
            const termsContent = $('#termsContent');
            const aboutContent = $('#aboutContent');
            const faqContent = $('#faqContent');
            const newsContent = $('#newsContent');
            if (termsContent) termsContent.value = state.content.terms || '';
            if (aboutContent) aboutContent.value = state.content.about || '';
            if (faqContent) faqContent.value = state.content.faq || '';
            if (newsContent) newsContent.value = state.content.news || '';
          }
        } catch (e) {
          console.error('Error loading content:', e);
          showMessage('Failed to load content', 'error');
        }
      };

      const renderContent = () => {
        try {
          const form = $('#contentForm');
          if (form) {
            form.addEventListener('submit', async e => {
              e.preventDefault();
              const content = {
                terms: $('#termsContent')?.value || '',
                about: $('#aboutContent')?.value || '',
                faq: $('#faqContent')?.value || '',
                news: $('#newsContent')?.value || ''
              };
              try {
                await db.collection('settings').doc('content').set(content);
                state.content = content;
                showMessage('Content saved!', 'success');
              } catch (e) {
                console.error('Error saving content:', e);
                showMessage('Failed to save content', 'error');
              }
            });
          }

          const trainingUpload = $('#trainingUpload');
          const uploadProgress = $('#uploadProgress');
          const filePreview = $('#filePreview');
          if (trainingUpload) {
            trainingUpload.addEventListener('change', async () => {
              const files = trainingUpload.files;
              if (!files.length) return;

              uploadProgress.style.display = 'block';
              filePreview.innerHTML = '';

              try {
                for (const file of files) {
                  const ref = storage.ref().child(`training/${file.name}`);
                  const uploadTask = ref.put(file);

                  uploadTask.on('state_changed', 
                    snapshot => {
                      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                      uploadProgress.style.width = `${progress}%`;
                    },
                    error => {
                      console.error('Upload error:', error);
                      showMessage('Failed to upload file', 'error');
                      uploadProgress.style.display = 'none';
                    },
                    async () => {
                      const url = await uploadTask.snapshot.ref.getDownloadURL();
                      const fileData = {
                        name: file.name,
                        url,
                        type: file.type,
                        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                      };
                      await db.collection('trainingFiles').add(fileData);

                      const previewItem = file.type.startsWith('video')
                        ? createElement('video', { src: url, controls: true })
                        : createElement('a', { href: url, target: '_blank' }, file.name);
                      filePreview.appendChild(previewItem);
                      uploadProgress.style.display = 'none';
                      showMessage(`File ${file.name} uploaded!`, 'success');
                    }
                  );
                }
              } catch (e) {
                console.error('Error uploading files:', e);
                showMessage('Failed to upload files', 'error');
                uploadProgress.style.display = 'none';
              }
            });
          }
        } catch (e) {
          console.error('Error rendering content:', e);
          showMessage('Failed to render content', 'error');
        }
      };

      // Communication
      const loadCommunication = async () => {
        try {
          const usersSnap = await db.collection('users').get();
          const messageTo = $('#messageTo');
          if (messageTo) {
            messageTo.innerHTML = '<option value="">Select User</option>';
            usersSnap.forEach(doc => {
              const user = doc.data();
              messageTo.appendChild(createElement('option', { value: user.email }, user.name || user.email));
            });
          }

          const settingsDoc = await db.collection('settings').doc('notificationSettings').get();
          if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            $('#emailNotify').checked = settings.emailNotify || false;
            $('#smsNotify').checked = settings.smsNotify || false;
            $('#telegramBotNotify').checked = settings.telegramBotNotify || false;
            $('#notificationFrequency').value = settings.frequency || 'realtime';
          }
        } catch (e) {
          console.error('Error loading communication:', e);
          showMessage('Failed to load communication settings', 'error');
        }
      };

      const renderCommunication = () => {
        try {
          loadCommunication();
          const messageForm = $('#messageForm');
          if (messageForm) {
            messageForm.addEventListener('submit', async e => {
              e.preventDefault();
              const to = $('#messageTo')?.value;
              const type = $('#messageType')?.value;
              const text = $('#messageText')?.value;
              if (!to || !type || !text) {
                showMessage('Please fill all fields', 'error');
                return;
              }
              try {
                await db.collection('messages').add({
                  to,
                  type,
                  text,
                  sentBy: state.currentUser.email,
                  createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await db.collection('notifications').add({
                  message: `New ${type} message from admin: ${text.substring(0, 50)}...`,
                  user: to,
                  createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                showMessage('Message sent!', 'success');
                $('#messageText').value = '';
              } catch (e) {
                console.error('Error sending message:', e);
                showMessage('Failed to send message', 'error');
              }
            });
          }

          const notificationSettingsForm = $('#notificationSettingsForm');
          if (notificationSettingsForm) {
            notificationSettingsForm.addEventListener('submit', async e => {
              e.preventDefault();
              const settings = {
                emailNotify: $('#emailNotify').checked,
                smsNotify: $('#smsNotify').checked,
                telegramBotNotify: $('#telegramBotNotify').checked,
                frequency: $('#notificationFrequency').value
              };
              try {
                await db.collection('settings').doc('notificationSettings').set(settings);
                showMessage('Notification settings saved!', 'success');
              } catch (e) {
                console.error('Error saving notification settings:', e);
                showMessage('Failed to save notification settings', 'error');
              }
            });
          }
        } catch (e) {
          console.error('Error rendering communication:', e);
          showMessage('Failed to render communication', 'error');
        }
      };

      // Settings
      const loadSettings = async () => {
        try {
          const doc = await db.collection('settings').doc('securitySettings').get();
          if (doc.exists) {
            state.settings = doc.data();
            $('#roleSelect').value = state.settings.role || 'admin';
            $('#enable2fa').checked = state.settings.enable2fa || false;
            $('#passwordPolicy').value = state.settings.passwordPolicy || 'Min 8 chars, 1 uppercase, 1 number, 1 special char';
            const qrcodeContainer = $('#qrcodeContainer');
            if (state.settings.enable2fa && qrcodeContainer) {
              qrcodeContainer.style.display = 'block';
              // Placeholder for QR code generation (requires external library like 'qrcode')
              $('#qrcodeImage').src = 'https://via.placeholder.com/150?text=2FA+QR+Code';
            }
          }
        } catch (e) {
          console.error('Error loading settings:', e);
          showMessage('Failed to load settings', 'error');
        }
      };

      const renderSettings = () => {
        try {
          const form = $('#securitySettingsForm');
          if (form) {
            form.addEventListener('submit', async e => {
              e.preventDefault();
              const settings = {
                role: $('#roleSelect').value,
                enable2fa: $('#enable2fa').checked,
                passwordPolicy: $('#passwordPolicy').value
              };
              try {
                await db.collection('settings').doc('securitySettings').set(settings);
                state.settings = settings;
                $('#qrcodeContainer').style.display = settings.enable2fa ? 'block' : 'none';
                showMessage('Settings saved!', 'success');
                if (settings.enable2fa) {
                  // Placeholder for QR code generation
                  $('#qrcodeImage').src = 'https://via.placeholder.com/150?text=2FA+QR+Code';
                }
              } catch (e) {
                console.error('Error saving settings:', e);
                showMessage('Failed to save settings', 'error');
              }
            });
          }

          $('#logSearchInput')?.addEventListener('input', renderActivityLogs);
        } catch (e) {
          console.error('Error rendering settings:', e);
          showMessage('Failed to render settings', 'error');
        }
      };

      const loadActivityLogs = async () => {
        try {
          const snap = await db.collection('activityLogs').orderBy('createdAt', 'desc').limit(50).get();
          state.activityLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderActivityLogs();
        } catch (e) {
          console.error('Error loading activity logs:', e);
          showMessage('Failed to load activity logs', 'error');
        }
      };

      const renderActivityLogs = () => {
        try {
          const tbody = $('#activityLogsBody');
          const filter = $('#logSearchInput')?.value.toLowerCase() || '';
          if (tbody) {
            tbody.innerHTML = '';
            state.activityLogs.filter(log =>
              log.admin?.toLowerCase().includes(filter) || log.action?.toLowerCase().includes(filter)
            ).forEach(log => {
              tbody.appendChild(createElement('tr', {},
                createElement('td', {}, formatDate(log.createdAt?.toDate())),
                createElement('td', {}, log.admin),
                createElement('td', {}, log.action)
              ));
            });
          }
        } catch (e) {
          console.error('Error rendering activity logs:', e);
          showMessage('Failed to render activity logs', 'error');
        }
      };

      // Support Tickets
      const loadSupportTickets = async () => {
        try {
          const snap = await db.collection('supportTickets').orderBy('createdAt', 'desc').limit(50).get();
          state.supportTickets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderSupportTickets();
        } catch (e) {
          console.error('Error loading support tickets:', e);
          showMessage('Failed to load support tickets', 'error');
        }
      };

      const renderSupportTickets = () => {
        try {
          const tbody = $('#supportTicketsBody');
          const search = $('#ticketSearchInput')?.value.toLowerCase() || '';
          const statusFilter = $('#ticketFilterStatus')?.value || '';
          if (tbody) {
            tbody.innerHTML = '';
            let filteredTickets = state.supportTickets.filter(t =>
              (t.name?.toLowerCase().includes(search) || t.subject?.toLowerCase().includes(search)) &&
              (!statusFilter || t.status === statusFilter)
            );
            filteredTickets.forEach(t => {
              tbody.appendChild(createElement('tr', {},
                createElement('td', {}, t.id),
                createElement('td', {}, t.name),
                createElement('td', {}, t.subject),
                createElement('td', {}, t.status),
                createElement('td', {}, t.priority),
                createElement('td', {},
                  createElement('button', { class: 'small primary', onclick: () => replyToTicket(t.id, t.name) }, 'Reply')
                )
              ));
            });
          }
        } catch (e) {
          console.error('Error rendering support tickets:', e);
          showMessage('Failed to render support tickets', 'error');
        }
      };

      const replyToTicket = async (id, user) => {
        const reply = prompt(`Enter reply for ${user}'s ticket:`);
        if (reply) {
          try {
            await db.collection('supportTickets').doc(id).update({
              status: 'Pending',
              replies: firebase.firestore.FieldValue.arrayUnion({
                text: reply,
                admin: state.currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              })
            });
            await db.collection('notifications').add({
              message: `Your support ticket has a new reply: ${reply.substring(0, 50)}...`,
              user,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showMessage(`Reply sent to ${user}`, 'success');
            loadSupportTickets();
          } catch (e) {
            console.error('Error replying to ticket:', e);
            showMessage('Failed to reply to ticket', 'error');
          }
        }
      };

      $('#ticketSearchInput')?.addEventListener('input', renderSupportTickets);
      $('#ticketFilterStatus')?.addEventListener('change', renderSupportTickets);
      $('#refreshTickets')?.addEventListener('click', () => {
        loadSupportTickets();
        showMessage('Support tickets refreshed', 'success');
      });

      // Withdrawal Management
      const loadWithdrawals = async () => {
        try {
          const snapshot = await db.collection('withdrawals').orderBy('date', 'desc').limit(50).get();
          state.withdrawals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          renderWithdrawal();
        } catch (e) {
          console.error('Error loading withdrawals:', e);
          showMessage('Failed to load withdrawal requests', 'error');
        }
      };

      const renderWithdrawal = () => {
        try {
          const tbody = $('#withdrawalRequestsBody');
          const filter = $('#withdrawalSearchInput')?.value.toLowerCase() || '';
          if (tbody) {
            tbody.innerHTML = '';
            let withdrawals = state.withdrawals.filter(w =>
              w.user.toLowerCase().includes(filter) || w.status.toLowerCase().includes(filter)
            );

            withdrawals.forEach(w => {
              const approveBtn = createElement('button', {
                class: 'small primary',
                onclick: () => approveWithdrawal(w.id, w.user, w.amount)
              }, 'Approve');
              const rejectBtn = createElement('button', {
                class: 'small danger',
                onclick: () => rejectWithdrawal(w.id, w.user)
              }, 'Reject');
              tbody.appendChild(createElement('tr', {},
                createElement('td', {}, w.user),
                createElement('td', {}, formatCurrency(w.amount)),
                createElement('td', {}, formatDate(w.date)),
                createElement('td', {}, w.method),
                createElement('td', {}, w.status),
                createElement('td', {}, w.status === 'Pending' ? [approveBtn, rejectBtn] : [])
              ));
            });
          }
        } catch (e) {
          console.error('Error rendering withdrawals:', e);
          showMessage('Failed to render withdrawal requests', 'error');
        }
      };

      const approveWithdrawal = async (id, user, amount) => {
        try {
          if (!confirm(`Approve ${formatCurrency(amount)} withdrawal for ${user}?`)) return;
          await db.collection('withdrawals').doc(id).update({
            status: 'Approved',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          await db.collection('notifications').add({
            message: `Your withdrawal of ${formatCurrency(amount)} has been approved.`,
            user,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          showMessage(`Withdrawal for ${user} approved!`, 'success');
          loadWithdrawals();
          loadDashboardStats();
        } catch (e) {
          console.error('Error approving withdrawal:', e);
          showMessage('Failed to approve withdrawal', 'error');
        }
      };

      const rejectWithdrawal = async (id, user) => {
        try {
          if (!confirm(`Reject withdrawal for ${user}?`)) return;
          await db.collection('withdrawals').doc(id).update({
            status: 'Rejected',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          await db.collection('notifications').add({
            message: `Your withdrawal request has been rejected.`,
            user,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          showMessage(`Withdrawal for ${user} rejected!`, 'success');
          loadWithdrawals();
          loadDashboardStats();
        } catch (e) {
          console.error('Error rejecting withdrawal:', e);
          showMessage('Failed to reject withdrawal', 'error');
        }
      };

      $('#withdrawalSearchInput')?.addEventListener('input', renderWithdrawal);
      $('#refreshWithdrawals')?.addEventListener('click', () => {
        loadWithdrawals();
        showMessage('Withdrawal requests refreshed', 'success');
      });

      // Debug Mode Toggle
      if (debugMode) {
        console.log('Debug mode enabled. Use localStorage.setItem("debug", "false") to disable.');
        const debugToggle = createElement('button', {
          class: 'secondary small',
          style: 'position: fixed; bottom: 10px; left: 10px;',
          onclick: () => {
            localStorage.setItem('debug', debugMode ? 'false' : 'true');
            location.reload();
          }
        }, debugMode ? 'Disable Debug' : 'Enable Debug');
        document.body.appendChild(debugToggle);
      }

      // Initial load
      switchTab('dashboard');
    });
  } catch (e) {
    console.error('Firebase initialization failed:', e);
    showMessage('Error initializing Firebase', 'error');
  }
}