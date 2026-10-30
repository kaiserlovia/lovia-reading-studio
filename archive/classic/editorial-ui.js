/* Editorial chrome only: the original canvases, files and export settings stay owned by each editor. */
(() => {
  'use strict';
  function start() {
    const root = document.documentElement;
    const classic = root.dataset.studioPage === 'lovia';
    const q = s => document.querySelector(s);
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text) n.textContent = text;
      return n;
    };
    const button = (text, action, cls = 'ed-link') => {
      const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', action); return b;
    };
    const shell = q('#studioShell');
    const header = q('.topbar');
    if (!header || !shell) return;
    header.classList.add('ed-topbar');
    header.querySelector('.brand').setAttribute('aria-label', 'LOVIA READING STUDIO');
    const wordmark = header.querySelector('.brand-wordmark,.brand-word');
    wordmark.replaceChildren(el('span', 'ed-brand-name', 'LOVIA'), el('span', 'ed-brand-slash', '/'), el('span', 'ed-brand-studio', 'READING STUDIO'));
    header.append(shell);
    q('.studio-switch-row')?.remove();
    const actions = q('.topbar-actions') || el('div', 'topbar-actions');
    q('.topbar-note')?.remove();
    actions.prepend(button('保存预设', () => q('#savePreset').click(), 'ed-save ed-link'));
    if (!classic) actions.append(button('导出高清海报 ↗', () => q('#exportOne').click(), 'ed-export'));
    header.append(actions);

    const main = q(classic ? '.workspace' : '.app');
    // No introductory banner on either page. New workspace changes below are Classic-only.
    q('.intro')?.remove();

    // Keep the real preset controls and their existing handlers, rather than copying their markup.
    const presetDialog = el('dialog', 'ed-preset-dialog');
    presetDialog.setAttribute('aria-labelledby', 'edPresetTitle');
    const presetHead = el('div', 'ed-dialog-head');
    const presetTitle = el('h2', '', '我的预设'); presetTitle.id = 'edPresetTitle';
    presetHead.append(presetTitle, button('关闭 ×', () => presetDialog.close()));
    const presetContent = el('div', 'ed-preset-content');
    const empty = el('p', 'ed-preset-empty', '还没有保存的设定。把喜欢的排版保存下来，下次继续。');
    presetContent.append(empty);
    presetDialog.append(presetHead, presetContent, button('保存当前设定', () => q('#savePreset').click(), 'ed-export'));
    document.body.append(presetDialog);
    let presetAnchor;
    const openPresets = () => {
      const bar = q('#presetBar');
      if (bar && !presetDialog.contains(bar)) {
        presetAnchor = document.createComment('preset location'); bar.before(presetAnchor); presetContent.append(bar);
      }
      const syncEmpty = () => { empty.hidden = !!bar && !bar.hidden; };
      syncEmpty();
      presetDialog.showModal();
    };
    presetDialog.addEventListener('close', () => {
      if (presetAnchor) { presetAnchor.replaceWith(q('#presetBar')); presetAnchor = null; }
    });
    new MutationObserver(() => {
      const hideEmpty = !!q('#presetBar') && !q('#presetBar').hidden;
      if (empty.hidden !== hideEmpty) empty.hidden = hideEmpty;
    }).observe(presetContent, {subtree:true, childList:true, attributes:true, attributeFilter:['hidden']});
    shell.querySelector('.ss-seg').append(button('我的预设', openPresets, 'ed-presets ed-link'));

    if (classic) {
      q('.preview-status strong').textContent = '最终大预览';
      const editor = q('.editor');
      editor.removeAttribute('aria-labelledby'); editor.setAttribute('aria-label', '画报设置');
      q('.preview-column').removeAttribute('aria-labelledby'); q('.preview-column').setAttribute('aria-label', '实时画报预览');
      const reset = q('#resetAll');
      reset.setAttribute('aria-label', '恢复默认设置');
      const scroll = q('.editor-scroll');
      const nav = el('nav', 'ed-editor-nav'); nav.setAttribute('aria-label', '编辑区域'); nav.setAttribute('role', 'tablist');
      const sections = [...scroll.querySelectorAll('.editor-section')];
      const selectSection = (index, focus = false) => {
        sections.forEach((section, i) => { section.hidden = i !== index; });
        [...nav.querySelectorAll('[role=tab]')].forEach((b, i) => {
          b.setAttribute('aria-selected', String(i === index)); b.tabIndex = i === index ? 0 : -1;
        });
        scroll.scrollTop = 0;
        if (focus) nav.children[index].focus();
      };
      ['文字', '图片', '底图', '细节'].forEach((name, i) => {
        const b = button(name, () => selectSection(i));
        sections[i].id = 'ed-section-' + i;
        sections[i].setAttribute('role', 'tabpanel'); sections[i].setAttribute('aria-labelledby', 'ed-tab-' + i);
        b.id = 'ed-tab-' + i; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', sections[i].id);
        b.addEventListener('keydown', event => {
          const index = event.key === 'ArrowRight' ? (i + 1) % 4 : event.key === 'ArrowLeft' ? (i + 3) % 4 : event.key === 'Home' ? 0 : event.key === 'End' ? 3 : null;
          if (index !== null) { event.preventDefault(); selectSection(index, true); }
        });
        nav.append(b);
      });
      editor.querySelector('.editor-top').replaceWith(nav);
      nav.append(reset);
      selectSection(0);
      // The four editable fields lead the inspector, as in the accepted design.
      const textCards = q('.text-cards');
      const fontPanel = q('.global-font-panel');
      textCards.after(fontPanel);
      textCards.before(q('#textSectionTitle').closest('.section-title'));
      const colorPanel = q('.text-color-panel');
      const colorNote = colorPanel.nextElementSibling;
      fontPanel.after(colorPanel, colorNote);
      textCards.querySelectorAll('.text-card').forEach(card => {
        const tools = el('details', 'ed-field-tools');
        tools.append(el('summary', '', '字体 · 字号 · 颜色'), card.querySelector('.text-chips'), card.querySelector('.text-edit'));
        card.append(tools);
      });
      new MutationObserver(records => {
        for (const {target} of records) if (target.matches('.text-card.open')) {
          target.querySelector('.ed-field-tools').open = true;
          selectSection(0);
        }
      }).observe(textCards, {subtree:true, attributes:true, attributeFilter:['class']});
      q('.welcome-note').hidden = true;
      const preview = q('.preview-card'), art = q('.art-mosaic'), column = q('.preview-column');
      column.append(preview);
      // Settings stay outside the pinned canvas so expanding them cannot cover the preview.
      editor.querySelector('.editor-footer').before(art);
      const output = el('section', 'ed-output-controls'); output.setAttribute('aria-label', '高清导出');
      output.append(q('.preview-caption'), q('.export-quality-panel'));
      editor.append(output);
      const setHeaderHeight = () => root.style.setProperty('--ed-classic-header-height', header.getBoundingClientRect().height + 'px');
      new ResizeObserver(setHeaderHeight).observe(header); setHeaderHeight();
      new ResizeObserver(() => root.style.setProperty('--ed-classic-preview-height', column.getBoundingClientRect().height + 'px')).observe(column);
      const canvas = q('#posterCanvas');
      const setPreviewRatio = () => root.style.setProperty('--ed-classic-ratio', String(canvas.width / canvas.height));
      new MutationObserver(setPreviewRatio).observe(canvas, {attributes:true, attributeFilter:['width','height']}); setPreviewRatio();
      // A second export entry lives next to the quality controls, with the same original handler.
      q('.export-quality-panel').append(button('下载高清 PNG ↗', () => q('#downloadButton').click(), 'ed-export ed-preview-download'));
    } else {
      const stage = q('.stage');
      const toolbar = el('div', 'ed-stage-toolbar');
      toolbar.append(el('h3', '', '最终大预览'), q('#pinShots'), q('#openLarge'));
      stage.before(toolbar);
      q('.panel').classList.add('ed-inspector');
      const editorHead = el('div', 'editor-top');
      editorHead.append(el('h2', '', '编辑你的画报'), button('重置', () => q('#resetAll').click()));
      // Keep Day Night's preview and its tabs together, as in the upstream layout.
      q('.panel>.art-mosaic').after(editorHead);
    }
  }
  // Day Night registers its shell during parsing; wait until that shell is mounted.
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
