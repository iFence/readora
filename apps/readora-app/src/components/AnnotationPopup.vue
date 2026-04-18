<template>
  <n-modal
    :show="visible"
    preset="card"
    class="annotation-popup-modal"
    :mask-closable="false"
    :closable="false"
    @update:show="handleModalUpdate"
  >
    <section class="annotation-popup">
      <header class="annotation-popup__header">
        <div>
          <p class="annotation-popup__eyebrow">Note</p>
          <h2>写想法</h2>
          <p class="annotation-popup__subtitle">支持 Markdown，左侧编辑，右侧实时预览。</p>
        </div>
        <div class="annotation-popup__actions">
          <n-button secondary @click="$emit('cancel')">取消</n-button>
          <n-button type="primary" @click="$emit('save')">保存</n-button>
        </div>
      </header>

      <div v-if="excerpt" class="annotation-popup__excerpt">
        <span>摘录</span>
        <p>{{ excerpt }}</p>
      </div>

      <div class="annotation-popup__workspace">
        <div class="workspace-toggle" role="tablist" aria-label="笔记编辑模式">
          <button
            type="button"
            class="workspace-toggle__item"
            :class="{ active: activePane === 'editor' }"
            @click="activePane = 'editor'"
          >
            编辑
          </button>
          <button
            type="button"
            class="workspace-toggle__item"
            :class="{ active: activePane === 'preview' }"
            @click="activePane = 'preview'"
          >
            预览
          </button>
        </div>

        <section class="editor-pane" :class="{ 'pane-hidden-mobile': activePane !== 'editor' }">
          <div class="pane-head">
            <strong>Markdown</strong>
            <span>{{ draftLength }} 字</span>
          </div>
          <textarea
            :value="draft"
            class="editor-textarea"
            placeholder="# 想法标题&#10;&#10;写下你的理解、联想或下一步行动..."
            @input="$emit('update:draft', $event.target.value)"
            @keydown="handleKeydown"
          />
          <div class="editor-hint">支持标题、列表、代码块、引用、链接。`Ctrl/Cmd + Enter` 保存。</div>
        </section>

        <section class="preview-pane" :class="{ 'pane-hidden-mobile': activePane !== 'preview' }">
          <div class="pane-head">
            <strong>预览</strong>
            <span>实时渲染</span>
          </div>
          <div v-if="renderedHtml" class="markdown-preview" v-html="renderedHtml"></div>
          <div v-else class="preview-empty">
            开始输入后，这里会显示 Markdown 预览。
          </div>
        </section>
      </div>
    </section>
  </n-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { NButton, NModal } from 'naive-ui';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  draft: {
    type: String,
    default: '',
  },
  excerpt: {
    type: String,
    default: '',
  },
  renderedHtml: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:draft', 'save', 'cancel']);

const draftLength = computed(() => props.draft.trim().length);
const activePane = ref('editor');

watch(() => props.visible, visible => {
  if (visible) {
    activePane.value = 'editor';
  }
});

function handleKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    emit('save');
  }
}

function handleModalUpdate(show) {
  if (!show) {
    emit('cancel');
  }
}
</script>

<style scoped>
.annotation-popup-modal {
  width: min(1040px, 78vw);
}

.annotation-popup {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: var(--text-primary);
}

.annotation-popup__header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.annotation-popup__eyebrow {
  margin: 0 0 8px;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
}

.annotation-popup__header h2 {
  margin: 0;
  font-size: 1.7rem;
  line-height: 1.1;
}

.annotation-popup__subtitle {
  margin: 10px 0 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.annotation-popup__actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.annotation-popup__excerpt {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--surface-panel) 92%, transparent);
}

.annotation-popup__excerpt span {
  display: inline-block;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.annotation-popup__excerpt p {
  margin: 0;
  line-height: 1.7;
  color: var(--text-primary);
}

.annotation-popup__workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
  min-height: min(62vh, 760px);
}

.workspace-toggle {
  display: none;
}

.editor-pane,
.preview-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 20px;
  border: 1px solid var(--border-subtle);
  background: linear-gradient(180deg, var(--surface-panel), var(--surface-elevated));
  overflow: hidden;
}

.pane-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}

.pane-head strong {
  color: var(--text-primary);
}

.workspace-toggle__item {
  height: 38px;
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.workspace-toggle__item.active {
  background: var(--surface-elevated);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 28%, var(--border-subtle));
}

.editor-textarea {
  flex: 1;
  min-height: 0;
  resize: none;
  padding: 18px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  line-height: 1.75;
}

.editor-hint {
  padding: 14px 18px 18px;
  color: var(--text-muted);
  font-size: 0.82rem;
  border-top: 1px solid var(--border-subtle);
}

.markdown-preview,
.preview-empty {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 18px;
}

.preview-empty {
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.markdown-preview :deep(*) {
  max-width: 100%;
}

.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(h4) {
  margin: 0 0 14px;
  line-height: 1.25;
  color: var(--text-primary);
}

.markdown-preview :deep(p),
.markdown-preview :deep(ul),
.markdown-preview :deep(ol),
.markdown-preview :deep(blockquote),
.markdown-preview :deep(pre) {
  margin: 0 0 14px;
  line-height: 1.75;
}

.markdown-preview :deep(ul),
.markdown-preview :deep(ol) {
  padding-left: 22px;
}

.markdown-preview :deep(blockquote) {
  padding: 12px 14px;
  border-left: 3px solid var(--accent);
  border-radius: 12px;
  background: var(--surface-panel);
  color: var(--text-secondary);
}

.markdown-preview :deep(code) {
  padding: 0.15em 0.38em;
  border-radius: 8px;
  background: var(--surface-panel-muted);
  font-size: 0.92em;
}

.markdown-preview :deep(pre) {
  padding: 14px 16px;
  border-radius: 14px;
  background: #1e2430;
  color: #f6f8fb;
  overflow: auto;
}

.markdown-preview :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
}

.markdown-preview :deep(a) {
  color: var(--accent);
  text-decoration: none;
}

.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .annotation-popup-modal {
    width: min(96vw, 1040px);
  }

  .annotation-popup__header {
    flex-direction: column;
  }

  .annotation-popup__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .annotation-popup__workspace {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .workspace-toggle {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .editor-pane,
  .preview-pane {
    min-height: 260px;
  }

  .pane-hidden-mobile {
    display: none;
  }
}
</style>
