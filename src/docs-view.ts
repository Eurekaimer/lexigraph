/**
 * Product documentation is deliberately state-free. Keeping it separate from
 * the study runtime makes copy, diagrams, and information architecture safe to
 * evolve without touching scheduling behavior.
 */
export function renderDocsView() {
  return `<article class="docs-layout">
    <aside class="docs-toc" aria-label="文档目录">
      <div class="docs-toc-title"><span class="eyebrow">DOCUMENTATION</span><h1>使用文档</h1><p>从第一次启动到数据迁移。</p></div>
      <nav>
        <a href="#overview"><span>01</span>概览</a>
        <a href="#quick-start"><span>02</span>开始使用</a>
        <a href="#ratings"><span>03</span>复习反馈</a>
        <a href="#memory"><span>04</span>记忆调度</a>
        <a href="#queue"><span>05</span>每日队列</a>
        <a href="#data"><span>06</span>数据与导出</a>
        <a href="#workflow"><span>07</span>项目工作流</a>
      </nav>
    </aside>

    <div class="docs-page">
      <header class="docs-hero" id="overview">
        <div><span class="docs-version">Lexigraph 0.3</span><h2>把注意力留给单词，<br>把复习时机交给系统。</h2><p>Lexigraph 是面向考研英语大纲词汇的本地优先复习工具。它提供清晰的四级反馈、稳定的每日队列，以及完全属于你的学习数据。</p></div>
        <dl class="docs-facts"><div><dt>词库</dt><dd>5,530</dd></div><div><dt>数据位置</dt><dd>本地</dd></div><div><dt>核心操作</dt><dd>键盘</dd></div></dl>
      </header>

      <section class="doc-section" id="quick-start">
        <div class="doc-section-heading"><span>02</span><div><p>GETTING STARTED</p><h2>开始使用</h2></div></div>
        <p class="doc-lead">公共 Demo 和本地模式使用同一套学习逻辑，但数据保存位置不同。</p>
        <div class="mode-grid">
          <article><span class="mode-badge">免安装</span><h3>公共 Demo</h3><p>直接打开 Pages。进度只保存在当前浏览器，网页没有权限修改 GitHub 仓库。</p><small>适合体验与临时学习</small></article>
          <article class="recommended"><span class="mode-badge">推荐</span><h3>本地模式</h3><p>克隆项目并启动本地服务。每次评分会自动写入 <code>profiles/default.json</code>。</p><small>适合长期学习与自主备份</small></article>
        </div>
        <div class="command-block" aria-label="本地启动命令"><div><i></i><i></i><i></i><span>Terminal</span></div><pre><code>git clone https://github.com/Eurekaimer/lexigraph.git
cd lexigraph
npm install
npm run local</code></pre></div>
        <div class="docs-callout"><b>学习顺序</b><span>观察单词 → 主动回忆 → Space 查看释义 → WASD 评分。误触后按 Z，可以恢复到评分前的完整状态。</span></div><div class="docs-callout neutral"><b>按键异常</b><span>键盘类浏览器扩展可能提前拦截 A / S / D。可先用无痕窗口排查，或在网址后加入 <code>?debug</code> 查看浏览器实际传入的键值。</span></div>
      </section>

      <section class="doc-section" id="ratings">
        <div class="doc-section-heading"><span>03</span><div><p>RECALL FEEDBACK</p><h2>四级复习反馈</h2></div></div>
        <p class="doc-lead">评分描述的是“这一次回忆有多顺利”，而不是对自己的永久评价。诚实反馈才能让间隔更准确。</p>
        <div class="rating-table-wrap"><table class="rating-table"><caption>四级复习反馈说明</caption><thead><tr><th scope="col">按键</th><th scope="col">反馈</th><th scope="col">何时选择</th><th scope="col">系统处理</th></tr></thead><tbody><tr class="tone-forgot"><td><kbd>A</kbd></td><th scope="row">完全忘记</th><td>无法回忆，或答案明显错误</td><td>约 30 分钟后再见</td></tr><tr class="tone-hard"><td><kbd>S</kbd></td><th scope="row">回忆困难</th><td>最终想起，但犹豫或耗时明显</td><td>缩短下一间隔</td></tr><tr class="tone-good"><td><kbd>D</kbd></td><th scope="row">正常掌握</th><td>在合理时间内正确回忆</td><td>逐步延长间隔</td></tr><tr class="tone-master"><td><kbd>W</kbd></td><th scope="row">完全掌握</th><td>几乎立即、稳定地准确回忆</td><td>移出自动复习</td></tr></tbody></table></div>
        <div class="docs-warning"><b>谨慎使用 W</b><p>“完全掌握”会让单词退出自动队列，但不会删除记录。你仍可在“复习记录”中找到它并重新评分。</p></div>
      </section>

      <section class="doc-section" id="memory">
        <div class="doc-section-heading"><span>04</span><div><p>SPACED REVIEW</p><h2>记忆调度</h2></div></div>
        <div class="memory-layout"><div><p class="doc-lead">记忆强度会随时间衰减。每次在接近遗忘前成功回忆，都会把曲线重新抬高，并延长下一次复习间隔。</p><ul class="doc-list"><li><b>遗忘</b>：回到短间隔，重新建立记忆。</li><li><b>困难</b>：保留进度，但降低增长速度。</li><li><b>正常</b>：按当前熟练度稳定延长。</li><li><b>掌握</b>：由你主动退出自动调度。</li></ul></div>
        <figure class="memory-figure"><svg class="memory-svg" viewBox="0 0 720 300" role="img" aria-labelledby="memory-title memory-desc"><title id="memory-title">复习间隔逐渐延长的记忆曲线</title><desc id="memory-desc">三次复习后，记忆衰减曲线逐渐变缓，复习间隔逐渐加长。</desc><defs><linearGradient id="memoryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#315d4d" stop-opacity=".18"/><stop offset="1" stop-color="#315d4d" stop-opacity="0"/></linearGradient></defs><g class="grid"><line x1="52" y1="54" x2="686" y2="54"/><line x1="52" y1="132" x2="686" y2="132"/><line x1="52" y1="210" x2="686" y2="210"/></g><line class="axis" x1="52" y1="250" x2="686" y2="250"/><path class="memory-area" d="M52 58 C86 82 105 160 132 224 L132 250 L52 250Z M132 58 C186 78 218 155 258 224 L258 250 L132 250Z M258 58 C340 76 404 150 478 224 L478 250 L258 250Z M478 58 C566 72 632 126 686 178 L686 250 L478 250Z"/><path class="memory-line" d="M52 58 C86 82 105 160 132 224 M132 58 C186 78 218 155 258 224 M258 58 C340 76 404 150 478 224 M478 58 C566 72 632 126 686 178"/><g class="review-points"><circle cx="132" cy="224" r="5"/><circle cx="258" cy="224" r="5"/><circle cx="478" cy="224" r="5"/></g><g class="memory-labels"><text x="52" y="278">开始</text><text x="111" y="278">复习 1</text><text x="237" y="278">复习 2</text><text x="457" y="278">复习 3</text><text x="605" y="278">时间</text></g><g class="intervals"><path d="M142 238h106"/><path d="m142 238 7-4v8zm106 0-7-4v8z"/><text x="168" y="231">间隔变长</text><path d="M268 238h200"/><path d="m268 238 7-4v8zm200 0-7-4v8z"/><text x="337" y="231">间隔继续变长</text></g></svg><figcaption>示意图用于解释调度方向，不代表固定的遗忘概率。</figcaption></figure></div>
      </section>

      <section class="doc-section" id="queue">
        <div class="doc-section-heading"><span>05</span><div><p>DAILY QUEUE</p><h2>每日学习队列</h2></div></div>
        <p class="doc-lead">系统根据剩余词量与目标日期计算每日新词数，再把新词均匀分配到五个词频层，并穿插已经到期的复习词。</p>
        <div class="queue-flow" aria-label="每日队列生成流程"><div><span>01</span><b>计算定量</b><small>剩余词量 ÷ 剩余天数</small></div><i>→</i><div><span>02</span><b>分层抽样</b><small>五个词频层均衡混合</small></div><i>→</i><div><span>03</span><b>穿插复习</b><small>到期旧词与今日新词</small></div></div>
        <div class="strata" aria-label="五个词频层"><span><i style="--level:100%"></i>高频</span><span><i style="--level:82%"></i>较高频</span><span><i style="--level:64%"></i>中频</span><span><i style="--level:46%"></i>较低频</span><span><i style="--level:28%"></i>低频</span></div>
        <p class="doc-note">同一天刷新页面不会更换词组。如果当天状态很好，可点击“增加一组”：每组追加 20 个新词，并按当前日均速度相应前移目标日期。</p>
      </section>

      <section class="doc-section" id="data">
        <div class="doc-section-heading"><span>06</span><div><p>DATA OWNERSHIP</p><h2>数据与导出</h2></div></div>
        <div class="data-cards"><article><h3>JSON 档案</h3><p>包含复习状态、历史、错误记录、学习计划和键位设置，可完整迁移到另一台电脑。</p><span>完整备份 · 推荐</span></article><article><h3>Anki TSV</h3><p>只导出至少学习过一次的词。功能默认关闭，可在“数据设置”中按需启用。</p><span>兼容接口 · 可选</span></article><article><h3>浏览器存储</h3><p>公共 Demo 的数据仅属于当前浏览器；清理站点数据前，请先导出 JSON 备份。</p><span>无需服务器</span></article></div>
      </section>

      <section class="doc-section" id="workflow">
        <div class="doc-section-heading"><span>07</span><div><p>PROJECT WORKFLOW</p><h2>项目工作流</h2></div></div>
        <p class="doc-lead">业务逻辑、存储适配器、导出接口和界面表现相互分离。每次发布都必须通过测试、类型检查和生产构建。</p>
        <div class="pipeline"><span><i>01</i>Commit</span><b>→</b><span><i>02</i>Tests</span><b>→</b><span><i>03</i>Build</span><b>→</b><span><i>04</i>Pages</span></div>
        <div class="docs-callout neutral"><b>公共页面的边界</b><span>GitHub Pages 只托管构建后的静态文件。访问者能够修改自己的浏览器数据，但不能修改仓库、词库源文件或你的个人 JSON。</span></div>
      </section>
    </div>
  </article>`;
}
