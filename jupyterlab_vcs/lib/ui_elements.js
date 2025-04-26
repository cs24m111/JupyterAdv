import { Widget } from '@lumino/widgets';
import { Spinner } from '@jupyterlab/apputils';
export class SpinnerDialog extends Widget {
    constructor() {
        const spinnerStyle = {
            'margin-top': '6em',
            display: 'flex',
            'justify-content': 'center'
        };
        const body = document.createElement('div');
        const container = document.createElement('div');
        Private.applyStyle(container, spinnerStyle);
        body.appendChild(container);
        const spinner = new Spinner();
        container.appendChild(spinner.node);
        super({ node: body });
    }
}
export function showSpinner() {
    const spinnerDialog = new SpinnerDialog();
    spinnerDialog.addClass('jp-Spinner');
    return spinnerDialog;
}
export class PRCreated extends Widget {
    constructor(githubUrl = '', pranayUrl = '') {
        const anchorStyle = {
            color: '#0052cc',
            'text-decoration': 'none',
            'font-weight': '500'
        };
        const body = document.createElement('div');
        const container = document.createElement('div');
        container.classList.add('vcs-dialog-body');
        body.appendChild(container);
        if (githubUrl) {
            container.appendChild(Private.buildLabel('Pull Request on GitHub:'));
            container.appendChild(Private.buildNewline());
            container.appendChild(Private.buildAnchor(githubUrl, githubUrl, anchorStyle));
            container.appendChild(Private.buildNewline());
            container.appendChild(Private.buildNewline());
        }
        if (pranayUrl) {
            container.appendChild(Private.buildLabel('Pull Request on pranay:'));
            container.appendChild(Private.buildNewline());
            container.appendChild(Private.buildAnchor(pranayUrl, pranayUrl, anchorStyle));
        }
        if (!githubUrl && !pranayUrl) {
            container.appendChild(Private.buildLabel('No links available.'));
        }
        super({ node: body });
    }
}
export class CommitPushed extends Widget {
    constructor(githubUrl = '', pranayUrl = '') {
        const body = document.createElement('div');
        const container = document.createElement('div');
        container.classList.add('vcs-dialog-body');
        body.appendChild(container);
        if (githubUrl) {
            container.appendChild(Private.buildLabel('Local commit: ' + githubUrl + " created successfully."));
            container.appendChild(Private.buildNewline());
        }
        if (pranayUrl) {
            container.appendChild(Private.buildLabel(pranayUrl));
        }
        super({ node: body });
    }
}
export class DropDown extends Widget {
    constructor(options = [], label = '', styles = {}) {
        var _a, _b, _c;
        const body = document.createElement('div');
        const container = document.createElement('div');
        Private.applyStyle(body, (_a = styles.bodyStyle) !== null && _a !== void 0 ? _a : {});
        body.appendChild(container);
        container.appendChild(Private.buildLabel(label, (_b = styles.labelStyle) !== null && _b !== void 0 ? _b : {}));
        container.appendChild(Private.buildSelect(options, (_c = styles.selectStyle) !== null && _c !== void 0 ? _c : {}));
        super({ node: body });
    }
    get toNode() {
        return this.node.querySelector('select');
    }
    getTo() {
        return this.toNode.value;
    }
}
export class CheckBoxes extends Widget {
    constructor(items = []) {
        const container = document.createElement('div');
        container.classList.add('vcs-dialog-body');
        for (const item of items) {
            container.appendChild(Private.buildCheckbox(item));
        }
        super({ node: container });
    }
    getSelected() {
        return Array.from(this.node.querySelectorAll('input:checked')).map(input => input.id);
    }
}
export class CommitPRMessageDialog extends Widget {
    constructor() {
        const body = document.createElement('div');
        const container = document.createElement('div');
        container.classList.add('vcs-dialog-body');
        body.appendChild(container);
        container.appendChild(Private.buildLabel('Commit Message:'));
        container.appendChild(Private.buildTextarea('Enter your commit message', 'vcs-commit-message', 'vcs-textarea'));
        container.appendChild(Private.buildNewline());
        container.appendChild(Private.buildLabel('Pull Request Title:'));
        container.appendChild(Private.buildTextarea('Enter title for pull request', 'vcs-pr-title', 'vcs-textarea'));
        container.appendChild(Private.buildNewline());
        container.appendChild(Private.buildLabel('Branch:'));
        container.appendChild(Private.buildSelect([], { width: '100%' }, 'Select branch'));
        super({ node: body });
    }
    getCommitMessage() {
        var _a;
        return ((_a = this.node.querySelector('#vcs-commit-message')) === null || _a === void 0 ? void 0 : _a.value) || '';
    }
    getPRTitle() {
        var _a;
        return ((_a = this.node.querySelector('#vcs-pr-title')) === null || _a === void 0 ? void 0 : _a.value) || '';
    }
    getBranch() {
        var _a;
        return ((_a = this.node.querySelector('select')) === null || _a === void 0 ? void 0 : _a.value) || '';
    }
    setBranches(branches) {
        const select = this.node.querySelector('select');
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = 'Select branch';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);
        branches.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch;
            option.text = branch;
            select.appendChild(option);
        });
    }
}
export class CommitMessageDialog extends Widget {
    constructor() {
        const body = document.createElement('div');
        const container = document.createElement('div');
        container.classList.add('vcs-dialog-body');
        body.appendChild(container);
        container.appendChild(Private.buildLabel('Commit Message:'));
        container.appendChild(Private.buildTextarea('Enter your commit message', 'vcs-commit-message', 'vcs-textarea'));
        super({ node: body });
    }
    getCommitMessage() {
        var _a;
        return ((_a = this.node.querySelector('#vcs-commit-message')) === null || _a === void 0 ? void 0 : _a.value) || '';
    }
}
var Private;
(function (Private) {
    function buildLabel(text, style = {}) {
        const label = document.createElement('label');
        label.textContent = text;
        applyStyle(label, style);
        return label;
    }
    Private.buildLabel = buildLabel;
    function buildAnchor(url, text, style = {}) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.text = text;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        applyStyle(anchor, style);
        return anchor;
    }
    Private.buildAnchor = buildAnchor;
    function buildNewline() {
        return document.createElement('br');
    }
    Private.buildNewline = buildNewline;
    function buildCheckbox(text) {
        const span = document.createElement('span');
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.classList.add('vcs-checkbox');
        input.id = text;
        input.type = 'checkbox';
        label.htmlFor = text;
        label.textContent = text;
        span.appendChild(input);
        span.appendChild(label);
        return span;
    }
    Private.buildCheckbox = buildCheckbox;
    function buildTextarea(text, id, className) {
        const area = document.createElement('textarea');
        area.placeholder = text;
        area.id = id;
        area.classList.add(className);
        return area;
    }
    Private.buildTextarea = buildTextarea;
    function buildSelect(list, style = {}, defaultText) {
        const select = document.createElement('select');
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = defaultText || 'Select an option';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        select.appendChild(defaultOption);
        list.forEach(([text, value]) => {
            const option = document.createElement('option');
            option.value = value;
            option.text = text;
            select.appendChild(option);
        });
        applyStyle(select, style);
        return select;
    }
    Private.buildSelect = buildSelect;
    function applyStyle(element, style) {
        Object.entries(style).forEach(([key, value]) => {
            element.style.setProperty(key, value);
        });
        return element;
    }
    Private.applyStyle = applyStyle;
})(Private || (Private = {}));
//# sourceMappingURL=ui_elements.js.map