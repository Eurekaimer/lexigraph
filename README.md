# Lexigraph

桌面优先、离线优先的考研英语词汇复习工具。它将单词视为节点，将拼写相似与真实误认记录建模为个性化易混词网络。

## 使用方式

公开 Pages 仅用于演示。访问者的数据保存在自己的浏览器中，不能修改仓库。

个人使用推荐 clone 后运行：

    npm install
    npm run local

然后打开 http://127.0.0.1:4173。本地服务只监听本机，并自动读写被 Git 忽略的 profiles/default.json。Windows、Linux 和 macOS 使用相同命令，不需要 EXE。

## 功能

- 5530 个考研英语（一）大纲词汇，按词频排列
- 四级复习反馈与默认 WASD 键盘流
- 可自定义的 Action–Key 映射
- JSON 自动保存、导入和导出
- 基于遗忘与误认记录的易混词网络
- 近 14 天复习量、回忆成功率和遗忘次数
- 默认关闭的 Anki TSV 导出适配器
- 站内使用文档、记忆曲线与发布工作流说明

## 默认键位

| 操作 | 键 |
| --- | --- |
| 显示释义 | Space |
| 完全忘记 | A |
| 回忆困难 | S |
| 正常掌握 | D |
| 非常熟练 | W |
| 学习 / 易混词 / 统计 / 数据 / 文档 | 1 / 2 / 3 / 4 / 5 |

## 数据迁移

在“数据与接口”页导出 lexigraph-profile.json，通过任意文件传输工具发送到另一台电脑，再执行导入。个人 JSON 默认不会提交到 Git。

Anki 默认关闭。启用后导出 UTF-8 TSV，在 Anki 中选择制表符分隔导入。该适配器只导出至少学习过一次的单词。

## 开发与验证

    npm test
    npm run build

词库可复现生成：

    node scripts/build-vocabulary.mjs /path/to/netem_full_list.json

## 模块边界

- logic.ts：复习调度与易混关系领域逻辑
- storage.ts：StorageAdapter 及浏览器/本地文件适配
- keymap.ts：可扩展 Action–Key 输入接口
- export.ts：JSON 与 Anki ExportAdapter
- stats.ts：纯统计计算
- scripts/local-server.mjs：本地 JSON 边界

领域逻辑不依赖浏览器、文件系统、Anki 或 GitHub Pages。

## 词库许可

词库来自 exam-data/NETEMVocabulary，数据采用 CC BY-NC-SA 4.0；应用代码采用 MIT License。
