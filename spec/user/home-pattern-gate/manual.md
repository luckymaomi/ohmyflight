# 首页图案验证

打开工具首页后，在九宫格最下面一行横向连接三个点即可进入；从左向右或从右向左均可。

该图案只用于遮挡首页，不是真实账号认证。

站点维护者在 `src/site-visibility.ts` 中设置 `homepage.patternGate`：`true` 显示图案门禁，`false` 直接显示工具首页。
