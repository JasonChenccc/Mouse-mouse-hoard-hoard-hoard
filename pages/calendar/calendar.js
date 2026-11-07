const PETS = require('../../data/pets.js');
const repo = require('../../utils/repo.js');

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function ymd(y, m, d) {
  return y + '-' + pad(m + 1) + '-' + pad(d);
}

function parseYmd(s) {
  const p = s.split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function daysBetween(a, b) {
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((B - A) / 86400000);
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

// 按权重抽一个动作（保留给以后多动作扩展用）
function pickWeighted(chain) {
  if (!chain || !chain.length) return null;
  let total = 0;
  for (let i = 0; i < chain.length; i++) total += chain[i].w;
  let r = Math.random() * total;
  for (let i = 0; i < chain.length; i++) {
    r -= chain[i].w;
    if (r <= 0) return chain[i].k;
  }
  return chain[chain.length - 1].k;
}

Page({
  data: {
    week: WEEK,
    fontClass: '',
    year: 0,
    month: 0,
    monthLabel: '',
    cells: [],
    selected: '',
    selectedLabel: '',
    dayItems: [],
    upcoming: [],
    undatedCount: 0,
    // 番茄钟
    minutes: 25,
    presets: [25, 45],
    custom: false,
    customMin: 0,
    timeText: '25:00',
    running: false,
    started: false,
    progress: 0,
    bubble: '',
    pet: null,
    petSrc: PETS.pets[0].poses.idle,
    petState: 'idle',
    taskText: '',
    attribution: PETS.attribution,
    petIndex: 0
  },

  onLoad: function () {
    const now = new Date();
    const todayStr = ymd(now.getFullYear(), now.getMonth(), now.getDate());
    const pet = PETS.pets[0];
    this.total = 25 * 60;
    this.remain = this.total;
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth(),
      selected: todayStr,
      pet: pet,
      petSrc: pet.poses.idle,
      bubble: pet.lines[0]
    });
    this.build();
    this.updateTask();
  },

  onShow: function () {
    this.setData({ fontClass: repo.getFont() });
    this.updateTask();
  },

  onHide: function () {
    this.stopTimer();
  },

  onUnload: function () {
    this.stopTimer();
    if (this.clickTimer) clearTimeout(this.clickTimer);
  },

  // 切换宠物状态：idle 待机 / focus 专注中 / click 点击回应
  setPet: function (state) {
    const poses = this.data.pet.poses;
    if (!poses[state]) return;
    if (state === 'click') {
      const self = this;
      // 不清空 src：空值会让 image 渲染成破图，且恢复依赖 setTimeout，一旦被打断就一直空着
      this.setData({ petSrc: poses.click, petState: 'click' });
      if (this.clickTimer) clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(function () {
        self.setPet(self.data.running ? 'focus' : 'idle');
      }, this.data.pet.clickHoldMs);
      return;
    }
    this.setData({ petState: state, petSrc: poses[state] });
  },

  // 图片加载失败时退回待机图，避免出现破图
  onPetError: function () {
    const pet = this.data.pet;
    if (pet && this.data.petSrc !== pet.poses.idle) {
      this.setData({ petSrc: pet.poses.idle, petState: 'idle' });
    }
  },

  // 宠物头顶待办：取最近一个将要到期的条目
  updateTask: function () {
    const now = new Date();
    let best = null;
    repo.offers().forEach(function (o) {
      if (o.state !== 'live' || !o.endDate) return;
      const diff = daysBetween(now, parseYmd(o.endDate));
      if (diff < 0) return;
      if (!best || diff < best.diff) best = { diff: diff, name: o.name, date: o.endDate };
    });
    let text = '';
    if (best) {
      const d = parseYmd(best.date);
      const head = best.diff === 0 ? '今天到期' : best.diff + ' 天后到期';
      text = head + '：' + best.name;
    }
    this.setData({ taskText: text });
  },

  build: function () {
    const y = this.data.year;
    const m = this.data.month;
    const now = new Date();
    const todayStr = ymd(now.getFullYear(), now.getMonth(), now.getDate());

    // 按截止日归集条目
    const map = {};
    repo.offers().forEach(function (o) {
      if (!o.endDate) return;
      if (!map[o.endDate]) map[o.endDate] = [];
      map[o.endDate].push(o);
    });

    const dim = new Date(y, m + 1, 0).getDate();
    const first = (new Date(y, m, 1).getDay() + 6) % 7;
    const selected = this.data.selected;
    const cells = [];

    for (let i = 0; i < 42; i++) {
      const n = i - first + 1;
      if (n < 1 || n > dim) {
        cells.push({ idx: i, n: '', key: '', has: false, today: false, sel: false });
        continue;
      }
      const key = ymd(y, m, n);
      cells.push({
        idx: i,
        n: n,
        key: key,
        has: !!map[key],
        today: key === todayStr,
        sel: key === selected
      });
    }

    // 选中日的条目
    const dayItems = (map[selected] || []).map(function (o) {
      return {
        id: o.id,
        name: o.name,
        provider: o.provider,
        term: o.term,
        dead: o.state === 'ended'
      };
    });

    // 未来 30 天内到期的
    const upcoming = [];
    Object.keys(map).forEach(function (k) {
      const diff = daysBetween(now, parseYmd(k));
      if (diff < 0 || diff > 30) return;
      map[k].forEach(function (o) {
        upcoming.push({
          id: o.id,
          name: o.name,
          date: k,
          left: diff,
          leftText: diff === 0 ? '今天' : diff + ' 天后'
        });
      });
    });
    upcoming.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return 0;
    });

    const undated = repo.offers().filter(function (o) {
      return !o.endDate && o.state === 'live';
    }).length;

    const selDate = parseYmd(selected);
    const selectedLabel = (selDate.getMonth() + 1) + ' 月 ' + selDate.getDate() + ' 日';

    this.setData({
      monthLabel: y + ' 年 ' + (m + 1) + ' 月',
      cells: cells,
      dayItems: dayItems,
      selectedLabel: selectedLabel,
      upcoming: upcoming,
      undatedCount: undated
    });
  },

  onPrev: function () {
    let y = this.data.year;
    let m = this.data.month - 1;
    if (m < 0) { m = 11; y -= 1; }
    this.setData({ year: y, month: m }, this.build);
  },

  onNext: function () {
    let y = this.data.year;
    let m = this.data.month + 1;
    if (m > 11) { m = 0; y += 1; }
    this.setData({ year: y, month: m }, this.build);
  },

  onToday: function () {
    const now = new Date();
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth(),
      selected: ymd(now.getFullYear(), now.getMonth(), now.getDate())
    }, this.build);
  },

  onPickDay: function (e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    this.setData({ selected: key }, this.build);
  },

  onOpen: function (e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + encodeURIComponent(id) });
  },

  /* ---------- 番茄钟 ---------- */

  fmt: function (sec) {
    return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60);
  },

  onPreset: function (e) {
    const min = Number(e.currentTarget.dataset.min);
    this.stopTimer();
    this.total = min * 60;
    this.remain = this.total;
    this.setData({
      minutes: min,
      custom: false,
      timeText: this.fmt(this.remain),
      running: false,
      started: false,
      progress: 0
    });
  },

  onCustom: function () {
    const self = this;
    wx.showModal({
      title: '自定义专注时长',
      editable: true,
      placeholderText: '输入分钟数，1-180',
      content: this.data.customMin ? String(this.data.customMin) : '',
      confirmText: '开始',
      success: function (res) {
        if (!res.confirm) return;
        const n = parseInt(res.content, 10);
        if (!n || n < 1 || n > 180) {
          wx.showToast({ title: '请输入 1-180 之间的分钟数', icon: 'none' });
          return;
        }
        self.stopTimer();
        self.total = n * 60;
        self.remain = self.total;
        self.setData({
          minutes: n,
          custom: true,
          customMin: n,
          timeText: self.fmt(self.total),
          running: false,
          started: false,
          progress: 0
        });
      }
    });
  },

  onStart: function () {
    if (this.data.running) return;
    const self = this;
    this.setData({ running: true, started: true });
    this.setPet('focus');
    this.timer = setInterval(function () {
      self.remain -= 1;
      if (self.remain <= 0) {
        self.remain = 0;
        self.stopTimer();
        self.setData({
          timeText: '00:00',
          progress: 100,
          running: false,
          bubble: self.pickLine(true)
        });
        self.setPet('idle');
        if (typeof wx.vibrateLong === 'function') {
          wx.vibrateLong({ fail: function () {} });
        }
        wx.showToast({ title: '二十五分钟到', icon: 'none' });
        return;
      }
      self.setData({
        timeText: self.fmt(self.remain),
        progress: Math.round((1 - self.remain / self.total) * 100)
      });
    }, 1000);
  },

  onPause: function () {
    this.stopTimer();
    this.setData({ running: false });
    this.setPet('idle');
  },

  onToggle: function () {
    if (this.data.running) {
      this.onPause();
    } else {
      this.onStart();
    }
  },

  onReset: function () {
    this.stopTimer();
    this.remain = this.total;
    this.setData({
      timeText: this.fmt(this.total),
      running: false,
      started: false,
      progress: 0
    });
    this.setPet('idle');
  },

  stopTimer: function () {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  pickLine: function (done) {
    const pet = this.data.pet;
    const pool = done ? pet.doneLines : pet.lines;
    const i = Math.floor(Math.random() * pool.length);
    return pool[i];
  },

  onTapPet: function () {
    this.setData({ bubble: this.pickLine(false) });
    this.setPet('click');
  },

  // 长按菜单，替代 dsh-pet 的右键菜单
  onLongPressPet: function () {
    const self = this;
    wx.showActionSheet({
      itemList: ['专心一点（专注中）', '休息一下（回待机）', '换一句话'],
      success: function (res) {
        if (res.tapIndex === 0) {
          self.setPet('focus');
          wx.showToast({ title: '已切到专注', icon: 'none' });
        } else if (res.tapIndex === 1) {
          self.setPet('idle');
          wx.showToast({ title: '已回待机', icon: 'none' });
        } else {
          self.setData({ bubble: self.pickLine(false) });
        }
      }
    });
  },

  onSwitchPet: function () {
    if (PETS.pets.length <= 1) {
      wx.showToast({ title: '更多角色还在做', icon: 'none' });
      return;
    }
    const next = (this.data.petIndex + 1) % PETS.pets.length;
    this.setData({
      petIndex: next,
      pet: PETS.pets[next],
      bubble: PETS.pets[next].lines[0]
    });
  }
});
