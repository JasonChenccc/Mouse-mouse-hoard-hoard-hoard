// 云服务配置：来自 workbuddy_cloud_service 激活时返回的 publicConfig。
// endpoint 与 publishableKey 本来就要出现在前端（publishableKey 只标识应用、本身不带权限，
// 服务端还会校验 Origin），但不要写进日志。换应用或重新激活后需要同步这里。
module.exports = {
  endpoint: 'https://mp-api.app.workbuddy.host',
  publishableKey: 'wbpk_r68wPNDXdc6LVrOths0ghs_FJX8MtJ66VfbNS3dxAtDNWstD0rBgTYF',
  workBuddyOAuthClientId: 'cb_jq6QyEPkOkJXPcpz0JxS_wbapp_r68wPNDXdc6LVrOths0ghs'
};
