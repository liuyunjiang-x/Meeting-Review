import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { firebaseProjectConfig, allowedEditorEmails } from './firebase-config.js';

const page = document.body.dataset.page;
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');

function configReady() {
  return firebaseProjectConfig && firebaseProjectConfig.apiKey && !firebaseProjectConfig.apiKey.includes('请替换');
}

if (!configReady()) {
  const notice = document.createElement('div');
  notice.className = 'notice';
  notice.innerHTML = '当前仍是示例配置。请先打开 <code>firebase-config.js</code>，填入你自己的 Firebase 项目信息，然后再发布到 GitHub。';
  document.body.insertBefore(notice, document.body.children[2] || null);
}

const app = initializeApp(firebaseProjectConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;

const canEdit = () => {
  if (!currentUser?.email) return false;
  if (!Array.isArray(allowedEditorEmails) || allowedEditorEmails.length === 0) return true;
  return allowedEditorEmails.includes(currentUser.email);
};

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function nl2br(value = '') {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function setAuthUI(user) {
  currentUser = user || null;
  if (user) {
    loginBtn?.classList.add('hidden');
    logoutBtn?.classList.remove('hidden');
    userInfo.textContent = `${user.displayName || '已登录用户'} · ${user.email || ''}`;
  } else {
    loginBtn?.classList.remove('hidden');
    logoutBtn?.classList.add('hidden');
    userInfo.textContent = '未登录';
  }
}

loginBtn?.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert(`登录失败：${error.message}`);
  }
});

logoutBtn?.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(`退出失败：${error.message}`);
  }
});

onAuthStateChanged(auth, (user) => {
  setAuthUI(user);
  if (page === 'meetings') initMeetingsPage();
  if (page === 'review') initReviewPage();
});

function ensureEditorOrWarn() {
  if (!currentUser) {
    alert('请先登录后再编辑。');
    return false;
  }
  if (!canEdit()) {
    alert('当前账号没有编辑权限，请联系管理员把你的邮箱加入允许名单。');
    return false;
  }
  return true;
}

function formatTime(value) {
  if (!value?.toDate) return '刚刚';
  return value.toDate().toLocaleString('zh-CN');
}

function initMeetingsPage() {
  const form = document.getElementById('meetingForm');
  const list = document.getElementById('meetingList');
  const searchInput = document.getElementById('meetingSearch');
  const resetBtn = document.getElementById('meetingResetBtn');
  const editState = document.getElementById('meetingEditState');

  if (!form || !list || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  const fields = {
    id: document.getElementById('meetingId'),
    date: document.getElementById('meetingDate'),
    title: document.getElementById('meetingTitle'),
    members: document.getElementById('meetingMembers'),
    discussion: document.getElementById('meetingDiscussion'),
    decision: document.getElementById('meetingDecision'),
    nextStep: document.getElementById('meetingNextStep')
  };

  const resetForm = () => {
    form.reset();
    fields.id.value = '';
    editState.textContent = '新增模式';
  };

  resetBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!ensureEditorOrWarn()) return;

    const payload = {
      date: fields.date.value,
      title: fields.title.value.trim(),
      members: fields.members.value.trim(),
      discussion: fields.discussion.value.trim(),
      decision: fields.decision.value.trim(),
      nextStep: fields.nextStep.value.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.email || ''
    };

    try {
      if (fields.id.value) {
        await updateDoc(doc(db, 'meetings', fields.id.value), payload);
      } else {
        await addDoc(collection(db, 'meetings'), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: currentUser.email || ''
        });
      }
      resetForm();
    } catch (error) {
      alert(`保存失败：${error.message}`);
    }
  });

  let allMeetings = [];

  const render = () => {
    const keyword = (searchInput.value || '').trim().toLowerCase();
    const filtered = allMeetings.filter(item =>
      [item.date, item.title, item.members, item.discussion, item.decision, item.nextStep]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );

    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state">暂无组会记录。登录后可新增，或等待其他成员同步内容。</div>';
      return;
    }

    list.innerHTML = filtered.map(item => `
      <article class="item-card">
        <div class="item-top">
          <div>
            <h3 class="item-title">${escapeHtml(item.title || '未命名组会')}</h3>
            <div class="meta">
              <span>日期：${escapeHtml(item.date || '-')}</span>
              ${item.members ? `<span>参会：${escapeHtml(item.members)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="item-body">
          <section><h4>讨论内容</h4><div>${nl2br(item.discussion || '暂无')}</div></section>
          <section><h4>结论与决定</h4><div>${nl2br(item.decision || '暂无')}</div></section>
          <section><h4>下一步任务</h4><div>${nl2br(item.nextStep || '暂无')}</div></section>
        </div>
        <div class="item-footer">
          <small>最后更新：${formatTime(item.updatedAt)} · ${escapeHtml(item.updatedBy || '未知')}</small>
          <div class="item-actions ${canEdit() ? '' : 'hidden'}">
            <button class="btn secondary" data-action="edit" data-id="${item.id}">编辑</button>
            <button class="btn danger" data-action="delete" data-id="${item.id}">删除</button>
          </div>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = allMeetings.find(x => x.id === btn.dataset.id);
        if (!item) return;
        fields.id.value = item.id;
        fields.date.value = item.date || '';
        fields.title.value = item.title || '';
        fields.members.value = item.members || '';
        fields.discussion.value = item.discussion || '';
        fields.decision.value = item.decision || '';
        fields.nextStep.value = item.nextStep || '';
        editState.textContent = '编辑模式';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    list.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!ensureEditorOrWarn()) return;
        if (!confirm('确定删除这条组会记录吗？')) return;
        try {
          await deleteDoc(doc(db, 'meetings', btn.dataset.id));
        } catch (error) {
          alert(`删除失败：${error.message}`);
        }
      });
    });
  };

  searchInput.addEventListener('input', render);

  const q = query(collection(db, 'meetings'), orderBy('date', 'desc'));
  onSnapshot(q, (snapshot) => {
    allMeetings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  }, (error) => {
    list.innerHTML = `<div class="empty-state">数据加载失败：${escapeHtml(error.message)}</div>`;
  });
}

function initReviewPage() {
  const form = document.getElementById('reviewForm');
  const list = document.getElementById('reviewList');
  const searchInput = document.getElementById('reviewSearch');
  const resetBtn = document.getElementById('reviewResetBtn');
  const editState = document.getElementById('reviewEditState');

  if (!form || !list || form.dataset.bound === '1') return;
  form.dataset.bound = '1';

  const fields = {
    id: document.getElementById('reviewId'),
    title: document.getElementById('reviewTitle'),
    owner: document.getElementById('reviewOwner'),
    deadline: document.getElementById('reviewDeadline'),
    priority: document.getElementById('reviewPriority'),
    status: document.getElementById('reviewStatus'),
    meetingDate: document.getElementById('reviewMeetingDate'),
    description: document.getElementById('reviewDescription'),
    progress: document.getElementById('reviewProgress')
  };

  const resetForm = () => {
    form.reset();
    fields.id.value = '';
    fields.priority.value = '中';
    fields.status.value = '进行中';
    editState.textContent = '新增模式';
  };

  resetBtn.addEventListener('click', resetForm);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!ensureEditorOrWarn()) return;

    const payload = {
      title: fields.title.value.trim(),
      owner: fields.owner.value.trim(),
      deadline: fields.deadline.value,
      priority: fields.priority.value,
      status: fields.status.value,
      meetingDate: fields.meetingDate.value,
      description: fields.description.value.trim(),
      progress: fields.progress.value.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.email || ''
    };

    try {
      if (fields.id.value) {
        await updateDoc(doc(db, 'reviews', fields.id.value), payload);
      } else {
        await addDoc(collection(db, 'reviews'), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: currentUser.email || ''
        });
      }
      resetForm();
    } catch (error) {
      alert(`保存失败：${error.message}`);
    }
  });

  let allReviews = [];

  const render = () => {
    const keyword = (searchInput.value || '').trim().toLowerCase();
    const filtered = allReviews.filter(item =>
      [item.title, item.owner, item.deadline, item.priority, item.status, item.description, item.progress, item.meetingDate]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );

    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state">暂无回顾事项。登录后可新增，或等待其他成员同步内容。</div>';
      return;
    }

    list.innerHTML = filtered.map(item => `
      <article class="item-card">
        <div class="item-top">
          <div>
            <h3 class="item-title">${escapeHtml(item.title || '未命名事项')}</h3>
            <div class="meta">
              ${item.owner ? `<span>负责人：${escapeHtml(item.owner)}</span>` : ''}
              ${item.deadline ? `<span>截止：${escapeHtml(item.deadline)}</span>` : ''}
              ${item.status ? `<span>状态：${escapeHtml(item.status)}</span>` : ''}
              ${item.priority ? `<span>优先级：${escapeHtml(item.priority)}</span>` : ''}
              ${item.meetingDate ? `<span>关联组会：${escapeHtml(item.meetingDate)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="item-body">
          <section><h4>任务说明</h4><div>${nl2br(item.description || '暂无')}</div></section>
          <section><h4>当前进展</h4><div>${nl2br(item.progress || '暂无')}</div></section>
        </div>
        <div class="item-footer">
          <small>最后更新：${formatTime(item.updatedAt)} · ${escapeHtml(item.updatedBy || '未知')}</small>
          <div class="item-actions ${canEdit() ? '' : 'hidden'}">
            <button class="btn secondary" data-action="edit" data-id="${item.id}">编辑</button>
            <button class="btn danger" data-action="delete" data-id="${item.id}">删除</button>
          </div>
        </div>
      </article>
    `).join('');

    list.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = allReviews.find(x => x.id === btn.dataset.id);
        if (!item) return;
        fields.id.value = item.id;
        fields.title.value = item.title || '';
        fields.owner.value = item.owner || '';
        fields.deadline.value = item.deadline || '';
        fields.priority.value = item.priority || '中';
        fields.status.value = item.status || '进行中';
        fields.meetingDate.value = item.meetingDate || '';
        fields.description.value = item.description || '';
        fields.progress.value = item.progress || '';
        editState.textContent = '编辑模式';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    list.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!ensureEditorOrWarn()) return;
        if (!confirm('确定删除这条回顾事项吗？')) return;
        try {
          await deleteDoc(doc(db, 'reviews', btn.dataset.id));
        } catch (error) {
          alert(`删除失败：${error.message}`);
        }
      });
    });
  };

  searchInput.addEventListener('input', render);

  const q = query(collection(db, 'reviews'), orderBy('updatedAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    allReviews = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  }, (error) => {
    list.innerHTML = `<div class="empty-state">数据加载失败：${escapeHtml(error.message)}</div>`;
  });
}
