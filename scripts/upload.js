// 上传小程序代码到微信后台的「开发版本」。
// 用法：node scripts/upload.js [版本号] [描述]
// 需要：C:/Users/30309/WorkBuddy/AAA/_cache/private.wx0dd88c155c0eb962.key（微信后台「小程序代码上传」生成的私钥文件）
const path = require('path');
const fs = require('fs');
const ci = require('miniprogram-ci');

const APPID = 'wx0dd88c155c0eb962';
const PROJECT = path.resolve(__dirname, '..');
const KEY = 'C:/Users/30309/WorkBuddy/AAA/_cache/private.wx0dd88c155c0eb962.key';

const version = process.argv[2] || '1.0.0';
const desc = process.argv[3] || '仓鼠囤粮 · 首版';

if (!fs.existsSync(KEY)) {
  console.error('缺少上传密钥：' + KEY);
  console.error('微信后台 → 开发管理 → 开发设置 → 小程序代码上传 → 生成，下载 .key 文件放到该路径');
  process.exit(1);
}

const project = new ci.Project({
  appid: APPID,
  type: 'miniProgram',
  projectPath: PROJECT,
  privateKeyPath: KEY,
  ignores: ['node_modules/**/*', 'scripts/**/*', '_cache/**/*']
});

(async () => {
  try {
    // 先构建 npm，把 @tencent-ai/workbuddy-cloud-sdk 打进 miniprogram_npm
    try {
      await ci.packNpm(project, {});
      console.log('npm 构建完成');
    } catch (e) {
      console.log('npm 构建跳过：' + (e && e.message));
    }

    const result = await ci.upload({
      project: project,
      version: version,
      desc: desc,
      setting: {
        es6: true,
        minify: true,
        autoPrefixWXSS: true
      },
      onProgressUpdate: function (task) {
        if (typeof task === 'string') return;
        if (task && task.message) process.stdout.write('\r' + task.message + '        ');
      }
    });

    console.log('\n上传成功');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('\n上传失败');
    console.error(e && e.message ? e.message : e);
    process.exitCode = 1;
  }
})();
