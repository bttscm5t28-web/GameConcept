// 测试用：关闭热更新推送（仍监听文件变化以刷新缓存），避免文件改动打断自动测试
export default { base: './', server: { hmr: false } };
