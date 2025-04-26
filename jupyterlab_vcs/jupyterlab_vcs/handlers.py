import json
import os
import subprocess
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
from .utils import execute_git_command, get_repo_path, get_branches, get_owner_login_and_repo_name, onerror
from .github_v3 import create_pull_request, get_repository_details_for_pr, get_repository
import logging

logger = logging.getLogger(__name__)

# Global state to store GitHub tokens
_token_store = {}
_user_store = {}

class RouteHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps({
            "data": "This is /jupyterlab-vcs/get-example endpoint!"
        }))

class ConfigureHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        data = self.get_json_body()
        username = data.get('username')
        email = data.get('email')
        token = data.get('token')
        
        if not username or not email:
            self.set_status(400)
            self.finish(json.dumps({"error": "Username and email are required"}))
            return
        
        try:
            repo_path = get_repo_path(os.getcwd())
            execute_git_command(repo_path, 'config', 'user.name', username)
            execute_git_command(repo_path, 'config', 'user.email', email)
            if username:
                _user_store[repo_path] = username
            if token:
                _token_store[repo_path] = token
                logger.info(f"Stored GitHub token for repository at {repo_path}")
            self.finish(json.dumps({"success": True}))
        except Exception as e:
            logger.error(f"Failed to configure Git: {e}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))



class ResetHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        try:
            username = None
            email = None
            token = None
            repo_path = get_repo_path(os.getcwd())
            if repo_path in _token_store:
                del _token_store[repo_path]
                #logger.info(f"Removed GitHub token for repository at {repo_path}")
            if repo_path in _user_store:
                del _user_store[repo_path]
                #logger.info(f"Removed GitHub username for repository at {repo_path}")
                self.finish(json.dumps({"success": True}))
        except Exception as e:
            logger.error(f"Failed to reset Git: {e}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class CloneHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        data = self.get_json_body()
        repo_url = data.get('repoUrl')
        
        if not repo_url:
            self.set_status(400)
            self.finish(json.dumps({"error": "Repository URL is required"}))
            return
        
        try:
            repo_path = os.path.join(os.getcwd(), os.path.basename(repo_url).replace('.git', ''))
            execute_git_command(os.getcwd(), 'clone', repo_url, repo_path)
            self.finish(json.dumps({"success": True, "path": repo_path}))
        except Exception as e:
            logger.error(f"Failed to clone repository: {e}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class TagHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        data = self.get_json_body()
        tag = data.get('tag')
        
        if not tag:
            self.set_status(400)
            self.finish(json.dumps({"error": "Tag is required"}))
            return
        
        try:
            repo_path = get_repo_path(os.getcwd())
            if not os.path.exists(os.path.join(repo_path, '.git')):
                self.set_status(400)
                self.finish(json.dumps({"error": "No Git repository found. Please clone a Git project first."}))
                return
            execute_git_command(repo_path, 'tag', tag)
            execute_git_command(repo_path, 'push', 'origin', tag)
            self.finish(json.dumps({"success": True}))
        except Exception as e:
            logger.error(f"Failed to tag version: {e}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class PullRequestHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        data = self.get_json_body()
        commit_message = data.get('commit_message')
        pr_title = data.get('pr_title')
        branch = data.get('branch')
        
        if not commit_message or not pr_title or not branch:
            self.set_status(400)
            self.finish(json.dumps({"error": "Commit message, PR title, and branch are required"}))
            return
        
        try:
            repo_path = get_repo_path(os.getcwd())
            if not os.path.exists(os.path.join(repo_path, '.git')):
                self.set_status(400)
                self.finish(json.dumps({"error": "No Git repository found. Please clone a Git project first."}))
                return
            owner_login, repo_name = get_owner_login_and_repo_name(repo_path)
            token = _token_store.get(repo_path) or os.environ.get('GITHUB_TOKEN', '')
            base_branch = 'main'  # Default base branch; adjust as needed
            details = get_repository_details_for_pr(owner_login, repo_name, token, branch)
            result = create_pull_request(*details, pr_title, branch, base_branch, token, 'https://pranay.com/')
            self.finish(json.dumps(result))
        except Exception as e:
            logger.error(f"Failed to create pull request: {e}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class CommitHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        data = self.get_json_body()
        commit_message = data.get('commit_message')
        logger.warning(f"Commit message: {commit_message}")
        if not commit_message:
            self.set_status(400)
            self.finish(json.dumps({"error": "Commit message is required"}))
            return
        
        try:
            repo_path = get_repo_path(os.getcwd())
            logger.warning(f"Repo: {repo_path}")
            if not os.path.exists(os.path.join(repo_path, '.git')):
                self.set_status(400)
                self.finish(json.dumps({"error": "No Git repository found. Please clone a Git project first."}))
                return


            token = _token_store.get(repo_path)
            if not token:
                raise Exception("No GitHub token configured. Please configure a token using Configure Git.")
            username = _user_store.get(repo_path)
            if not username:
                raise Exception("No GitHub username configured. Please configure a username using Configure Git.")


            env = os.environ.copy()
            env['GIT_ASKPASS'] = 'echo'  
            env['GIT_USERNAME'] = username
            env['GIT_PASSWORD'] = token 
            try:
                execute_git_command(repo_path, 'add', '.', env=env)
            except subprocess.CalledProcessError as e:
                raise Exception(f"Add failed: {e.stderr}")
            
            logger.warning(f"Executing: git commit -m '{commit_message}' in {repo_path}")
            execute_git_command(repo_path, 'commit', '-m', commit_message, env=env)

            logger.warning(f"1 Executing: git commit -m '{commit_message}' in {repo_path}")
            result = {
                'github_url': " {message} version".format(message=commit_message),
                'pranay_url': "Push to Github using terminal"
            }

            logger.warning(f"2 Executing: git commit -m '{commit_message}' in {repo_path}")
            self.finish(json.dumps(result))
            logger.warning(f"3 Executing: git commit -m '{commit_message}' in {repo_path}")
        except Exception as e:
            logger.error(f"Failed to create commit: {e}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

class ModifiedRepoHandler(APIHandler):
    @tornado.web.authenticated
    def post(self):
        try:
            repo_path = get_repo_path(os.getcwd())
            if not os.path.exists(os.path.join(repo_path, '.git')):
                self.set_status(400)
                self.finish(json.dumps({"error": "No Git repository found. Please clone a Git project first."}))
                return
            modified_files = execute_git_command(repo_path, 'status', '--porcelain').strip().splitlines()
            repos = [{'name': os.path.basename(repo_path), 'path': repo_path} for _ in modified_files if modified_files]
            self.finish(json.dumps(repos))
        except Exception as e:
            logger.error(f"Failed to get modified repositories: {e}")
            self.set_status(500)
            self.finish(json.dumps({"error": str(e)}))

def setup_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    
    routes = [
        (url_path_join(base_url, "jupyterlab-vcs", "get-example"), RouteHandler),
        (url_path_join(base_url, "vcs", "configure"), ConfigureHandler),
        (url_path_join(base_url, "vcs", "clone"), CloneHandler),
        (url_path_join(base_url, "vcs", "tag"), TagHandler),
        (url_path_join(base_url, "vcs", "pull_request"), PullRequestHandler),
        (url_path_join(base_url, "vcs", "commit"), CommitHandler),
        (url_path_join(base_url, "vcs", "modified_repo"), ModifiedRepoHandler),
        (url_path_join(base_url, "vcs", "reset"), ResetHandler)

    ]
    web_app.add_handlers(host_pattern, routes)