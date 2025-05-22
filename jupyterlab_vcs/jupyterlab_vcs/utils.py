import logging
import os
import re
import stat
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

GITHUB_REMOTE_URL_REGEX = re.compile(r"github\.com[:\/](.*?)\/(.*?)\.git")


def get_owner_login_and_repo_name(repo):
    owner_login, repo_name = "", ""
    remote_url = (
        repo.remotes.origin.url if hasattr(repo, "remotes") and repo.remotes else ""
    )

    if not remote_url.endswith(".git"):
        remote_url += ".git"

    match = GITHUB_REMOTE_URL_REGEX.search(remote_url)
    if match:
        owner_login = match.group(1)
        repo_name = match.group(2)
        logger.info(f"For git repo {remote_url}, found {owner_login}/{repo_name}")
    else:
        logger.error(f"Unable to find owner/repo name for repo {remote_url}")
    return owner_login, repo_name


def onerror(func, path, exc_info):
    if exc_info[0].__name__ == "FileNotFoundError":
        pass
    elif not os.access(path, os.W_OK):
        os.chmod(path, stat.S_IWUSR)
        func(path)
    else:
        raise


def execute_git_command(cwd: str, *args, env=None, **kwargs):
    """Execute a Git command in the specified directory."""
    try:
        result = subprocess.run(
            ["git"] + list(args),
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True,
            env=env,
            **kwargs,
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        logger.error(f"Git command failed: {e.stderr}")
        raise Exception(f"Git command failed: {e.stderr}")


def get_repo_path(cwd: str) -> str:
    """Get the path to the Git repository root."""
    try:
        return execute_git_command(cwd, "rev-parse", "--show-toplevel").strip()
    except Exception:
        return cwd


def get_branches(cwd: str) -> list[str]:
    """Get a list of branches in the repository."""
    try:
        output = execute_git_command(cwd, "branch", "--list")
        return [
            branch.strip().replace("*", "").strip() for branch in output.splitlines()
        ]
    except Exception:
        return []
