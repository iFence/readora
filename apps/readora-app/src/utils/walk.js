
/**
 * Shadow DOM 注册表，用于存储 closed shadow roots
 */
const shadowRootRegistry = new WeakMap();

/**
 * 拦截 attachShadow 方法，捕获 closed shadow roots
 * 必须在创建 shadow DOM 的元素之前调用
 */
export const interceptShadowDOM = () => {
    const originalAttachShadow = HTMLElement.prototype.attachShadow;

    HTMLElement.prototype.attachShadow = function(...args) {
        const shadowRoot = originalAttachShadow.apply(this, args);

        // 存储 shadow root 引用（包括 closed 模式）
        shadowRootRegistry.set(this, shadowRoot);

        return shadowRoot;
    };

};

/**
 * 获取元素的 shadow root（支持 closed 模式）
 */
const getShadowRoot = (element) => {
    // 优先使用公开的 shadowRoot
    if (element.shadowRoot) {
        return element.shadowRoot;
    }

    // 尝试从注册表获取
    return shadowRootRegistry.get(element) || null;
};

/**
 * 增强版：遍历文本节点（支持 closed Shadow DOM）
 */
export const walkTextNodesEnhanced = (root, rejectTags = []) => {
    const elements = [];

    const walk = (node, depth = 0) => {
        if (depth > 15) return;

        // 尝试获取 shadow root（包括 closed）
        if (node instanceof HTMLElement) {
            const shadowRoot = getShadowRoot(node);
            if (shadowRoot) {
                walk(shadowRoot, depth + 1);
            }
        }

        const children = 'children' in node ? Array.from(node.children) : [];

        for (const child of children) {
            if (
                child.tagName === 'STYLE' ||
                child.tagName === 'LINK' ||
                rejectTags.includes(child.tagName.toLowerCase())
            ) {
                continue;
            }

            // 检查子元素的 shadow root
            const childShadow = getShadowRoot(child);
            if (childShadow) {
                walk(childShadow, depth + 1);
            }

            // 处理 iframe
            if (child.tagName === 'IFRAME') {
                try {
                    const iframeDoc = child.contentDocument || child.contentWindow?.document;
                    if (iframeDoc && iframeDoc.body) {
                        walk(iframeDoc.body, depth + 1);
                    }
                } catch {}
            }

            const hasDirectText = child.childNodes && Array.from(child.childNodes).some((node) => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                    return true;
                }
                if (
                    node.nodeType === Node.ELEMENT_NODE &&
                    node.tagName === 'SPAN' &&
                    node.textContent?.trim()
                ) {
                    return true;
                }
                return false;
            });

            if (child.children.length === 0 && child.textContent?.trim()) {
                elements.push(child);
            } else if (hasDirectText) {
                elements.push(child);
            } else if (child.children.length > 0) {
                walk(child, depth + 1);
            }
        }
    };

    walk(root);
    return elements;
};
