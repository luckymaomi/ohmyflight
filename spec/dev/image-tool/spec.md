# 图片工具开发规格

## 产品边界

`image-tool` 是浏览器本地图片处理集合，包含格式转换、压缩、尺寸调整、裁剪和 Base64 互转五个独立模式。上传文件只进入浏览器内存，不发送到服务器。

## 模式契约

### 格式转换

- 接受一张或多张浏览器可解码图片。
- 输出格式为页面提供的 PNG、JPEG、WebP 等选项；有损格式使用用户质量值。
- Canvas 重新编码后逐张提供下载，文件名保留原基础名并替换扩展名。

### 压缩

- 接受多张图片，使用 `browser-image-compression`。
- 质量由滑块给出，可选最大宽度；处理前显示预计结果大小。
- 输出名追加 `_compressed`，扩展名按压缩结果 MIME 类型确定。

### 调整尺寸

- 接受多张图片，目标宽、高必须为正数。
- 保持比例时使用能完整容纳在目标框内的较小缩放比例；不保持比例时强制目标宽高。
- 使用 Pica 缩放并统一输出 PNG，文件名追加 `_resized`。

### 裁剪

- 单次处理一张图片，使用 Cropper.js 自由框选。
- 裁剪结果统一为 PNG，可重置后重新选择。

### Base64

- 图片转 Base64 输出完整 Data URL 并支持复制。
- Base64 转图片接受完整 Data URL 或裸 Base64；裸值按 PNG 补前缀，解码失败明确提示。
- 还原结果通过 Canvas 统一导出 PNG。

## 状态与资源边界

- 各模式拥有独立上传队列和结果区，切换模式不构成持久存储。
- 删除、清空或替换预览时必须释放 Object URL，避免连续处理造成内存泄漏。
- 浏览器无法解码、Canvas 无法生成 Blob 或第三方库缺失时停止当前项目，不伪造成功文件。

## 代码与验证

- 页面：`public/tool/app/image-tool/index.html`
- 模式逻辑：`src/tool/app/image-tool/convert.ts`、`compress.ts`、`resize.ts`、`crop.ts`、`base64.ts`
- 公共资源管理：`src/tool/app/image-tool/shared.ts`
- 测试：`tests/tool/image-tool/shared.test.ts`

