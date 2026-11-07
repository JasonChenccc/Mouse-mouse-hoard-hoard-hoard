// 番茄钟角色。
// 动画素材来自 dsh-pet（https://github.com/PC2005-cloud/dsh-pet），
// 形象「大肥鱼」为社区二创的 DeepSeek 鲸鱼娘，CC BY-NC-SA 4.0：
// 署名 · 非商业 · 相同方式共享。本项目为非商业用途，故可使用并在此署名。
// 素材原为 VP9-alpha 透明视频（640×360），小程序不支持 alpha 视频，
// 这里用 ffmpeg 从原始 webm 重新抽帧转成 GIF（240×135、10fps、96 色），
// 比官方预览图更清晰，体积还小一半。
module.exports = {
  attribution: '动画素材来自 dsh-pet（github.com/PC2005-cloud/dsh-pet），形象「大肥鱼」CC BY-NC-SA 4.0，仅限非商业使用。',
  current: 'dsh',
  pets: [
    {
      id: 'dsh',
      name: '大肥鱼',
      poses: {
        idle: '/assets/pet/gif/daiji.gif',
        focus: '/assets/pet/gif/xie-daima.gif',
        click: '/assets/pet/gif/dianji.gif'
      },
      clickHoldMs: 2400,
      lines: [
        '老实写代码，很枯燥吧？',
        '先专注二十五分钟，剩下的等会儿再说。',
        '别切窗口了，就这一次。',
        '写完这段，我陪你看一眼天梯。',
        '番茄钟响了再摸鱼，不算摸鱼。',
        '困的话，先站起来喝口水。'
      ],
      doneLines: [
        '二十五分钟，收工。',
        '这一段写完了，去伸个懒腰。',
        '休息一下，我盯着屏幕。'
      ]
    }
  ]
};
