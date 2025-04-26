"use strict";
(self["webpackChunk_pranay_jupyterlab_vcs"] = self["webpackChunk_pranay_jupyterlab_vcs"] || []).push([["lib_index_js"],{

/***/ "./lib/api_client.js":
/*!***************************!*\
  !*** ./lib/api_client.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   HTTP: () => (/* binding */ HTTP),
/* harmony export */   cloneRepository: () => (/* binding */ cloneRepository),
/* harmony export */   configureGit: () => (/* binding */ configureGit),
/* harmony export */   createAndPushCommit: () => (/* binding */ createAndPushCommit),
/* harmony export */   getBranches: () => (/* binding */ getBranches),
/* harmony export */   getModifiedRepositories: () => (/* binding */ getModifiedRepositories),
/* harmony export */   getServerConfig: () => (/* binding */ getServerConfig),
/* harmony export */   resetConfigureGit: () => (/* binding */ resetConfigureGit),
/* harmony export */   tagVersion: () => (/* binding */ tagVersion)
/* harmony export */ });
/* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/coreutils */ "webpack/sharing/consume/default/@jupyterlab/coreutils");
/* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/apputils */ "webpack/sharing/consume/default/@jupyterlab/apputils");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! axios */ "webpack/sharing/consume/default/axios/axios");
/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(axios__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _ui_elements__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./ui_elements */ "./lib/ui_elements.js");
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @lumino/widgets */ "webpack/sharing/consume/default/@lumino/widgets");
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_lumino_widgets__WEBPACK_IMPORTED_MODULE_3__);





const HTTP = axios__WEBPACK_IMPORTED_MODULE_2___default().create({
    baseURL: _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0__.PageConfig.getBaseUrl(),
    timeout: 10000 // 10s timeout for API calls
});
HTTP.defaults.headers.post['X-CSRFToken'] = getCookie('_xsrf');
function getCookie(name) {
    const r = document.cookie.match(`\\b${name}=([^;]*)\\b`);
    return r ? r[1] : undefined;
}
// Retry logic for API calls
async function withRetry(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            if (i === retries - 1)
                throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Max retries reached');
}
async function getServerConfig() {
    try {
        const response = await withRetry(() => HTTP.get('vcs/expanded_server_root'));
        return response.data;
    }
    catch (error) {
        console.error('Failed to get server config:', error);
        const body = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_3__.Widget({ node: document.createElement('div') });
        body.node.textContent = 'Unable to fetch server configuration.';
        await (0,_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.showDialog)({
            title: 'Server Config Error',
            body,
            buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.okButton()]
        });
        throw error;
    }
}
async function configureGit(data) {
    try {
        console.log('Sending configuration data:', data);
        await withRetry(() => HTTP.post('vcs/configure', data));
        console.log('Configuration successful');
    }
    catch (error) {
        console.error('Failed to configure Git:');
        throw error;
    }
}
async function resetConfigureGit() {
    try {
        await withRetry(() => HTTP.post('vcs/reset'));
        console.log('Configuration reset successful');
    }
    catch (error) {
        console.error('Failed to reset configure Git:');
        throw error;
    }
}
async function createAndPushCommit(data, showCommitPushedDialog) {
    (0,_ui_elements__WEBPACK_IMPORTED_MODULE_4__.showSpinner)();
    try {
        const response = await withRetry(() => HTTP.post('vcs/commit', data));
        const result = response.data;
        _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.flush();
        showCommitPushedDialog(result.github_url, result.pranay_url);
    }
    catch (error) {
        console.error('Failed to create and push commit:', error);
        _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.flush();
        const body = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_3__.Widget({ node: document.createElement('div') });
        body.node.textContent = 'Failed to commit local changes. Please set Git Access details.';
        await (0,_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.showDialog)({
            title: 'Commit Error',
            body,
            buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.okButton()]
        });
        showCommitPushedDialog();
    }
}
async function cloneRepository(data) {
    try {
        await withRetry(() => HTTP.post('vcs/clone', data));
    }
    catch (error) {
        console.error('Failed to clone repository:', error);
        throw error;
    }
}
async function tagVersion(data) {
    try {
        await withRetry(() => HTTP.post('vcs/tag', data));
    }
    catch (error) {
        console.error('Failed to tag version:', error);
        throw error;
    }
}
async function getModifiedRepositories(data, showRepositorySelectionDialog, command, showRepositorySelectionFailureDialog) {
    try {
        const response = await withRetry(() => HTTP.post('vcs/modified_repo', data));
        const repoList = response.data;
        const repoNames = repoList.map(repo => [
            `${repo.name} (${repo.path})`,
            repo.path
        ]);
        showRepositorySelectionDialog(repoNames, command);
    }
    catch (error) {
        console.error('Failed to get modified repositories:', error);
        showRepositorySelectionFailureDialog();
    }
}
async function getBranches(repoPath) {
    try {
        const response = await withRetry(() => HTTP.get(`vcs/branches?repo_path=${encodeURIComponent(repoPath)}`));
        return response.data.branches || [];
    }
    catch (error) {
        console.error('Failed to fetch branches:', error);
        const body = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_3__.Widget({ node: document.createElement('div') });
        body.node.textContent = 'Unable to fetch repository branches.';
        await (0,_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.showDialog)({
            title: 'Branches Error',
            body,
            buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.okButton()]
        });
        return [];
    }
}


/***/ }),

/***/ "./lib/handler.js":
/*!************************!*\
  !*** ./lib/handler.js ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   requestAPI: () => (/* binding */ requestAPI)
/* harmony export */ });
/* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/coreutils */ "webpack/sharing/consume/default/@jupyterlab/coreutils");
/* harmony import */ var _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/services */ "webpack/sharing/consume/default/@jupyterlab/services");
/* harmony import */ var _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__);


/**
 * Call the API extension
 *
 * @param endPoint API REST endpoint for the extension
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
async function requestAPI(endPoint = '', init = {}) {
    const settings = _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__.ServerConnection.makeSettings();
    const requestUrl = _jupyterlab_coreutils__WEBPACK_IMPORTED_MODULE_0__.URLExt.join(settings.baseUrl, 'jupyterlab-vcs', endPoint);
    try {
        const response = await _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__.ServerConnection.makeRequest(requestUrl, init, settings);
        const data = await response.text();
        if (!response.ok) {
            throw new _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__.ServerConnection.ResponseError(response, data || 'Request failed');
        }
        if (data.length > 0) {
            try {
                return JSON.parse(data);
            }
            catch (error) {
                console.warn('Not a JSON response body:', response);
                return data;
            }
        }
        return {};
    }
    catch (error) {
        if (error instanceof _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__.ServerConnection.NetworkError) {
            throw error;
        }
        throw new _jupyterlab_services__WEBPACK_IMPORTED_MODULE_1__.ServerConnection.NetworkError(error);
    }
}


/***/ }),

/***/ "./lib/index.js":
/*!**********************!*\
  !*** ./lib/index.js ***!
  \**********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _sidebar__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./sidebar */ "./lib/sidebar.js");
/* harmony import */ var _handler__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./handler */ "./lib/handler.js");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @jupyterlab/apputils */ "webpack/sharing/consume/default/@jupyterlab/apputils");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @lumino/widgets */ "webpack/sharing/consume/default/@lumino/widgets");
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_lumino_widgets__WEBPACK_IMPORTED_MODULE_1__);




/**
 * Initialization data for the @pranay/jupyterlab_vcs extension.
 */
const plugin = {
    id: '@pranay/jupyterlab_vcs:plugin',
    description: 'JupyterLab extension to create GitHub pull requests & commits.',
    autoStart: true,
    activate: async (app) => {
        console.log('vcs extension is activated!');
        try {
            // Verify server extension is available
            const data = await (0,_handler__WEBPACK_IMPORTED_MODULE_2__.requestAPI)('get-example');
            console.log('Server extension response:', data);
            // Initialize and add sidebar
            const sidebar = new _sidebar__WEBPACK_IMPORTED_MODULE_3__.vcsSidebar();
            app.shell.add(sidebar, 'left', { rank: 600 });
        }
        catch (error) {
            console.error('Failed to initialize vcs extension:', error);
            // Show error dialog to user
            const body = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_1__.Widget({ node: document.createElement('div') });
            body.node.textContent = 'The vcs server extension is unavailable. Please check your setup.';
            await (0,_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.showDialog)({
                title: 'vcs Initialization Error',
                body,
                buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_0__.Dialog.okButton()]
            });
        }
    }
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (plugin);


/***/ }),

/***/ "./lib/sidebar.js":
/*!************************!*\
  !*** ./lib/sidebar.js ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   vcsSidebar: () => (/* binding */ vcsSidebar)
/* harmony export */ });
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @lumino/widgets */ "webpack/sharing/consume/default/@lumino/widgets");
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_lumino_widgets__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/apputils */ "webpack/sharing/consume/default/@jupyterlab/apputils");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _ui_elements__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./ui_elements */ "./lib/ui_elements.js");
/* harmony import */ var _api_client__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./api_client */ "./lib/api_client.js");




class vcsSidebar extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget {
    constructor() {
        super();
        this.id = 'vcs-sidebar';
        this.title.iconClass = 'jp-Icon jp-Icon-20 jp-vcsIcon';
        this.title.caption = 'vcs';
        this.addClass('vcs-sidebar-widget');
        const container = document.createElement('div');
        container.className = 'vcs-sidebar-container';
        // Header
        const header = document.createElement('div');
        header.className = 'vcs-sidebar-header';
        header.textContent = '';
        container.appendChild(header);
        // Status
        const statusContainer = document.createElement('div');
        statusContainer.className = 'vcs-status-container';
        this._statusElement = document.createElement('span');
        this._statusElement.className = 'vcs-status';
        this._statusElement.textContent = 'Ready';
        statusContainer.appendChild(this._statusElement);
        container.appendChild(statusContainer);
        // Buttons
        const configureGitButton = this._createButton('Set Git Access', () => this._onConfigureGit());
        //const cloneRepoButton = this._createButton('Clone Repository', () => this._onCloneRepo());
        const createCommitButton = this._createButton('Create Local Commit', () => this._onCreateCommit());
        //const viewReposButton = this._createButton('View Modified Repos', () => this._onViewRepos());
        const refreshButton = this._createButton('Reset Git Access', () => this._onRefresh());
        container.appendChild(configureGitButton);
        //container.appendChild(cloneRepoButton);
        container.appendChild(createCommitButton);
        //container.appendChild(viewReposButton);
        container.appendChild(refreshButton);
        this.node.appendChild(container);
    }
    _createButton(label, onClick) {
        const button = document.createElement('button');
        button.textContent = label;
        button.className = 'vcs-button';
        button.onclick = onClick;
        return button;
    }
    _updateStatus(message, isError = false) {
        this._statusElement.textContent = message;
        this._statusElement.className = `vcs-status ${isError ? 'error' : ''}`;
    }
    async _onConfigureGit() {
        this._updateStatus('Configuring Git...');
        const body = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget({ node: document.createElement('div') });
        body.node.className = 'vcs-dialog-body';
        const usernameInput = document.createElement('input');
        usernameInput.type = 'text';
        usernameInput.placeholder = 'Git Username';
        usernameInput.className = 'vcs-input';
        body.node.appendChild(document.createElement('label')).textContent = 'Username:';
        body.node.appendChild(usernameInput);
        body.node.appendChild(document.createElement('br'));
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.placeholder = 'Git Email';
        emailInput.className = 'vcs-input';
        body.node.appendChild(document.createElement('label')).textContent = 'Email:';
        body.node.appendChild(emailInput);
        body.node.appendChild(document.createElement('br'));
        const tokenInput = document.createElement('input');
        tokenInput.type = 'password';
        tokenInput.placeholder = 'GitHub Token ';
        tokenInput.className = 'vcs-input';
        body.node.appendChild(document.createElement('label')).textContent = 'GitHub Token:';
        body.node.appendChild(tokenInput);
        const result = await (0,_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.showDialog)({
            title: 'Configure Git',
            body,
            buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.cancelButton(), _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.okButton({ label: 'Save' })]
        });
        if (result.button.label !== 'Save') {
            this._updateStatus('Ready');
            return;
        }
        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const token = tokenInput.value.trim();
        if (!username || !email || !token) {
            this._updateStatus('Missing required fields', true);
            const errorBody = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget({ node: document.createElement('div') });
            errorBody.node.textContent = 'Please provide a username / email / token.';
            await (0,_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.showDialog)({
                title: 'Invalid Input',
                body: errorBody,
                buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.okButton()]
            });
            return;
        }
        try {
            await (0,_api_client__WEBPACK_IMPORTED_MODULE_2__.configureGit)({ username, email, token });
            this._updateStatus('Git configured successfully');
        }
        catch (error) {
            this._updateStatus('Failed to configure Git', true);
            const errorBody = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget({ node: document.createElement('div') });
            errorBody.node.textContent = 'Failed to configure Git. Please check your inputs.';
            await (0,_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.showDialog)({
                title: 'Configuration Error',
                body: errorBody,
                buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.okButton()]
            });
        }
    }
    async _onCreateCommit() {
        const dialog = new _ui_elements__WEBPACK_IMPORTED_MODULE_3__.CommitMessageDialog();
        const result = await (0,_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.showDialog)({
            title: 'Push Commit',
            body: dialog,
            buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.cancelButton(), _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.okButton({ label: 'Commit' })]
        });
        if (result.button.label !== 'Commit') {
            this._updateStatus('Ready');
            return;
        }
        const commitMessage = dialog.getCommitMessage().trim();
        if (!commitMessage) {
            this._updateStatus('Missing commit message', true);
            const body = new _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget({ node: document.createElement('div') });
            body.node.textContent = 'Please provide a commit message.';
            await (0,_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.showDialog)({
                title: 'Invalid Input',
                body,
                buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.okButton()]
            });
            return;
        }
        this._updateStatus('Creating commit...');
        await (0,_api_client__WEBPACK_IMPORTED_MODULE_2__.createAndPushCommit)({ commit_message: commitMessage }, async (githubUrl, pranayUrl) => {
            if (githubUrl) {
                this._showCommitDialog(githubUrl, pranayUrl);
            }
        });
        this._updateStatus('Ready');
    }
    async _onRefresh() {
        this._updateStatus('Resetting config...');
        try {
            await (0,_api_client__WEBPACK_IMPORTED_MODULE_2__.resetConfigureGit)();
            this._updateStatus('Reset Git configured successfully');
        }
        catch (error) {
            this._updateStatus('Failed to reseet configure Git', true);
        }
    }
    _showCommitDialog(githubUrl, pranayUrl) {
        const body = new _ui_elements__WEBPACK_IMPORTED_MODULE_3__.CommitPushed(githubUrl, pranayUrl);
        void (0,_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.showDialog)({
            title: 'Commit Created',
            body,
            buttons: [_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Dialog.okButton()]
        });
    }
}


/***/ }),

/***/ "./lib/ui_elements.js":
/*!****************************!*\
  !*** ./lib/ui_elements.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   CheckBoxes: () => (/* binding */ CheckBoxes),
/* harmony export */   CommitMessageDialog: () => (/* binding */ CommitMessageDialog),
/* harmony export */   CommitPRMessageDialog: () => (/* binding */ CommitPRMessageDialog),
/* harmony export */   CommitPushed: () => (/* binding */ CommitPushed),
/* harmony export */   DropDown: () => (/* binding */ DropDown),
/* harmony export */   PRCreated: () => (/* binding */ PRCreated),
/* harmony export */   SpinnerDialog: () => (/* binding */ SpinnerDialog),
/* harmony export */   showSpinner: () => (/* binding */ showSpinner)
/* harmony export */ });
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @lumino/widgets */ "webpack/sharing/consume/default/@lumino/widgets");
/* harmony import */ var _lumino_widgets__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_lumino_widgets__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @jupyterlab/apputils */ "webpack/sharing/consume/default/@jupyterlab/apputils");
/* harmony import */ var _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__);


class SpinnerDialog extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget {
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
        const spinner = new _jupyterlab_apputils__WEBPACK_IMPORTED_MODULE_1__.Spinner();
        container.appendChild(spinner.node);
        super({ node: body });
    }
}
function showSpinner() {
    const spinnerDialog = new SpinnerDialog();
    spinnerDialog.addClass('jp-Spinner');
    return spinnerDialog;
}
class PRCreated extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget {
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
class CommitPushed extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget {
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
class DropDown extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget {
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
class CheckBoxes extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget {
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
class CommitPRMessageDialog extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget {
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
class CommitMessageDialog extends _lumino_widgets__WEBPACK_IMPORTED_MODULE_0__.Widget {
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


/***/ })

}]);
//# sourceMappingURL=lib_index_js.07f9d641e1e4f3dc2838.js.map