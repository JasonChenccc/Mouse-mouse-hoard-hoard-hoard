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
    this.build();
    this.updateTask();
  },

  onUnload: function () {
    if (this.clickTimer) clearTimeout(this.clickTimer);
  },

  // 切换宠物状态：idle 待机 / click 点击回应
  setPet: function (state) {
    const poses = this.data.pet.poses;
    if (!poses[state]) return;
    if (state === 'click') {
      const self = this;
      // 不清空 src：空值会让 image 渲染成破图
      this.setData({ petSrc: poses.click, petState: 'click' });
      if (this.clickTimer) clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(function () {
        self.setPet('idle');
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

  // 宠物头顶提示：取最近一个将要到期的条目
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

    const dayItems = (map[selected] || []).map(function (o) {
      return {
        id: o.id,
        name: o.name,
        provider: o.provider,
        term: o.term,
        dead: o.state === 'ended'
      };
    });

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

  pickLine: function () {
    const pool = this.data.pet.lines;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  onTapPet: function () {
    this.setData({ bubble: this.pickLine() });
    this.setPet('click');
  },

  // 长按菜单，替代 dsh-pet 的右键菜单
  onLongPressPet: function () {
    const self = this;
    wx.showActionSheet({
      itemList: ['换一句话', '换一个角色'],
      success: function (res) {
        if (res.tapIndex === 0) {
          self.setData({ bubble: self.pickLine() });
        } else {
          self.onSwitchPet();
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
